'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Copy, ExternalLink } from 'lucide-react'

type CadastroPagamento = {
  id: string
  valor: number
  vencimento: string
  billingType?: string
  invoiceUrl?: string | null
  bankSlipUrl?: string | null
  pixCopiaECola?: string | null
  qrCodeBase64?: string | null
}

const SAUDE_24H_APP_STORE_URL = 'https://apps.apple.com/app/id1101572255'
const SAUDE_24H_GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=br.com.shalon.saude'
const SUPPORT_URL = 'mailto:suporte@shalom.com.br'

function formatOrderNumber(value: string) {
  const normalized = value.replace(/[^a-z0-9]/gi, '').toUpperCase()
  const suffix = normalized.slice(-6).padStart(6, '0')

  return `#P-${suffix}`
}

function SuccessWireframe() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="success-mesh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8eee5" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#8fd4b3" stopOpacity="0.52" />
          <stop offset="1" stopColor="#d8eee5" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#success-mesh)" strokeWidth="1">
        <path d="M-120 180 170 30l265 156 300-164 264 157 310-168 251 145" />
        <path d="M-90 340 210 176l255 151 286-159 286 164 279-154 214 125" />
        <path d="M-120 505 180 336l284 164 292-168 275 163 295-165 238 136" />
        <path d="M-80 674 200 510l266 156 292-171 274 166 289-162 203 120" />
        <path d="M-112 838 195 671l270 157 296-167 273 156 295-159 213 118" />
        <path d="M170 30 210 176l-30 160 20 174-5 161v167" />
        <path d="M435 186 465 327l-1 173 2 166-1 162" />
        <path d="M735 22 751 168l5 164 2 163 3 166v176" />
        <path d="M999 179 1037 332l-6 163 1 166 2 156" />
        <path d="M1309 11 1316 178l10 152-5 169 8 159v154" />
      </g>
      <g fill="#8fd4b3" opacity="0.2">
        <circle cx="210" cy="176" r="3" />
        <circle cx="465" cy="327" r="3" />
        <circle cx="756" cy="332" r="3" />
        <circle cx="1031" cy="495" r="3" />
        <circle cx="1321" cy="499" r="3" />
      </g>
    </svg>
  )
}

function SuccessCelebration() {
  return (
    <div className="relative h-44 w-64" aria-hidden="true">
      <span className="success-confetti-piece absolute left-5 top-10 h-2.5 w-2.5 rotate-12 rounded-[3px] bg-emerald-500 shadow-sm" />
      <span className="success-confetti-piece absolute left-11 top-28 h-3 w-1.5 -rotate-[28deg] rounded-full bg-white shadow-[0_1px_5px_rgba(16,185,129,0.35)]" />
      <span className="success-confetti-piece absolute left-20 top-3 h-2 w-4 rotate-[24deg] rounded-full border border-emerald-400 bg-white" />
      <span className="success-confetti-piece absolute left-3 top-24 size-2 rotate-45 border border-emerald-400 bg-emerald-50" />
      <span className="success-confetti-piece absolute right-6 top-9 h-3 w-2 rotate-[32deg] rounded-sm bg-emerald-600 shadow-sm" />
      <span className="success-confetti-piece absolute right-14 top-2 size-2.5 rounded-full border-2 border-emerald-400 bg-white" />
      <span className="success-confetti-piece absolute right-10 top-28 h-2 w-4 -rotate-[18deg] rounded-full bg-emerald-300" />
      <span className="success-confetti-piece absolute right-1 top-20 h-3 w-1.5 rotate-12 rounded-full bg-white shadow-[0_1px_5px_rgba(16,185,129,0.35)]" />

      <div className="success-mark-float absolute left-1/2 top-1/2 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center">
        <div className="absolute bottom-0 h-6 w-28 rounded-full bg-emerald-900/15 blur-xl" />
        <div className="relative grid size-28 place-items-center rounded-full bg-[linear-gradient(145deg,#9af1c2_0%,#1db977_38%,#05734f_100%)] p-[9px] shadow-[0_22px_38px_-18px_rgba(5,115,79,0.72),inset_0_2px_3px_rgba(255,255,255,0.88),inset_0_-5px_10px_rgba(3,82,57,0.38)] ring-1 ring-white/80">
          <div className="absolute inset-[10px] rounded-full border border-white/45 shadow-[inset_0_4px_8px_rgba(255,255,255,0.68),inset_0_-4px_10px_rgba(2,92,61,0.28)]" />
          <div className="grid size-[74px] place-items-center rounded-full bg-[radial-gradient(circle_at_38%_28%,#ffffff_0%,#effcf5_54%,#bcebd2_100%)] shadow-[0_9px_18px_rgba(4,83,58,0.3),inset_0_1px_2px_rgba(255,255,255,0.95)]">
            <svg className="size-11" viewBox="0 0 48 48" fill="none">
              <path
                d="m13 24.5 7.4 7.4L35.5 16"
                stroke="#07945f"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_3px_2px_rgba(2,96,64,0.28)]"
              />
              <path
                d="m13.5 23.8 7 7L35 15.5"
                stroke="#57d99c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            </svg>
          </div>
          <span className="absolute left-6 top-4 h-2.5 w-10 -rotate-[24deg] rounded-full bg-white/50 blur-[1px]" />
        </div>
      </div>
    </div>
  )
}

