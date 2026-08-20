import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSingleCadastroMaisEdu } from "@/lib/maisedu-sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do cadastro não informado." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Busca o cadastro de forma direta
    const { data: cadastro, error: fetchError } = await supabase
      .from("cadastros")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !cadastro) {
      console.error("[sync-maisedu] Erro ao buscar cadastro no banco:", fetchError);
      return NextResponse.json(
        {
          error: "Cadastro não encontrado.",
          details: fetchError?.message || "Registro não localizado no banco de dados.",
        },
        { status: 404 }
      );
    }

    // 2. Busca os dados do plano associado
    if (cadastro.plano_id) {
      const { data: planoData } = await supabase
        .from("planos")
        .select("*")
        .eq("id", cadastro.plano_id)
        .maybeSingle();

      if (planoData) {
        cadastro.planos = planoData;
      }
    }

    if (!cadastro.planos && (cadastro.tipo_plano || cadastro.plano)) {
      const termoPlano = String(cadastro.tipo_plano || cadastro.plano).trim();
      const { data: planoData } = await supabase
        .from("planos")
        .select("*")
        .or(`codigo.ilike.${termoPlano},nome.ilike.${termoPlano}`)
        .maybeSingle();

      if (planoData) {
        cadastro.planos = planoData;
      }
    }

    // 3. Executa a sincronização
    const result = await syncSingleCadastroMaisEdu(cadastro);

    // Estrutura completa de auditoria
    const syncAuditLog = {
      timestamp: result.timestamp || new Date().toISOString(),
      endpoint: result.endpoint,
      status_http: result.status,
      sucesso: result.success,
      payload_enviado: result.payloadSent,
      resposta_parceiro: result.data,
      erro: result.error || null,
    };

    if (!result.success) {
      await supabase
        .from("cadastros")
        .update({
          maisedu_sync_status: "error",
          maisedu_response: syncAuditLog,
        })
        .eq("id", id);

      return NextResponse.json(
        {
          error: result.error,
          sync_log: syncAuditLog,
        },
        { status: 400 }
      );
    }

    // 4. Grava o log de auditoria no Supabase
    await supabase
      .from("cadastros")
      .update({
        maisedu_sync_status: "synced",
        maisedu_synced_at: new Date().toISOString(),
        maisedu_response: syncAuditLog,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Cliente sincronizado com sucesso.",
      sync_log: syncAuditLog,
    });
  } catch (err: any) {
    console.error("[sync-maisedu] Erro inesperado:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}