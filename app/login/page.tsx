import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LoginContaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
        <p className="text-sm text-gray-700">
          O acesso do cliente está em implantação e estará disponível em breve para consultas,
          pagamentos e acompanhamento do plano.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/cadastro" className="w-full">
            <Button className="w-full">Voltar ao Cadastro</Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">Ir para Início</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
