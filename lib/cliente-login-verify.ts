export type CadastroLoginRow = {
  id: string
  nome: string
  email: string
  cpf: string
  status: string
}

/** Valida segundo fator: 4 primeiros dígitos do CPF (app/PWA atual). */
export function verifyCpfPrefix(cadastro: CadastroLoginRow, prefixInput: string): boolean {
  const prefixClean = prefixInput.replace(/\D/g, '')
  if (prefixClean.length !== 4) return false
  const cpfDigits = cadastro.cpf.replace(/\D/g, '')
  return cpfDigits.slice(0, 4) === prefixClean
}

export function formatCpfForDb(cpfClean: string): string {
  return cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
