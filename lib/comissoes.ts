type CadastroComissaoBase = {
  status?: string | null
  adesao_pago_em?: string | null
  mensalidade_valor?: number | string | null
}

type PagamentoComissaoBase = {
  id: string
  mes_referencia: string
  valor_total?: number | string | null
  pago_em?: string | null
  comprovante_url?: string | null
  comprovante_path?: string | null
  observacao?: string | null
}

export type ComissaoMensalResumo = {
  mesReferencia: string
  mesLabel: string
  quantidadeVendas: number
  valorTotal: number
  valorPagoRegistrado: number
  valorPendente: number
  pago: boolean
  pagamentoId: string | null
  pagoEm: string | null
  comprovanteUrl: string | null
  comprovantePath: string | null
  observacao: string | null
}

export type ComissaoResumo = {
  totalVendasPagas: number
  comissaoMesAtualBruta: number
  comissaoMesAtualPaga: number
  comissaoMesAtualPendente: number
  comissaoTotalBruta: number
  comissaoTotalPaga: number
  comissaoTotalDevida: number
  comissoesMensais: ComissaoMensalResumo[]
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function normalizeCurrencyValue(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export function toMonthReferenceUTC(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-01`
}

export function parseMonthReference(value: string) {
  const normalized = String(value || '').trim()
  if (!normalized) return null

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized.slice(0, 7)}-01`
  }

  return null
}

export function getMonthRangeUTC(monthReference: string) {
  const parsed = parseMonthReference(monthReference)
  if (!parsed) return null

  const [yearStr, monthStr] = parsed.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  const monthStartDate = new Date(Date.UTC(year, month - 1, 1))
  if (Number.isNaN(monthStartDate.getTime())) return null

  const monthEndDate = new Date(Date.UTC(year, month, 1))
  return {
    monthReference: parsed,
    monthStartDate,
    monthEndDate,
    startIso: monthStartDate.toISOString(),
    endIso: monthEndDate.toISOString(),
  }
}

export function formatMonthReferenceLabel(monthReference: string) {
  const range = getMonthRangeUTC(monthReference)
  if (!range) return monthReference

  return new Intl.DateTimeFormat('pt-BR', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(range.monthStartDate)
}

export function buildComissaoResumo(
  cadastros: CadastroComissaoBase[],
  pagamentos: PagamentoComissaoBase[],
  referenceDate: Date = new Date()
): ComissaoResumo {
  const vendasByMonth = new Map<string, { quantidade: number; valor: number }>()
  let totalVendasPagas = 0

  cadastros.forEach((cadastro) => {
    const status = String(cadastro.status || '').trim().toUpperCase()
    if (status !== 'ATIVO' || !cadastro.adesao_pago_em) return

    const paidDate = new Date(String(cadastro.adesao_pago_em))
    if (Number.isNaN(paidDate.getTime())) return

    const monthReference = toMonthReferenceUTC(paidDate)
    const current = vendasByMonth.get(monthReference) || { quantidade: 0, valor: 0 }

    current.quantidade += 1
    current.valor += normalizeCurrencyValue(cadastro.mensalidade_valor)
    vendasByMonth.set(monthReference, current)
    totalVendasPagas += 1
  })

  const pagamentosByMonth = new Map<string, PagamentoComissaoBase>()
  pagamentos.forEach((pagamento) => {
    const monthReference = parseMonthReference(String(pagamento.mes_referencia || ''))
    if (!monthReference) return
    pagamentosByMonth.set(monthReference, pagamento)
  })

  const allMonthReferences = new Set<string>([
    ...Array.from(vendasByMonth.keys()),
    ...Array.from(pagamentosByMonth.keys()),
  ])

  const currentMonthReference = toMonthReferenceUTC(referenceDate)

  let comissaoMesAtualBruta = 0
  let comissaoMesAtualPaga = 0
  let comissaoMesAtualPendente = 0
  let comissaoTotalBruta = 0
  let comissaoTotalPaga = 0
  let comissaoTotalDevida = 0

  const comissoesMensais: ComissaoMensalResumo[] = Array.from(allMonthReferences)
    .sort((a, b) => b.localeCompare(a))
    .map((monthReference) => {
      const venda = vendasByMonth.get(monthReference) || { quantidade: 0, valor: 0 }
      const pagamento = pagamentosByMonth.get(monthReference) || null
      const valorTotal = roundCurrency(venda.valor)
      const valorPagoRegistrado = pagamento
        ? roundCurrency(
            normalizeCurrencyValue(pagamento.valor_total) || normalizeCurrencyValue(valorTotal)
          )
        : 0
      const pago = Boolean(pagamento)
      const valorPendente = pago ? 0 : valorTotal

      comissaoTotalBruta += valorTotal
      if (pago) {
        comissaoTotalPaga += valorPagoRegistrado
      } else {
        comissaoTotalDevida += valorPendente
      }

      if (monthReference === currentMonthReference) {
        comissaoMesAtualBruta += valorTotal
        comissaoMesAtualPaga += pago ? valorPagoRegistrado : 0
        comissaoMesAtualPendente += valorPendente
      }

      return {
        mesReferencia: monthReference,
        mesLabel: formatMonthReferenceLabel(monthReference),
        quantidadeVendas: venda.quantidade,
        valorTotal,
        valorPagoRegistrado,
        valorPendente,
        pago,
        pagamentoId: pagamento?.id || null,
        pagoEm: pagamento?.pago_em || null,
        comprovanteUrl: pagamento?.comprovante_url || null,
        comprovantePath: pagamento?.comprovante_path || null,
        observacao: pagamento?.observacao || null,
      }
    })

  return {
    totalVendasPagas,
    comissaoMesAtualBruta: roundCurrency(comissaoMesAtualBruta),
    comissaoMesAtualPaga: roundCurrency(comissaoMesAtualPaga),
    comissaoMesAtualPendente: roundCurrency(comissaoMesAtualPendente),
    comissaoTotalBruta: roundCurrency(comissaoTotalBruta),
    comissaoTotalPaga: roundCurrency(comissaoTotalPaga),
    comissaoTotalDevida: roundCurrency(comissaoTotalDevida),
    comissoesMensais,
  }
}
