import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeCPF(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidCPF(value: string) {
  const cpf = normalizeCPF(value)

  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf.charAt(index)) * (10 - index)
  }

  let checkDigit = (sum * 10) % 11
  if (checkDigit === 10) checkDigit = 0
  if (checkDigit !== Number(cpf.charAt(9))) return false

  sum = 0
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf.charAt(index)) * (11 - index)
  }

  checkDigit = (sum * 10) % 11
  if (checkDigit === 10) checkDigit = 0

  return checkDigit === Number(cpf.charAt(10))
}
