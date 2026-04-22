'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const SETTINGS_ITEMS = [
  {
    title: 'Termo de Adesão',
    description: 'Atualize o template usado na geração do PDF enviado aos clientes.',
    href: '/admin/termo-template',
    actionLabel: 'Gerenciar Termo',
  },
  {
    title: 'Configurações de Cobrança',
    description: 'Defina valores, plano padrão e formas de cobrança da mensalidade.',
    href: '/admin/cobranca-configuracoes',
    actionLabel: 'Gerenciar Cobrança',
  },
]

export default function AdminConfiguracoesPage() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-sm text-gray-600">Central de ajustes administrativos do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="outline">Voltar ao Dashboard</Button>
            </Link>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SETTINGS_ITEMS.map((item) => (
            <section key={item.href} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              <div className="mt-5">
                <Link href={item.href}>
                  <Button variant="outline">{item.actionLabel}</Button>
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
