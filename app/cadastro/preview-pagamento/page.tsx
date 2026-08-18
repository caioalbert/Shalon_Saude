import { notFound } from 'next/navigation'
import { CadastroSuccess } from '@/components/cadastro/CadastroSuccess'

type SearchParamsValue = string | string[] | undefined
type SearchParamsRecord = Record<string, SearchParamsValue>

type PreviewPagamentoPageProps = {
  searchParams?: SearchParamsRecord | Promise<SearchParamsRecord>
}

export const dynamic = 'force-dynamic'

function toSingleValue(value: SearchParamsValue) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

function canShowPreview() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_CADASTRO_PAYMENT_PREVIEW === 'true'
}

export default async function PreviewPagamentoPage({ searchParams }: PreviewPagamentoPageProps) {
  if (!canShowPreview()) {
    notFound()
  }

  const resolvedSearchParams = await Promise.resolve(searchParams || {})
  const estado = toSingleValue(resolvedSearchParams.estado).trim().toLowerCase()
  const isPending = estado === 'pendente'

  return (
    <CadastroSuccess
      data={{
        nome: 'caio alberto ferreira',
        email: 'caioalberto2104@gmail.com',
        id: '535f7054-201d-4ebd-afdf-dbea8f4b779a',
        status: isPending ? 'PENDENTE_PAGAMENTO' : 'ATIVO',
        pagamento: {
          id: isPending ? 'pay_preview_bolepix' : 'pay_preview_success_789012',
          valor: isPending ? 5 : 149.9,
          vencimento: '2026-08-12',
          billingType: 'BOLETO',
          invoiceUrl: null,
          bankSlipUrl: null,
          pixCopiaECola: null,
          qrCodeBase64: null,
        },
      }}
    />
  )
}
