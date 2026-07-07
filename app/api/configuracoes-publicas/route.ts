import { getBillingSettings } from '@/lib/billing-settings'
import { NextResponse } from 'next/server'

/**
 * GET /api/configuracoes-publicas
 * Retorna configurações operacionais que o frontend do cliente pode usar.
 * Não requer autenticação — dados são não-sensíveis (telefone, tagline, whatsapp).
 */
export async function GET() {
  try {
    const settings = await getBillingSettings()
    return NextResponse.json({
      telefoneEmergencia: settings.telefoneEmergencia,
      whatsappUrl: settings.whatsappUrl,
      appTagline: settings.appTagline,
    })
  } catch {
    // Fallback para defaults caso o banco ainda não tenha a migration
    return NextResponse.json({
      telefoneEmergencia: '(85) 3000-0000',
      whatsappUrl: 'https://wa.me/5585991452514',
      appTagline: 'Sua saúde completa e segura',
    })
  }
}
