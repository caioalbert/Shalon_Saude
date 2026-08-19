import assert from 'node:assert/strict'
import test from 'node:test'
import { getMaisEduProductId } from '../../lib/maisedu-products'
import { parseMaisEduSuccessData } from '../../lib/maisedu-response'

const defaults = {
  requestedProductId: 1 as const,
  fallbackLogin: '12345678901',
  fallbackEmail: 'cliente@example.com',
}

test('mapeia os planos internos para os produtos contratados do parceiro', () => {
  assert.equal(getMaisEduProductId('INDIVIDUAL'), 1)
  assert.equal(getMaisEduProductId('FAMILIAR'), 2)
  assert.equal(getMaisEduProductId('EMPRESARIAL'), 2)
  assert.equal(getMaisEduProductId('PLANO-EMPRESARIAL'), 2)
})

test('aceita o contrato documentado com o produto solicitado', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: {
      user_id: 1420,
      login: 'cliente',
      email: 'retorno@example.com',
      produto: { id: 1, nome: 'MaisTelemed Individual', prod_id: 3, valor: 29.9 },
      pass_temp: 'senha-temporaria',
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.returnedProductId, 1)
  assert.equal(result.data.user_id, 1420)
  assert.equal(result.data.produto.id, 1)
  assert.equal(result.data.pass_temp, 'senha-temporaria')
})

test('aceita resposta real reduzida com user_id e produto omitido', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: { user_id: '1421', login: 'cliente' },
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.returnedProductId, null)
  assert.equal(result.data.user_id, 1421)
  assert.equal(result.data.produto.id, 1)
  assert.equal(result.data.email, defaults.fallbackEmail)
})

test('aceita produto retornado diretamente como string numérica', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: { user_id: 1422, produto: '1' },
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.returnedProductId, 1)
})

test('recusa resposta sem user_id', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: { produto: { id: 1 } },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(result.issues, ["campo 'user_id' ausente ou inválido"])
})

test('recusa produto informado com id inválido', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: { user_id: 1423, produto: { id: 'invalido' } },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(result.issues, ["campo 'produto.id' informado, mas inválido"])
})

test('recusa produto diferente quando o parceiro informa o id', () => {
  const result = parseMaisEduSuccessData({
    ...defaults,
    rawData: { user_id: 1424, produto: { id: 2 } },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(result.issues, ['produto retornado 2, esperado 1'])
})
