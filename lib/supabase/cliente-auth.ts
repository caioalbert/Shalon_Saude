import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'shalom-saude-secret-key-change-in-production'
)

export type ClienteAuth = {
  clienteId: string
  cpf: string
  nome: string
}

export async function getClienteAuth(): Promise<ClienteAuth | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('cliente_token')?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    return {
      clienteId: payload.clienteId as string,
      cpf: payload.cpf as string,
      nome: payload.nome as string,
    }
  } catch {
    return null
  }
}

export async function requireClienteAuth(): Promise<ClienteAuth> {
  const auth = await getClienteAuth()
  
  if (!auth) {
    throw new Error('Não autenticado')
  }
  
  return auth
}
