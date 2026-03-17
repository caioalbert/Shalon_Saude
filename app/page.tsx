import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import {
  Activity,
  BadgeCheck,
  Camera,
  FileCheck2,
  Lock,
  MonitorCheck,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'

const BENEFITS = [
  {
    title: 'Cadastro 100% digital',
    description: 'Processo rápido, seguro e sem papel.',
    icon: ShieldCheck,
    iconClass: 'bg-teal-100 text-teal-700',
  },
  {
    title: 'Identidade validada',
    description: 'Selfie com verificação de autenticidade.',
    icon: Camera,
    iconClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    title: 'Termo assinado online',
    description: 'Documento pronto para download imediato.',
    icon: FileCheck2,
    iconClass: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Gestão de dependentes',
    description: 'Inclusão de familiares no mesmo fluxo.',
    icon: Users,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f5fbf9_55%,_#ebf7f2_100%)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-16">
          <Image
            src="/logo-horizontal.svg"
            alt="SHALON Saúde"
            width={240}
            height={70}
            priority
            className="h-10 w-auto"
          />

          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 md:flex">
            <Link href="#inicio" className="transition-colors hover:text-gray-800">
              Home
            </Link>
            <Link href="#servicos" className="transition-colors hover:text-gray-800">
              Serviços
            </Link>
            <Link href="#sobre" className="transition-colors hover:text-gray-800">
              Sobre
            </Link>
            <Link href="#contato" className="transition-colors hover:text-gray-800">
              Contato
            </Link>
          </nav>
        </div>
      </header>

      <section id="inicio" className="pb-20 pt-32 sm:pt-36 lg:pt-40">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <Image
                src="/logo-horizontal.svg"
                alt="SHALON Saúde"
                width={460}
                height={130}
                priority
                className="h-16 w-auto sm:h-20"
              />

              <div className="max-w-2xl space-y-5 text-left">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-400">
                  <span className="h-px w-10 bg-emerald-300" />
                  <span>Seja bem-vindo</span>
                </div>
                <h1 className="text-5xl font-bold leading-tight text-[#1A1A1A] sm:text-6xl">
                  Sua Saúde Completa e Segura.
                </h1>
                <p className="text-xl text-gray-600">
                  Cadastre-se para obter acesso total aos nossos serviços digitais de excelência.
                </p>
              </div>

              <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {BENEFITS.map((benefit) => {
                  const Icon = benefit.icon
                  return (
                    <div
                      key={benefit.title}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white/85 p-4 shadow-sm"
                    >
                      <div className={`rounded-xl p-2.5 ${benefit.iconClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
                        <p className="text-xs text-gray-500">{benefit.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2">
                <Link href="/cadastro">
                  <Button className="rounded-full bg-teal-700 px-9 py-6 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-teal-800">
                    Começar Cadastro
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Dashboard Simulado
                      </p>
                      <p className="text-lg font-bold text-gray-900">Experiência do Usuário</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                        <MonitorCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-cyan-900">Sincronização Ativa</p>
                        <p className="text-xs text-cyan-700">
                          Dados e documentos atualizados em tempo real.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Health Metrics</p>
                      <span className="text-xs font-semibold text-emerald-700">+12%</span>
                    </div>
                    <svg viewBox="0 0 320 120" className="h-28 w-full" role="img" aria-label="Gráfico de saúde">
                      <defs>
                        <linearGradient id="metricLine" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0f766e" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="metricArea" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M20 86 L70 78 L120 82 L170 55 L220 64 L270 40 L300 46" fill="none" stroke="url(#metricLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 86 L70 78 L120 82 L170 55 L220 64 L270 40 L300 46 L300 110 L20 110 Z" fill="url(#metricArea)" />
                      <circle cx="170" cy="55" r="4.5" fill="#0f766e" />
                      <circle cx="270" cy="40" r="4.5" fill="#2563eb" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                      <div className="mb-2 inline-flex rounded-xl bg-blue-100 p-2 text-blue-700">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-blue-900">Cadastro Seguro</p>
                      <p className="text-xs text-blue-700">Proteção de dados ponta a ponta.</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                      <div className="mb-2 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-900">Verificado</p>
                      <p className="text-xs text-emerald-700">Identidade confirmada digitalmente.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                  <Lock className="h-3.5 w-3.5 text-emerald-700" />
                  LGPD Compliance
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-700" />
                  Criptografia de Dados (SSL)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="py-16">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Como Funciona</h2>
            <p className="text-lg text-gray-600">Processo simples em 6 etapas</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                  <span className="text-xl font-bold text-teal-700">{feature.number}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="bg-gradient-to-r from-teal-700 to-cyan-700 py-16">
        <div className="mx-auto w-full max-w-7xl px-6 text-center sm:px-10 lg:px-16">
          <h2 className="mb-4 text-3xl font-bold text-white">Pronto para se cadastrar?</h2>
          <p className="mb-8 text-lg text-cyan-100">
            Leva menos de 10 minutos para completar o processo
          </p>
          <Link href="/cadastro">
            <Button className="bg-white px-8 py-6 text-lg font-semibold text-teal-700 hover:bg-gray-100">
              Começar Cadastro
            </Button>
          </Link>
        </div>
      </section>

      <footer id="contato" className="border-t border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-10 lg:px-16">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center space-x-2">
                <Image
                  src="/logo-horizontal.svg"
                  alt="SHALON Saúde"
                  width={200}
                  height={58}
                  className="h-9 w-auto"
                />
              </div>
              <p className="text-sm text-gray-600">Sistema de cadastro digital seguro</p>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Sistema</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/cadastro" className="hover:text-teal-700">
                    Cadastro
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-teal-700">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Documentos</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Política de Privacidade</li>
                <li>Termos de Serviço</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Contato</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>suporte@shalon.com.br</li>
                <li>+55 (11) 3000-0000</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-sm text-gray-600">
              © 2024 SHALON Saúde. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
