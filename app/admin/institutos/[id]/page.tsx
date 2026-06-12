'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type Instituto = {
  id: string
  nome: string
  email: string
  codigo_indicacao: string
  ativo: boolean
  comissao_percentual_mensalidade: number
  comissao_mensalidades_max: number | null
  sem_adesao: boolean
  created_at: string
}

type Plano = {
  id: string
  nome: string
  codigo: string
  valor: number
}

type PlanoPreco = {
  plano_id: string
  valor_por_pessoa: number
  planos?: { id: string; nome: string; codigo: string }
}

export default function AdminInstitutoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const institutoId = params?.id as string

  const [instituto, setInstituto] = useState<Instituto | null>(null)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoPrecos, setPlanoPrecos] = useState<PlanoPreco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingComissao, setIsSavingComissao] = useState(false)
  const [isSavingPrecos, setIsSavingPrecos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Comissão form state
  const [comissaoPercentual, setComissaoPercentual] = useState('50')
  const [comissaoModo, setComissaoModo] = useState<'primeiro' | 'custom' | 'vitalicio'>('primeiro')
  const [comissaoMaxCustom, setComissaoMaxCustom] = useState('1')
  const [semAdesao, setSemAdesao] = useState(true)

  // Preços por plano
  const [precosPorPlano, setPrecosPorPlano] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    if (!institutoId) return
    try {
      setIsLoading(true)
      setError(null)

      const [institutoRes, planosRes] = await Promise.all([
        fetch(`/api/admin/institutos/${institutoId}`, { cache: 'no-store' }),
        fetch('/api/admin/planos', { cache: 'no-store' }),
      ])

      if (institutoRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const institutoPayload = await institutoRes.json().catch(() => null)
      if (!institutoRes.ok) {
        throw new Error(institutoPayload?.error || 'Erro ao carregar instituto.')
      }

      const inst = institutoPayload?.instituto as Instituto
      setInstituto(inst)
      setPlanoPrecos(institutoPayload?.planoPrecos || [])

      // Hydrate comissão form
      setComissaoPercentual(String(inst.comissao_percentual_mensalidade ?? 50))
      const maxVal = inst.comissao_mensalidades_max
      if (maxVal === null) setComissaoModo('vitalicio')
      else if (maxVal === 1) setComissaoModo('primeiro')
      else { setComissaoModo('custom'); setComissaoMaxCustom(String(maxVal)) }
      setSemAdesao(inst.sem_adesao !== false)

      const planosPayload = await planosRes.json().catch(() => null)
      const allPlanos = (Array.isArray(planosPayload?.planos) ? planosPayload.planos : []) as Plano[]
      setPlanos(allPlanos)

      // Hydrate preços por plano
      const initialPrecos: Record<string, string> = {}
      for (const plano of allPlanos) {
        const found = (institutoPayload?.planoPrecos || []).find(
          (pp: PlanoPreco) => pp.plano_id === plano.id
        )
        initialPrecos[plano.id] = found ? String(found.valor_por_pessoa) : ''
      }
      setPrecosPorPlano(initialPrecos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setIsLoading(false)
    }
  }, [institutoId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveComissao = async () => {
    try {
      setIsSavingComissao(true)
      setError(null)
      setMessage(null)

      const comissaoMensalidadesMax =
        comissaoModo === 'vitalicio'
          ? null
          : comissaoModo === 'primeiro'
          ? 1
          : Number(comissaoMaxCustom)

      const response = await fetch(`/api/admin/institutos/${institutoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissaoPercentualMensalidade: Number(comissaoPercentual),
          comissaoMensalidadesMax,
          semAdesao,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Erro ao salvar comissão.')

      setMessage('Configurações de comissão salvas com sucesso.')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar comissão.')
    } finally {
      setIsSavingComissao(false)
    }
  }

  const handleSavePrecos = async () => {
    try {
      setIsSavingPrecos(true)
      setError(null)
      setMessage(null)

      const items = Object.entries(precosPorPlano)
        .filter(([, val]) => val.trim() !== '' && Number(val) > 0)
        .map(([plano_id, valor]) => ({ plano_id, valor_por_pessoa: Number(valor) }))

      const response = await fetch(`/api/admin/institutos/${institutoId}/plano-precos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precos: items }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Erro ao salvar preços.')

      setMessage('Preços por plano salvos com sucesso.')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar preços.')
    } finally {
      setIsSavingPrecos(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/institutos">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
                {instituto ? instituto.nome : 'Carregando...'}
              </h1>
              <p className="text-xs text-gray-600">Configurações do Instituto/Parceiro</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/institutos"><Button variant="outline">Voltar à Lista</Button></Link>
            <Button onClick={handleLogout} variant="outline">Sair</Button>
          </div>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild><Button asChild variant="outline" className="w-full justify-start"><Link href="/admin/institutos">Voltar à Lista</Link></Button></SheetClose>
                  <SheetClose asChild><Button onClick={handleLogout} variant="outline" className="w-full justify-start">Sair</Button></SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {isLoading && <p className="text-center text-sm text-gray-500">Carregando...</p>}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        {instituto && (
          <>
            {/* Info geral */}
            <div className="rounded-lg bg-white p-6 shadow space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Informações</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Nome</dt>
                  <dd className="font-medium text-gray-900">{instituto.nome}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-700">{instituto.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Código de Indicação</dt>
                  <dd className="font-mono text-gray-700">{instituto.codigo_indicacao}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${instituto.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {instituto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Configurações de Comissão */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Configuração de Comissão</h2>
              <p className="text-xs text-gray-500">A comissão é calculada apenas sobre mensalidades (clientes de institutos não pagam adesão).</p>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">% sobre mensalidade</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={comissaoPercentual}
                  onChange={(e) => setComissaoPercentual(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Mensalidades que geram comissão</p>
                <div className="space-y-2">
                  {[
                    { value: 'primeiro', label: 'Apenas a 1ª mensalidade' },
                    { value: 'custom', label: 'Número customizado' },
                    { value: 'vitalicio', label: 'Vitalício (todas as mensalidades)' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="comissaoModo"
                        value={opt.value}
                        checked={comissaoModo === opt.value}
                        onChange={() => setComissaoModo(opt.value as typeof comissaoModo)}
                        className="accent-teal-700"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {comissaoModo === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    value={comissaoMaxCustom}
                    onChange={(e) => setComissaoMaxCustom(e.target.value)}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ex: 3"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  id="semAdesaoDetail"
                  checked={semAdesao}
                  onChange={(e) => setSemAdesao(e.target.checked)}
                  className="h-4 w-4 accent-teal-700"
                />
                <div>
                  <label htmlFor="semAdesaoDetail" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Isentar adesão dos clientes deste parceiro
                  </label>
                  <p className="text-xs text-gray-500">Se marcado, clientes não pagarão taxa de adesão ao se cadastrar via link deste instituto.</p>
                </div>
              </div>

              <Button onClick={handleSaveComissao} disabled={isSavingComissao}>
                {isSavingComissao ? 'Salvando...' : 'Salvar Comissão e Adesão'}
              </Button>
            </div>

            {/* Preços por Plano */}
            {planos.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Preços por Plano</h2>
                <p className="text-xs text-gray-500">
                  Configure o valor por pessoa para cada plano neste instituto. Deixe em branco para usar o preço padrão do plano.
                </p>

                <div className="space-y-3">
                  {planos.map((plano) => (
                    <label key={plano.id} className="flex items-center gap-4">
                      <span className="w-40 text-sm font-medium text-gray-700 shrink-0">{plano.nome}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-500">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={precosPorPlano[plano.id] ?? ''}
                          onChange={(e) => setPrecosPorPlano((prev) => ({ ...prev, [plano.id]: e.target.value }))}
                          placeholder={`Padrão: ${plano.valor?.toFixed(2) ?? '—'}`}
                          className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <span className="text-xs text-gray-400">por pessoa</span>
                      </div>
                    </label>
                  ))}
                </div>

                <Button onClick={handleSavePrecos} disabled={isSavingPrecos}>
                  {isSavingPrecos ? 'Salvando...' : 'Salvar Preços'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