function AppleLogo() {
  return (
    <svg aria-hidden="true" className="size-8 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.78 12.76c.02-2.05 1.68-3.03 1.75-3.07a3.76 3.76 0 0 0-2.96-1.6c-1.25-.13-2.46.75-3.1.75-.66 0-1.64-.73-2.7-.71a3.92 3.92 0 0 0-3.3 2.01c-1.43 2.47-.36 6.1 1 8.1.68.97 1.47 2.06 2.53 2.02 1.03-.04 1.42-.65 2.66-.65 1.23 0 1.6.65 2.68.62 1.11-.02 1.81-.97 2.46-1.95a8.1 8.1 0 0 0 1.13-2.3 3.53 3.53 0 0 1-2.15-3.22ZM14.76 6.77a3.58 3.58 0 0 0 .82-2.57 3.63 3.63 0 0 0-2.36 1.22 3.4 3.4 0 0 0-.85 2.48 3 3 0 0 0 2.39-1.13Z" />
    </svg>
  )
}

function GooglePlayLogo() {
  return (
    <svg aria-hidden="true" className="size-8 shrink-0" viewBox="0 0 32 36">
      <path fill="#00d6ff" d="M2.2 2.4A3 3 0 0 0 1 4.8v26.4c0 1 .44 1.9 1.18 2.46l15.2-15.64L2.2 2.4Z" />
      <path fill="#ffdc48" d="m22.2 13.08-4.82 4.94 5.14 5.28 6.18-3.52c1.74-1 1.74-2.58 0-3.57l-6.5-3.13Z" />
      <path fill="#ff3a55" d="M2.18 33.66c.52.4 1.2.49 1.9.1l18.44-10.46-5.14-5.28-15.2 15.64Z" />
      <path fill="#20d879" d="M2.2 2.4 17.38 18.02l4.82-4.94L4.1 2.22a1.8 1.8 0 0 0-1.9.18Z" />
    </svg>
  )
}

interface CadastroSuccessProps {
  data: {
    nome: string
    email: string
    id: string
    status?: string
    pagamento?: CadastroPagamento
  }
}

