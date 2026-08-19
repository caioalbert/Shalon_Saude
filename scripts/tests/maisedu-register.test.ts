import assert from 'node:assert/strict'
import test from 'node:test'

test('envia os produtos individual e familiar e aceita a resposta reduzida sem chamar a API real', async () => {
  process.env.MAISEDU_API_TOKEN = 'token-exclusivo-do-teste'
  const originalFetch = globalThis.fetch
  let sentBody: Record<string, unknown> = {}

  try {
    globalThis.fetch = (async (_input, init) => {
      sentBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Cadastro integrado via Shalon Saúde realizado com sucesso!',
          data: {
            user_id: 1500,
            login: '12345678901',
            email: 'cliente@example.com',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch

    const { registerUserOnMaisEdu } = await import('../../lib/maisedu')
    for (const produto of [1, 2] as const) {
      const result = await registerUserOnMaisEdu({
        nome: 'Cliente de Teste',
        email: 'cliente@example.com',
        login: '12345678901',
        doc: '12345678901',
        produto,
      })

      assert.equal(sentBody.produto, produto)
      assert.equal(result.ok, true)
      if (!result.ok) continue
      assert.equal(result.data.user_id, 1500)
      assert.equal(result.data.produto.id, produto)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})
