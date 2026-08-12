export function getClientJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()

  if (!secret) {
    throw new Error('JWT_SECRET não configurado no servidor.')
  }

  return new TextEncoder().encode(secret)
}
