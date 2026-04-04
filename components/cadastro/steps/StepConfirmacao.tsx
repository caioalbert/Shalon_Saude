'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CadastroFormData } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface StepConfirmacaoProps {
  data: Partial<CadastroFormData>
  aceiteTermos: boolean
  aceitePrivacidade: boolean
  onAceiteTermosChange: (value: boolean) => void
  onAceitePrivacidadeChange: (value: boolean) => void
  assinaturaDataUrl: string
  onAssinaturaChange: (value: string) => void
  showValidation?: boolean
}

const PAPER_RATIO = 3 // largura / altura
const SIGNATURE_BASELINE_RATIO = 0.72

export function StepConfirmacao({
  data,
  aceiteTermos,
  aceitePrivacidade,
  onAceiteTermosChange,
  onAceitePrivacidadeChange,
  assinaturaDataUrl,
  onAssinaturaChange,
  showValidation = false,
}: StepConfirmacaoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const assinaturaRef = useRef(assinaturaDataUrl)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSigningMode, setIsSigningMode] = useState(false)
  const [hasCurrentStroke, setHasCurrentStroke] = useState(false)

  useEffect(() => {
    assinaturaRef.current = assinaturaDataUrl
  }, [assinaturaDataUrl])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const host = canvas.closest('[data-signature-host]') as HTMLDivElement | null
    if (!host) return

    const hostWidth = Math.max(host.clientWidth - 8, 280)
    const hostHeight = Math.max(host.clientHeight - 8, 170)

    let width = hostWidth
    let height = width / PAPER_RATIO
    if (height > hostHeight) {
      height = hostHeight
      width = height * PAPER_RATIO
    }

    const dpr = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${Math.floor(width)}px`
    canvas.style.height = `${Math.floor(height)}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [])

  const drawFromDataUrl = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas || !dataUrl) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = new window.Image()
    image.onload = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(image, 0, 0, width, height)
    }
    image.src = dataUrl
  }, [])

  useEffect(() => {
    if (!isSigningMode) return

    const frameId = requestAnimationFrame(() => {
      setupCanvas()
      if (assinaturaRef.current) {
        drawFromDataUrl(assinaturaRef.current)
      }
    })

    const handleResize = () => {
      setupCanvas()
      if (assinaturaRef.current) {
        drawFromDataUrl(assinaturaRef.current)
      }
    }

    window.addEventListener('resize', handleResize)

    const requestFullScreen = async () => {
      const element = overlayRef.current
      if (!element || typeof element.requestFullscreen !== 'function') return
      try {
        await element.requestFullscreen()
      } catch {
        // fallback sem fullscreen
      }
    }

    void requestFullScreen()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [drawFromDataUrl, isSigningMode, setupCanvas])

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasPoint(event)
    ctx.beginPath()
    ctx.arc(x, y, 0.8, 0, Math.PI * 2)
    ctx.fillStyle = '#111827'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(x, y)

    setHasCurrentStroke(true)
    setIsDrawing(true)
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasPoint(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const buildNormalizedSignatureDataUrl = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return ''

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const width = canvas.width
    const height = canvas.height
    const imageData = ctx.getImageData(0, 0, width, height).data

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const a = imageData[index + 3]

        const isInk = a > 20 && (r < 245 || g < 245 || b < 245)
        if (!isInk) continue

        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }

    if (maxX < minX || maxY < minY) return ''

    const cropWidth = maxX - minX + 1
    const cropHeight = maxY - minY + 1

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = width
    outputCanvas.height = height
    const outputCtx = outputCanvas.getContext('2d')
    if (!outputCtx) return ''

    outputCtx.fillStyle = '#ffffff'
    outputCtx.fillRect(0, 0, width, height)

    const maxDrawWidth = Math.floor(width * 0.9)
    const maxDrawHeight = Math.floor(height * 0.34)
    const scale = Math.min(maxDrawWidth / cropWidth, maxDrawHeight / cropHeight, 1)
    const drawWidth = Math.max(Math.round(cropWidth * scale), 1)
    const drawHeight = Math.max(Math.round(cropHeight * scale), 1)

    const baselineY = Math.round(height * SIGNATURE_BASELINE_RATIO)
    const drawX = Math.round((width - drawWidth) / 2)
    const drawY = Math.max(2, Math.min(height - drawHeight - 2, baselineY - drawHeight))

    outputCtx.drawImage(
      canvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    )

    return outputCanvas.toDataURL('image/png')
  }, [])

  const finishDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    setIsDrawing(false)
    const signatureDataUrl = buildNormalizedSignatureDataUrl()
    if (signatureDataUrl) {
      onAssinaturaChange(signatureDataUrl)
    }
  }

  const handleClearSignature = () => {
    setHasCurrentStroke(false)
    setupCanvas()
    onAssinaturaChange('')
  }

  const handleOpenSigningMode = () => {
    setHasCurrentStroke(false)
    setIsSigningMode(true)
  }

  const handleCloseSigningMode = () => {
    setIsSigningMode(false)
  }

  const canAdvanceSignature = Boolean(assinaturaDataUrl || hasCurrentStroke)
  const showSignatureError = showValidation && !assinaturaDataUrl

  const handleAdvanceSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !canAdvanceSignature) return

    if (hasCurrentStroke || !assinaturaDataUrl) {
      const signatureDataUrl = buildNormalizedSignatureDataUrl()
      if (signatureDataUrl) {
        onAssinaturaChange(signatureDataUrl)
      }
    }

    setIsSigningMode(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          ✓ Revise os dados abaixo antes de finalizar seu cadastro.
        </p>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Dados do Cadastro</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Nome Completo</p>
            <p className="font-medium text-gray-800">{data.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">CPF</p>
            <p className="font-medium text-gray-800">{data.cpf}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">RG</p>
            <p className="font-medium text-gray-800">{data.rg || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Email</p>
            <p className="font-medium text-gray-800">{data.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Telefone</p>
            <p className="font-medium text-gray-800">{data.telefone || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Data de Nascimento</p>
            <p className="font-medium text-gray-800">
              {data.data_nascimento
                ? new Date(data.data_nascimento).toLocaleDateString('pt-BR')
                : 'Não informada'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Sexo</p>
            <p className="font-medium text-gray-800">{data.sexo || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Estado Civil</p>
            <p className="font-medium text-gray-800">{data.estado_civil || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Nome do Cônjuge</p>
            <p className="font-medium text-gray-800">{data.nome_conjuge || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Escolaridade</p>
            <p className="font-medium text-gray-800">{data.escolaridade || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Situação Profissional</p>
            <p className="font-medium text-gray-800">
              {data.situacao_profissional || 'Não informada'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Profissão</p>
            <p className="font-medium text-gray-800">{data.profissao || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Selfie</p>
            <p className="font-medium text-gray-800">
              {data.selfie_blob ? '✓ Capturada' : '✗ Não capturada'}
            </p>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Endereço</p>
          <p className="text-sm text-gray-700">
            {data.endereco && `${data.endereco}, ${data.numero}`}
            {data.complemento && ` - ${data.complemento}`}
            {data.bairro && <br />}
            {data.bairro && `${data.bairro}`}
            {data.cidade && `, ${data.cidade}`}
            {data.estado && ` - ${data.estado}`}
            {data.cep && <br />}
            {data.cep && `CEP: ${data.cep}`}
          </p>
        </div>

        {data.tem_dependentes && data.dependentes && data.dependentes.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Dependentes</p>
            <div className="space-y-2">
              {data.dependentes.map((dep, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {index + 1}. {dep.nome} - {dep.relacao} | Email: {dep.email || '-'} | RG:{' '}
                  {dep.rg || '-'} | Sexo: {dep.sexo || '-'} | Celular: {dep.telefone_celular || '-'}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800">Confirmação</h3>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="termos"
            checked={aceiteTermos}
            onCheckedChange={(value) => onAceiteTermosChange(value === true)}
            className="mt-1"
          />
          <label htmlFor="termos" className="text-sm text-gray-700 cursor-pointer">
            Li e concordo com o <strong>Termo de Adesão ao Serviço</strong> *
          </label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="privacidade"
            checked={aceitePrivacidade}
            onCheckedChange={(value) => onAceitePrivacidadeChange(value === true)}
            className="mt-1"
          />
          <label htmlFor="privacidade" className="text-sm text-gray-700 cursor-pointer">
            Autorizo o armazenamento e processamento dos meus dados pessoais e imagem (selfie)
            conforme a <strong>Política de Privacidade</strong> *
          </label>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h4 className="text-base font-semibold text-gray-800">Assinatura Eletrônica *</h4>
          <p className="text-sm text-gray-600">
            Clique em <strong>Concordar e Assinar</strong> para abrir a área de assinatura em tela grande.
          </p>

          <div
            className={`rounded-lg bg-white p-3 ${
              showSignatureError ? 'border border-red-400' : 'border border-gray-300'
            }`}
          >
            {assinaturaDataUrl ? (
              <Image
                src={assinaturaDataUrl}
                alt="Pré-visualização da assinatura"
                width={900}
                height={300}
                unoptimized
                className="h-24 w-full object-contain"
              />
            ) : (
              <p className="text-sm text-gray-500">Nenhuma assinatura registrada.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleOpenSigningMode}
              disabled={!aceiteTermos || !aceitePrivacidade}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {assinaturaDataUrl ? 'Refazer assinatura' : 'Concordar e Assinar'}
            </Button>
            {!aceiteTermos || !aceitePrivacidade ? (
              <p className="text-xs text-amber-700">
                Marque os aceites acima para habilitar assinatura.
              </p>
            ) : null}
          </div>

          {showSignatureError && (
            <p className="text-xs font-medium text-red-600">Assinatura eletrônica obrigatória.</p>
          )}
        </div>

        <p className="text-xs text-gray-500">* Campos obrigatórios para conclusão do cadastro</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-amber-900">📌 Informações Importantes</p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>Um email será enviado para {data.email} com o termo de adesão assinado</li>
          <li>Seu cadastro será armazenado com segurança em nossos servidores</li>
          <li>Você poderá acessar seu termo assinado a qualquer momento</li>
          <li>Sua selfie será utilizada apenas para verificação de identidade</li>
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Ao clicar em "Concluir Cadastro", você será redirecionado para a tela de sucesso e receberá
        um email com seu termo de adesão assinado.
      </p>

      {isSigningMode && (
        <div ref={overlayRef} className="fixed inset-0 z-[100] bg-slate-900 text-white">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/15 px-4 py-4 sm:px-6">
              <h4 className="text-lg font-semibold">Concordar e Assinar</h4>
              <p className="text-xs text-slate-300">
                Assine no campo abaixo. No celular, use o aparelho na horizontal para melhor área de assinatura.
              </p>
            </div>

            <div className="flex-1 p-3 sm:p-6">
              <div className="flex h-full items-center justify-center rounded-xl border border-white/20 bg-white/5">
                <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
                  <div className="flex h-full w-full items-center justify-center rounded-lg border border-slate-300 bg-white">
                    <div data-signature-host className="relative flex h-full w-full items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={finishDrawing}
                        onPointerLeave={finishDrawing}
                        className="touch-none rounded-md"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute left-0 right-0 border-t border-slate-400"
                        style={{ top: `${SIGNATURE_BASELINE_RATIO * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/15 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseSigningMode}
                  className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancelar
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearSignature}
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Limpar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAdvanceSignature}
                    disabled={!canAdvanceSignature}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Avançar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
