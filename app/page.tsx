import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import {
  BadgeCheck,
  Brain,
  Camera,
  Clock3,
  FileCheck2,
  FileText,
  HeartPulse,
  Lock,
  ShieldCheck,
  Stethoscope,
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

const TELEMEDICINE_HIGHLIGHTS = [
  {
    title: 'Atendimento 24h e sem hora marcada',
    icon: Clock3,
  },
  {
    title: 'Receita médica digital',
    icon: FileText,
  },
  {
    title: 'Atestado digital',
    icon: BadgeCheck,
  },
]

const SPECIALTIES = [
  'Cardiologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Nutrição',
  'Dermatologia',
  'Geriatria',
  'Neurologia',
  'Psiquiatria',
  'Traumatologia',
  'Urologia',
  'Psicologia',
  'Endocrinologia',
  'Ginecologia',
  'Pediatria',
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f5fbf9_55%,_#ebf7f2_100%)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-end px-6 sm:px-10 lg:px-16">
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
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <Image
                  src="/logo-horizontal-v2.png"
                  alt="SHALON Saúde"
                  width={520}
                  height={169}
                  priority
                  unoptimized
                  className="h-16 w-auto sm:h-20"
                />
              </div>

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
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                        <HeartPulse className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-cyan-900">Telemedicina</p>
                        <p className="text-xs font-medium text-cyan-800">O futuro da saúde é hoje</p>
                        <p className="mt-1 text-xs text-cyan-700">
                          É simples, rápido e prático para você e sua família.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {TELEMEDICINE_HIGHLIGHTS.map((item) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3"
                        >
                          <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-xs font-semibold text-blue-900">{item.title}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-blue-900">
                      <Stethoscope className="h-4 w-4" />
                      <p className="text-sm font-semibold">Especialidades</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALTIES.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-emerald-900">
                      <Brain className="h-4 w-4" />
                      <p className="text-sm font-semibold">Saúde Mental</p>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Acesso ilimitado à equipe de psicólogos. Fortaleça o seu time com um plano
                      de saúde que cuida da mente.
                    </p>
                    <p className="mt-2 text-xs text-emerald-800">
                      Acesso rápido a psicólogos, reduzindo afastamentos e aumentando a
                      performance. Investir em saúde mental é investir em resultados.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Assistência funeral pelo Grupo Zelo
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Suporte especializado para sua família em momentos sensíveis.
                    </p>
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
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/logo-horizontal-v2.png"
                  alt="SHALON Saúde"
                  width={200}
                  height={65}
                  unoptimized
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
