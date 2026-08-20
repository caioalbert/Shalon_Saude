import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSingleCadastroMaisEdu } from "@/lib/maisedu-sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // No Next.js 15/16, params é assíncrono
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do cadastro não informado." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Busca o cadastro e faz o join com a tabela planos
    const { data: cadastro, error: fetchError } = await supabase
      .from("cadastros")
      .select("*, planos(*)")
      .eq("id", id)
      .single();

    if (fetchError || !cadastro) {
      return NextResponse.json(
        { error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    // 2. Se a relação planos não vier carregada, busca pelo plano_id ou tipo_plano
    if (!cadastro.planos) {
      if (cadastro.plano_id) {
        const { data: planoData } = await supabase
          .from("planos")
          .select("*")
          .eq("id", cadastro.plano_id)
          .single();
        if (planoData) cadastro.planos = planoData;
      } else if (cadastro.tipo_plano) {
        const { data: planoData } = await supabase
          .from("planos")
          .select("*")
          .ilike("codigo", cadastro.tipo_plano)
          .single();
        if (planoData) cadastro.planos = planoData;
      }
    }

    // 3. Executa o disparo para a API do parceiro
    const result = await syncSingleCadastroMaisEdu(cadastro);

    if (!result.success) {
      // Registra a falha no banco para histórico
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
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}