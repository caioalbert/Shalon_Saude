'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CadastroSuccessProps {
  data: {
    nome: string
    email: string
    id: string
  }
}

export function CadastroSuccess({ data }: CadastroSuccessProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-12 sm:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Cadastro Realizado!</h1>
            <p className="text-green-100 mt-2">Sua adesão foi processada com sucesso</p>
          </div>

          <div className="px-6 py-8 sm:px-8 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-green-700 font-semibold">Nome</p>
                <p className="text-lg font-medium text-gray-800">{data.nome}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold">Email</p>
                <p className="text-lg font-medium text-gray-800">{data.email}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold">ID do Cadastro</p>
                <p className="text-sm font-mono text-gray-800">{data.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Seu termo de adesão foi gerado e salvo com segurança</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Você receberá um email em breve com seu termo assinado</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Sua selfie foi armazenada com segurança</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Próximos passos:</strong> Você pode acessar o painel administrativo para
                visualizar seu cadastro e fazer download do termo de adesão a qualquer momento.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/admin/login" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Ir para Painel Admin
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  Voltar para Início
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
