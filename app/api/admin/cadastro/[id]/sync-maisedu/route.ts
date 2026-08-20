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

    // 1. Busca o cadastro de forma direta e segura (sem join automático que pode falhar)
    const { data: cadastro, error: fetchError } = await supabase
      .from("cadastros")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !cadastro) {
      console.error("[sync-maisedu] Erro ao buscar cadastro:", fetchError);
      return NextResponse.json(
        { 
          error: "Cadastro não encontrado.",
          details: fetchError?.message || "Registro não localizado no banco de dados."
        },
        { status: 404 }
      );
    }

    // 2. Busca os dados do plano de forma resiliente
    // Tentativa A: por plano_id (UUID)
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

    // Tentativa B: por código ou nome (para cadastros legados)
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

    // 3. Executa o disparo para a API do parceiro
    const result = await syncSingleCadastroMaisEdu(cadastro);

    if (!result.success) {
      console.error("[sync-maisedu] Erro retornado pelo parceiro:", result.error);
      
      // Registra a falha no banco para auditoria
      await supabase
        .from("cadastros")
        .update({
          maisedu_sync_status: "error",
          maisedu_response: {
            error: result.error,
            status: result.status,
            attempted_at: new Date().toISOString(),
          },
        })
        .eq("id", id);

      return NextResponse.json(
        { error: result.error, details: result.data },
        { status: 400 }
      );
    }

    // 4. Registra o sucesso no Supabase
    await supabase
      .from("cadastros")
      .update({
        maisedu_sync_status: "synced",
        maisedu_synced_at: new Date().toISOString(),
        maisedu_response: result.data,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Cliente sincronizado com sucesso.",
      data: result.data,
    });
  } catch (err: any) {
    console.error("[sync-maisedu] Erro inesperado:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}