import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Image
              src="/logo-horizontal.svg"
              alt="SHALON Saúde"
              width={220}
              height={64}
              priority
              className="h-10 w-auto"
            />
          </div>
          <Link href="/admin/login">
            <Button variant="outline">Painel Admin</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
                Bem-vindo ao SHALON Saúde
              </h1>
              <p className="text-xl text-gray-600">
                Realize seu cadastro de forma segura e digital. Apenas alguns passos para adesão ao nosso serviço.
              </p>
            </div>

            <div className="space-y-3 text-gray-700">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
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
                <span>Cadastro 100% digital e seguro</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
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
                <span>Captura de selfie para verificação de identidade</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
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
                <span>Termo de adesão assinado digitalmente</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
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
                <span>Suporte para dependentes</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/cadastro" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-6 text-lg">
                  Começar Cadastro
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-10 blur-3xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                <div className="space-y-4">
                  <div className="h-3 bg-blue-200 rounded-full w-3/4"></div>
                  <div className="h-3 bg-blue-100 rounded-full w-full"></div>
                  <div className="h-3 bg-blue-100 rounded-full w-5/6"></div>
                </div>

                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Cadastro Seguro</p>
                      <p className="text-sm text-gray-600">Dados protegidos</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-green-600"
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
                    <div>
                      <p className="font-semibold text-gray-900">Verificado</p>
                      <p className="text-sm text-gray-600">Identidade confirmada</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Como Funciona</h2>
          <p className="text-gray-600 text-lg">Processo simples em 6 etapas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              number: '1',
              title: 'Dados Pessoais',
              description: 'Preencha seu nome, CPF, email e telefone',
            },
            {
              number: '2',
              title: 'Endereço',
              description: 'Informe seu endereço completo',
            },
            {
              number: '3',
              title: 'Dependentes',
              description: 'Adicione dependentes se houver',
            },
            {
              number: '4',
              title: 'Selfie',
              description: 'Tire uma foto para verificação',
            },
            {
              number: '5',
              title: 'Termo',
              description: 'Revise o termo de adesão',
            },
            {
              number: '6',
              title: 'Confirmação',
              description: 'Confirme e finalize o cadastro',
            },
          ].map((feature) => (
            <div
              key={feature.number}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                <span className="text-xl font-bold text-blue-600">{feature.number}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para se cadastrar?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Leva menos de 10 minutos para completar o processo
          </p>
          <Link href="/cadastro">
            <Button className="bg-white text-blue-600 hover:bg-gray-100 py-6 px-8 text-lg font-semibold">
              Iniciar Cadastro Agora
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/logo-horizontal.svg"
                  alt="SHALON Saúde"
                  width={200}
                  height={58}
                  className="h-9 w-auto"
                />
              </div>
              <p className="text-gray-600 text-sm">
                Sistema de cadastro digital seguro
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Sistema</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/cadastro" className="hover:text-blue-600">
                    Cadastro
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-blue-600">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Documentos</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Política de Privacidade</li>
                <li>Termos de Serviço</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>suporte@shalon.com.br</li>
                <li>+55 (11) 3000-0000</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-gray-600 text-sm">
              © 2024 SHALON Saúde. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
