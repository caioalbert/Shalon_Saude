'use client'

import { useCallback, useState } from 'react'
import { CadastroForm } from '@/components/cadastro/CadastroForm'
import { CadastroSuccess } from '@/components/cadastro/CadastroSuccess'

type CadastroPageClientProps = {
  initialVendedorRef?: string
}

export default function CadastroPageClient({ initialVendedorRef = '' }: CadastroPageClientProps) {
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
            <h1 className="text-3xl font-bold text-white">Cadastro SHALON Saúde</h1>
            <p className="text-blue-100 mt-2">Preencha seus dados para adesão ao serviço</p>
          </div>

          <div className="px-6 py-8 sm:px-8">
            <CadastroForm
              onSuccess={handleSuccess}
              initialVendedorRef={initialVendedorRef.trim().toUpperCase()}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
