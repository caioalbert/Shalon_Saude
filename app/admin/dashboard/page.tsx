'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarClock,
  Download,
  FileSignature,
  ImageIcon,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Cadastro } from '@/lib/types'

type RankingItem = {
  name: string
  shortName: string
  total: number
}

type KpiCardProps = {
  title: string
  value: number
  subtitle: string
  valueClassName: string
  icon: LucideIcon
  iconClassName: string
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function KpiCard({ title, value, subtitle, valueClassName, icon: Icon, iconClassName }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value.toLocaleString('pt-BR')}</p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function truncateLabel(value: string, maxLength = 20) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function parseDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function buildRanking(values: Array<string | undefined>, fallbackLabel: string): RankingItem[] {
  const counts = new Map<string, number>()

  values.forEach((rawValue) => {
    const normalizedValue = rawValue?.trim() || fallbackLabel
    counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([name, total]) => ({
      name,
      shortName: truncateLabel(name),
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export default function AdminDashboard() {
  const router = useRouter()
  const [cadastros, setCadastros] = useState<Cadastro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  const fetchCadastros = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/admin/cadastros')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erro ao carregar cadastros')
      }

      const data = await response.json()
      setCadastros(data.cadastros || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCadastros()
  }, [fetchCadastros])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleExportAllContracts = async () => {
    try {
      setExportLoading(true)
      setError(null)

      const response = await fetch('/api/admin/exportar-contratos')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }

        let message = 'Erro ao exportar contratos'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          // ignore parse error
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || 'contratos-shalon.zip'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar contratos')
    } finally {
      setExportLoading(false)
    }
  }

  const summary = useMemo(() => {
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start7Days = new Date(startToday)
    start7Days.setDate(startToday.getDate() - 6)

    const start30Days = new Date(startToday)
    start30Days.setDate(startToday.getDate() - 29)

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let withSelfie = 0
    let withDependentes = 0
    let generatedTerms = 0
    let today = 0
    let last7Days = 0
    let last30Days = 0
    let currentMonth = 0

    cadastros.forEach((cadastro) => {
      if (cadastro.selfie_path) withSelfie += 1
      if (cadastro.tem_dependentes) withDependentes += 1
      if (cadastro.termo_pdf_path) generatedTerms += 1

      const createdAt = parseDate(cadastro.created_at)
      if (!createdAt) return

      if (createdAt >= startToday) today += 1
      if (createdAt >= start7Days) last7Days += 1
      if (createdAt >= start30Days) last30Days += 1
      if (createdAt >= startMonth) currentMonth += 1
    })

    return {
      total: cadastros.length,
      withSelfie,
      withDependentes,
      generatedTerms,
      today,
      last7Days,
      last30Days,
      currentMonth,
    }
  }, [cadastros])

  const estadoCivilRanking = useMemo(
    () => buildRanking(cadastros.map((item) => item.estado_civil), 'Não informado'),
    [cadastros]
  )

  const situacaoProfissionalRanking = useMemo(
    () => buildRanking(cadastros.map((item) => item.situacao_profissional), 'Não informada'),
    [cadastros]
  )

  const perfisCivisAtivos = useMemo(
    () => estadoCivilRanking.filter((item) => item.name !== 'Não informado').length,
    [estadoCivilRanking]
  )

  const situacoesProfissionaisAtivas = useMemo(
    () => situacaoProfissionalRanking.filter((item) => item.name !== 'Não informada').length,
    [situacaoProfissionalRanking]
  )

  const generatedRate = useMemo(() => {
    if (summary.total === 0) return 0
    return Math.round((summary.generatedTerms / summary.total) * 100)
  }, [summary.generatedTerms, summary.total])

  const monthlyTrendData = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return {
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        monthLabel: `${MONTH_LABELS[monthDate.getMonth()]} ${String(monthDate.getFullYear()).slice(-2)}`,
        total: 0,
      }
    })

    const monthKeyToIndex = new Map(months.map((item, index) => [item.key, index]))

    cadastros.forEach((cadastro) => {
      const createdAt = parseDate(cadastro.created_at)
      if (!createdAt) return

      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`
      const monthIndex = monthKeyToIndex.get(key)

      if (monthIndex !== undefined) {
        months[monthIndex].total += 1
      }
    })

    return months
  }, [cadastros])

  const periodChartData = useMemo(
    () => [
      { period: 'Hoje', total: summary.today },
      { period: '7 dias', total: summary.last7Days },
      { period: '30 dias', total: summary.last30Days },
      { period: 'Mês atual', total: summary.currentMonth },
    ],
    [summary.currentMonth, summary.last30Days, summary.last7Days, summary.today]
  )

  const estadoCivilChartData = useMemo(() => estadoCivilRanking.slice(0, 8), [estadoCivilRanking])
  const situacaoProfissionalChartData = useMemo(
    () => situacaoProfissionalRanking.slice(0, 8),
    [situacaoProfissionalRanking]
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SHALON Saúde - Admin</h1>
            <p className="text-sm text-gray-600">Dashboard de Cadastros e Indicadores</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/cadastros">
              <Button variant="outline">Cadastros</Button>
            </Link>
            <Link href="/admin/termo-template">
              <Button variant="outline">Atualizar Termo de Adesão</Button>
            </Link>
            <Link href="/admin/cobranca-configuracoes">
              <Button variant="outline">Configurações de Cobrança</Button>
            </Link>
            <Link href="/admin/vendedores">
              <Button variant="outline">Vendedores</Button>
            </Link>
            <Button
              onClick={handleExportAllContracts}
              disabled={exportLoading || cadastros.length === 0}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {exportLoading ? 'Exportando...' : 'Exportar Contratos (.zip)'}
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-end">
          <Button onClick={fetchCadastros} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar indicadores
          </Button>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">Carregando cadastros...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total de Cadastros"
                value={summary.total}
                subtitle="Base geral de contratantes"
                valueClassName="text-gray-900"
                icon={Users}
                iconClassName="bg-slate-100 text-slate-700"
              />
              <KpiCard
                title="Cadastros Hoje"
                value={summary.today}
                subtitle="Entradas registradas hoje"
                valueClassName="text-cyan-700"
                icon={CalendarClock}
                iconClassName="bg-cyan-100 text-cyan-700"
              />
              <KpiCard
                title="Últimos 7 Dias"
                value={summary.last7Days}
                subtitle="Volume da semana atual"
                valueClassName="text-blue-700"
                icon={RefreshCw}
                iconClassName="bg-blue-100 text-blue-700"
              />
              <KpiCard
                title="Mês Atual"
                value={summary.currentMonth}
                subtitle="Cadastros no mês corrente"
                valueClassName="text-indigo-700"
                icon={Download}
                iconClassName="bg-indigo-100 text-indigo-700"
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Com Selfie"
                value={summary.withSelfie}
                subtitle="Identidade validada"
                valueClassName="text-violet-700"
                icon={ImageIcon}
                iconClassName="bg-violet-100 text-violet-700"
              />
              <KpiCard
                title="Com Dependentes"
                value={summary.withDependentes}
                subtitle="Titulares com família vinculada"
                valueClassName="text-green-700"
                icon={Users}
                iconClassName="bg-green-100 text-green-700"
              />
              <KpiCard
                title="Termos Gerados"
                value={summary.generatedTerms}
                subtitle={`Taxa atual: ${generatedRate}%`}
                valueClassName="text-purple-700"
                icon={FileSignature}
                iconClassName="bg-purple-100 text-purple-700"
              />
              <KpiCard
                title="Perfis Civis Ativos"
                value={perfisCivisAtivos}
                subtitle={`Situações profissionais: ${situacoesProfissionaisAtivas}`}
                valueClassName="text-emerald-700"
                icon={Users}
                iconClassName="bg-emerald-100 text-emerald-700"
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Cadastros por Período (6 meses)</h2>
                  <p className="text-sm text-gray-600">Evolução mensal da base de adesões</p>
                </div>

                {summary.total === 0 ? (
                  <div className="flex h-72 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                    Sem dados para exibir gráfico.
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value: number | string) => [Number(value).toLocaleString('pt-BR'), 'Cadastros']}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#0f766e"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: '#0f766e' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recorte Rápido</h2>
                  <p className="text-sm text-gray-600">Cadastros acumulados por janela de tempo</p>
                </div>

                {summary.total === 0 ? (
                  <div className="flex h-72 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                    Sem dados para exibir gráfico.
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodChartData} margin={{ top: 8, right: 10, left: -15, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value: number | string) => [Number(value).toLocaleString('pt-BR'), 'Cadastros']}
                        />
                        <Bar dataKey="total" fill="#0284c7" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Cadastros por Estado Civil</h2>
                    <p className="text-sm text-gray-600">Distribuição dos perfis civis cadastrados</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {estadoCivilRanking.length} categorias
                  </div>
                </div>

                {estadoCivilChartData.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                    Nenhum dado de estado civil cadastrado.
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={estadoCivilChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 18, left: 18, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                        <YAxis
                          dataKey="shortName"
                          type="category"
                          width={140}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value: number | string) => [Number(value).toLocaleString('pt-BR'), 'Cadastros']}
                          labelFormatter={(label, payload) => {
                            if (!payload || payload.length === 0) return label
                            return payload[0].payload.name
                          }}
                        />
                        <Bar dataKey="total" fill="#059669" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Cadastros por Situação Profissional</h2>
                    <p className="text-sm text-gray-600">Distribuição por vínculo profissional</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    {situacaoProfissionalRanking.length} categorias
                  </div>
                </div>

                {situacaoProfissionalChartData.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                    Nenhuma situação profissional cadastrada.
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={situacaoProfissionalChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 18, left: 18, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                        <YAxis
                          dataKey="shortName"
                          type="category"
                          width={140}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value: number | string) => [Number(value).toLocaleString('pt-BR'), 'Cadastros']}
                          labelFormatter={(label, payload) => {
                            if (!payload || payload.length === 0) return label
                            return payload[0].payload.name
                          }}
                        />
                        <Bar dataKey="total" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>

          </>
        )}
      </div>
    </main>
  )
}
