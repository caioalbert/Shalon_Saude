'use client'

import { useCallback, useEffect, useState } from 'react'
import { CadastroForm } from '@/components/cadastro/CadastroForm'
import { CadastroSuccess } from '@/components/cadastro/CadastroSuccess'

type CadastroPageClientProps = {
  initialVendedorRef?: string
  initialPlanoCode?: string
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
    pagamento?: {
      id: string
      valor: number
      vencimento: string
      pixCopiaECola: string
      qrCodeBase64: string
    }
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-bold text-white">Cadastro SHALOM Saúde</h1>
            <p className="text-blue-100 mt-2">Preencha seus dados para adesão ao serviço</p>
            {vendedorRef && (
              <div className="mt-4 rounded-lg border border-white/30 bg-white/10 px-3 py-2">
                <p className="text-sm font-semibold text-white">
                  Consultor: {isLoadingConsultor ? 'Carregando...' : consultorNome || 'Não identificado'}
                </p>
                <p className="text-xs text-blue-100">Código de indicação: {vendedorRef}</p>
                {!isLoadingConsultor && !consultorNome && consultorStatusMessage && (
                  <p className="text-xs text-blue-100">{consultorStatusMessage}</p>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-8 sm:px-8">
            <CadastroForm
              onSuccess={handleSuccess}
              initialVendedorRef={vendedorRef}
              initialPlanoCode={initialPlanoCode}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
