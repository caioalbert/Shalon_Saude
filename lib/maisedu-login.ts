export function createMaisEduLoginFromName(name: string) {
  const parts = String(name || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]

  return `${parts[0]}${parts[parts.length - 1]}`
}
