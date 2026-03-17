import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { cadastroId } = await request.json()

    if (!cadastroId) {
      return NextResponse.json(
        { error: 'cadastroId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Buscar cadastro
    const { data: cadastro, error: cadastroError } = await supabase
      .from('cadastros')
      .select('*')
      .eq('id', cadastroId)
      .single()

    if (cadastroError) {
      const details = `${cadastroError.message || ''} ${cadastroError.details || ''}`
      if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      if (cadastroError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cadastro não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: cadastroError.message || 'Erro ao consultar cadastro' },
        { status: 500 }
      )
    }

    if (!cadastro) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se Resend está configurado
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY não configurado. Email não será enviado.')
      await supabase
        .from('cadastros')
        .update({ email_enviado_em: new Date().toISOString() })
        .eq('id', cadastroId)

      return NextResponse.json({
        success: true,
        message: 'Cadastro processado. Configure RESEND_API_KEY para enviar emails.',
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error: emailError } = await resend.emails.send({
      from: 'SHALON Saúde <noreply@shalonsamaritano.com.br>',
      to: cadastro.email,
      subject: 'Seu Termo de Adesão - SHALON Saúde',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #1d4ed8, #4f46e5); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">SHALON Saúde</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0 0;">Confirmação de Adesão</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e40af; margin-top: 0;">Olá, ${cadastro.nome}!</h2>
            <p>Seu cadastro foi realizado com sucesso e seu Termo de Adesão ao serviço SHALON Saúde foi assinado digitalmente.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Dados do Cadastro</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 40%;">Nome:</td><td style="padding: 6px 0; font-weight: 500; font-size: 13px;">${cadastro.nome}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">CPF:</td><td style="padding: 6px 0; font-weight: 500; font-size: 13px;">${cadastro.cpf}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Email:</td><td style="padding: 6px 0; font-weight: 500; font-size: 13px;">${cadastro.email}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Assinado em:</td><td style="padding: 6px 0; font-weight: 500; font-size: 13px;">${new Date(cadastro.termo_assinado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
              </table>
            </div>
            <p style="font-size: 13px; color: #6b7280;">Para acessar seu termo assinado ou fazer download do PDF, entre em contato com nossa equipe.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">Este é um email automático do sistema SHALON Saúde. Não responda a este email.</p>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { error: 'Erro ao enviar email' },
        { status: 500 }
      )
    }

    // Atualizar status no banco
    await supabase
      .from('cadastros')
      .update({ email_enviado_em: new Date().toISOString() })
      .eq('id', cadastroId)

    return NextResponse.json({
      success: true,
      message: 'Email enviado com sucesso',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/fetch failed|enotfound|getaddrinfo|network/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
        },
        { status: 503 }
      )
    }

    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    )
  }
}
