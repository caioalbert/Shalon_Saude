'use client'

import { useCallback, useEffect, useState } from 'react'
import { CadastroForm } from '@/components/cadastro/CadastroForm'
import { CadastroSuccess } from '@/components/cadastro/CadastroSuccess'

type CadastroPageClientProps = {
  initialVendedorRef?: string
  initialPlanoCode?: string
}

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

export default function CadastroPageClient({ 
  initialVendedorRef = '',
  initialPlanoCode = '',
}: CadastroPageClientProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [cadastroData, setCadastroData] = useState<{
    nome: string
    email: string
    id: string
    status?: string
    pagamento?: CadastroPagamento
  } | null>(null)
  const vendedorRef = initialVendedorRef.trim().toUpperCase()
  const [consultorNome, setConsultorNome] = useState<string | null>(null)
  const [consultorStatusMessage, setConsultorStatusMessage] = useState<string | null>(null)
  const [isLoadingConsultor, setIsLoadingConsultor] = useState(Boolean(vendedorRef))

  useEffect(() => {
    let active = true

    if (!vendedorRef) {
      setConsultorNome(null)
      setConsultorStatusMessage(null)
      setIsLoadingConsultor(false)
      return () => {
        active = false
      }
    }

    const fetchConsultor = async () => {
      try {
        setIsLoadingConsultor(true)
        setConsultorNome(null)
        setConsultorStatusMessage(null)

        const response = await fetch(`/api/cadastro/vendedor?ref=${encodeURIComponent(vendedorRef)}`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)

        if (!active) return

        if (!response.ok) {
          setConsultorStatusMessage(payload?.error || 'Consultor não encontrado para este link.')
          return
        }

        const nome = String(payload?.vendedor?.nome || '').trim()
        if (nome) {
          setConsultorNome(nome)
          return
        }

        setConsultorStatusMessage('Consultor não encontrado para este link.')
      } catch {
        if (!active) return
        setConsultorStatusMessage('Não foi possível validar o consultor agora.')
      } finally {
        if (active) {
          setIsLoadingConsultor(false)
        }
      }
    }

    fetchConsultor()

    return () => {
      active = false
    }
  }, [vendedorRef])

  const handleSuccess = useCallback((data: any) => {
    setCadastroData({
      nome: data.nome,
      email: data.email,
      id: data.id,
      status: data.status,
      pagamento: data.pagamento,
    })
    setIsSubmitted(true)
  }, [])

  if (isSubmitted && cadastroData) {
    return <CadastroSuccess data={cadastroData} />
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-5 py-10">
      <div className="mx-auto w-full">
        <section className="mb-8 w-full rounded-2xl border border-white/60 bg-white/70 px-6 py-8 shadow-sm backdrop-blur sm:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Cadastro SHALOM Saúde</h1>
          <p className="mt-2 text-gray-600">Preencha seus dados para adesão ao serviço</p>
          {vendedorRef && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-sm font-semibold text-blue-900">
                Consultor: {isLoadingConsultor ? 'Carregando...' : consultorNome || 'Não identificado'}
              </p>
              <p className="text-xs text-blue-700">Código de indicação: {vendedorRef}</p>
              {!isLoadingConsultor && !consultorNome && consultorStatusMessage && (
                <p className="text-xs text-blue-700">{consultorStatusMessage}</p>
              )}
            </div>
          )}
        </section>

        <section className="w-full rounded-2xl border border-white/60 bg-white/80 px-6 py-8 shadow-sm backdrop-blur sm:px-8">
          <CadastroForm
            onSuccess={handleSuccess}
            initialVendedorRef={vendedorRef}
            initialPlanoCode={initialPlanoCode}
          />
        </section>
      </div>
    </main>
  )
}
