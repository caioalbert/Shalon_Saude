import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

/* eslint-disable @typescript-eslint/no-require-imports -- o teste substitui exports CommonJS antes de carregar o módulo de sync compilado */

test('persiste SINCRONIZADO quando o parceiro confirma o cadastro', async () => {
  const cadastroId = '516f50e2-327e-4d68-be33-6003ad46c76c'
  const updates: Array<Record<string, unknown>> = []
  const fakeSupabase = {
    from(table: string) {
      assert.equal(table, 'cadastros')
      return {
        select() {
          return {
            eq(field: string, value: string) {
              assert.equal(field, 'id')
              assert.equal(value, cadastroId)
              return {
                async single() {
                  return {
                    data: {
                      id: cadastroId,
                      nome: 'Cliente de Teste',
                      email: 'cliente@example.com',
                      cpf: '12345678901',
                      status: 'ATIVO',
                      tipo_plano: 'INDIVIDUAL',
                      maisedu_status: 'ERRO',
                      maisedu_user_id: null,
                    },
                    error: null,
                  }
                },
              }
            },
          }
        },
        update(payload: Record<string, unknown>) {
          updates.push(payload)
          return {
            async eq(field: string, value: string) {
              assert.equal(field, 'id')
              assert.equal(value, cadastroId)
              return { error: null }
            },
          }
        },
      }
    },
  }

  const adminModule = require('../../lib/supabase/admin') as typeof import('../../lib/supabase/admin')
  const maisEduModule = require('../../lib/maisedu') as typeof import('../../lib/maisedu')

  mock.method(adminModule, 'createAdminClient', () => fakeSupabase as never)
  mock.method(maisEduModule, 'isMaisEduConfigured', () => true)
  mock.method(maisEduModule, 'registerUserOnMaisEdu', async () => ({
    ok: true as const,
    data: {
      user_id: 1500,
      login: '12345678901',
      email: 'cliente@example.com',
      produto: { id: 1 as const, nome: '', prod_id: 0, valor: 0 },
    },
  }))

  const { syncCadastroToMaisEdu } = require('../../lib/maisedu-sync') as typeof import('../../lib/maisedu-sync')
  const result = await syncCadastroToMaisEdu(cadastroId, { force: true })

  assert.equal(result.success, true)
  assert.equal('userId' in result, true)
  if (!('userId' in result)) return
  assert.equal(result.userId, 1500)
  assert.equal(updates.length, 1)
  assert.equal(updates[0]?.maisedu_status, 'SINCRONIZADO')
  assert.equal(updates[0]?.maisedu_user_id, 1500)
  assert.equal(typeof updates[0]?.maisedu_synced_at, 'string')
  assert.equal(updates[0]?.maisedu_last_error, null)
})