export function CadastroSuccess({ data }: CadastroSuccessProps) {
  const [status, setStatus] = useState(data.status || 'ATIVO')
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isAutoChecking, setIsAutoChecking] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const isPendingPayment = status === 'PENDENTE_PAGAMENTO' && Boolean(data.pagamento)
  const isCreditCardPayment = data.pagamento?.billingType === 'CREDIT_CARD'
  const isBolePixPayment = !isCreditCardPayment
  const paymentMethodLabel = isCreditCardPayment ? 'Cartão de crédito' : 'Pix ou boleto'
  const invoiceUrl = data.pagamento?.invoiceUrl || null
  const bankSlipUrl = data.pagamento?.bankSlipUrl || null
  const pixCopiaECola = String(data.pagamento?.pixCopiaECola || '').trim()
  const qrCodeBase64 = String(data.pagamento?.qrCodeBase64 || '').trim()
  const hasPixData = Boolean(pixCopiaECola && qrCodeBase64)
  const primaryExternalPaymentUrl = invoiceUrl || bankSlipUrl
  const secondaryBankSlipUrl = bankSlipUrl && bankSlipUrl !== invoiceUrl ? bankSlipUrl : null

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const orderNumber = formatOrderNumber(data.pagamento?.id || data.id)
  const paidAmount = data.pagamento ? formatCurrency(data.pagamento.valor) : '—'

  const formatDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString('pt-BR')
  }

  const handleCopyPixCode = async () => {
    if (!pixCopiaECola) return

    try {
      await navigator.clipboard.writeText(pixCopiaECola)
      setCopyMessage('Código PIX copiado.')
    } catch {
      setCopyMessage('Não foi possível copiar automaticamente. Copie manualmente o código acima.')
    }
  }

  const checkStatus = useCallback(async (options?: { manual?: boolean }) => {
    const isManual = options?.manual === true
    try {
      if (isManual) {
        setIsCheckingStatus(true)
      } else {
        setIsAutoChecking(true)
      }

      const response = await fetch(`/api/cadastro/status?id=${encodeURIComponent(data.id)}`, {
        cache: 'no-store',
      })

      const payload = (await response.json().catch(() => null)) as {
        status?: string
        error?: string
        processingPayment?: boolean
        asaasPaymentStatus?: string | null
      } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível verificar o status do pagamento.')
      }

      const nextStatus = payload?.status || 'PENDENTE_PAGAMENTO'
      const processingPayment = Boolean(payload?.processingPayment)
      setStatus(nextStatus)
      setIsProcessingPayment(processingPayment)
      setLastCheckAt(new Date().toLocaleTimeString('pt-BR'))

      if (nextStatus === 'ATIVO') {
        setStatusMessage('Pagamento confirmado. Seu cadastro foi ativado.')
        return
      }

      if (processingPayment) {
        setStatusMessage('Pagamento identificado. Estamos processando a ativação do seu plano.')
        return
      }

      if (isManual) {
        setStatusMessage('Pagamento ainda não foi confirmado. Seguiremos verificando automaticamente.')
      } else {
        setStatusMessage('Aguardando confirmação automática do pagamento.')
      }
    } catch (error) {
      if (isManual) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : 'Erro ao verificar status do pagamento.'
        )
      }
    } finally {
      if (isManual) {
        setIsCheckingStatus(false)
      } else {
        setIsAutoChecking(false)
      }
    }
  }, [data.id])

  const handleCheckStatus = async () => {
    await checkStatus({ manual: true })
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isPendingPayment) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        if (!mountedRef.current) return
        await checkStatus({ manual: false })
        if (mountedRef.current && status === 'PENDENTE_PAGAMENTO') {
          scheduleNext()
        }
      }, 5000)
    }

    setStatusMessage('Aguardando confirmação automática do pagamento.')
    checkStatus({ manual: false }).finally(() => {
      if (mountedRef.current && status === 'PENDENTE_PAGAMENTO') {
        scheduleNext()
      }
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [checkStatus, isPendingPayment, status])

  if (isPendingPayment && data.pagamento) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-10 sm:px-8 text-center">
              <h1 className="text-3xl font-bold text-white">Pagamento da Adesão</h1>
              <p className="text-amber-100 mt-2">Seu cadastro foi recebido e está pendente de pagamento</p>
            </div>

            <div className="px-6 py-8 sm:px-8 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>{data.nome}</strong>
                </p>
                <p className="text-sm text-amber-900">{data.email}</p>
                <p className="text-xs font-mono text-amber-800">Cadastro: {data.id}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Valor da adesão</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.pagamento.valor)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Vencimento</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(data.pagamento.vencimento)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Forma de pagamento selecionada</p>
                <p className="text-base font-semibold text-gray-900">{paymentMethodLabel}</p>
                <p className="text-sm text-gray-700">
                  {isCreditCardPayment
                    ? 'Pague a adesão com cartão na fatura. A assinatura mensal seguirá o mesmo método.'
                    : hasPixData
                      ? 'Escaneie o QR Code ou copie o código Pix. A assinatura mensal seguirá o mesmo método.'
                      : 'Abra a fatura para pagar por boleto ou Pix. A assinatura mensal seguirá o mesmo método.'}
                </p>

                {isBolePixPayment && hasPixData ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Image
                        src={`data:image/png;base64,${qrCodeBase64}`}
                        alt="QR Code Pix da adesão"
                        className="h-60 w-60 rounded-lg border border-gray-200 bg-white p-2"
                        width={240}
                        height={240}
                        unoptimized
                      />
                    </div>
                    <textarea
                      readOnly
                      value={pixCopiaECola}
                      aria-label="Código Pix copia e cola"
                      className="h-24 w-full resize-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800"
                    />
                    <Button onClick={handleCopyPixCode} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                      Copiar código Pix
                    </Button>
                    {copyMessage && (
                      <p className="text-xs text-gray-600">{copyMessage}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {invoiceUrl && (
                      <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                        <a href={invoiceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                          {isCreditCardPayment ? 'Adicionar dados do cartão' : 'Abrir fatura para pagar'}
                        </a>
                      </Button>
                    )}

                    {secondaryBankSlipUrl && (
                      <Button asChild variant="outline" className="w-full">
                        <a href={secondaryBankSlipUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                          Abrir boleto
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {!primaryExternalPaymentUrl && !hasPixData && (
                  <p className="text-xs text-amber-700">
                    A fatura ainda está sendo processada. Clique em verificar para atualizar o status.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus || isAutoChecking}
                  className="w-full bg-gray-800 hover:bg-gray-900"
                >
                  {isCheckingStatus || isAutoChecking ? 'Verificando pagamento...' : 'Verificar Agora'}
                </Button>
                {statusMessage && (
                  <p className="text-sm text-gray-700">{statusMessage}</p>
                )}
                {lastCheckAt && (
                  <p className="text-xs text-gray-500">Última verificação: {lastCheckAt}</p>
                )}
              </div>

              {isProcessingPayment ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-900">
                    Pagamento identificado. Estamos processando a ativação do seu plano agora.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    O plano será ativado automaticamente após a confirmação do pagamento no Asaas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-[#fbfdfc] px-4 py-5 text-slate-950 sm:px-6 sm:py-7">
      <SuccessWireframe />
      <div className="absolute left-1/2 top-[42%] -z-10 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/35 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-2xl flex-col items-center sm:min-h-[calc(100svh-3.5rem)]">
        <section className="my-auto flex w-full flex-col items-center py-8 text-center sm:py-10">
          <SuccessCelebration />

          <div className="-mt-1 max-w-lg">
            <h1 className="text-balance text-[2rem] font-bold tracking-[-0.04em] text-slate-950 sm:text-[2.65rem]">
              Pagamento Realizado!
            </h1>
            <p className="mt-3 text-pretty text-base font-normal text-slate-600 sm:text-lg">
              Baixe o app para começar a utilizar
            </p>
            <p className="mx-auto mt-5 max-w-md text-pretty text-xs font-medium leading-5 text-slate-400 sm:text-sm">
              Número do Pedido: <span className="font-mono text-slate-500">{orderNumber}</span>
              <span className="px-2 text-slate-300" aria-hidden="true">|</span>
              Valor: <span className="text-slate-500">{paidAmount}</span>
            </p>
          </div>

          <div className="mt-9 grid w-full max-w-[390px] grid-cols-2 gap-3 sm:mt-10 sm:gap-4">
            <a
              href={SAUDE_24H_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Baixar Saúde 24h na App Store"
              className="group flex min-h-16 min-w-0 items-center justify-center gap-2 rounded-2xl border border-black/80 bg-[linear-gradient(145deg,#292929_0%,#050505_68%)] px-3 py-2.5 text-left text-white shadow-[0_14px_28px_-14px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 sm:gap-3 sm:px-4"
            >
              <AppleLogo />
              <span className="min-w-0 leading-none">
                <span className="block text-[9px] font-medium uppercase tracking-[0.04em] text-white/70 sm:text-[10px]">
                  Disponível na
                </span>
                <span className="mt-1 block truncate text-sm font-semibold tracking-[-0.02em] sm:text-base">
                  App Store
                </span>
              </span>
            </a>

            <a
              href={SAUDE_24H_GOOGLE_PLAY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Baixar SHALOM Saúde no Google Play"
              className="group flex min-h-16 min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-[linear-gradient(145deg,#ffffff_0%,#f6f7f8_100%)] px-3 py-2.5 text-left text-slate-950 shadow-[0_14px_28px_-14px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.95)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 sm:gap-3 sm:px-4"
            >
              <GooglePlayLogo />
              <span className="min-w-0 leading-none">
                <span className="block text-[9px] font-medium uppercase tracking-[0.04em] text-slate-500 sm:text-[10px]">
                  Disponível no
                </span>
                <span className="mt-1 block truncate text-sm font-semibold tracking-[-0.02em] sm:text-base">
                  Google Play
                </span>
              </span>
            </a>
          </div>
        </section>

        <p className="pb-2 text-center text-xs leading-5 text-slate-400 sm:text-sm">
          Precisa de ajuda?{' '}
          <a
            href={SUPPORT_URL}
            className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-emerald-700 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            Visite nossa Central de Suporte.
          </a>
        </p>
      </div>
    </main>
  )
}
