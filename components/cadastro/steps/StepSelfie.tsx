'use client'

import { CadastroFormData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useRef, useState, useEffect } from 'react'

interface StepSelfieProps {
  data: Partial<CadastroFormData>
  onUpdate: (data: Partial<CadastroFormData>) => void
  showValidation?: boolean
}

export function StepSelfie({ data, onUpdate, showValidation = false }: StepSelfieProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const revokePreviewIfNeeded = (preview: string | null) => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    if (data.selfie_blob && !selfiePreview) {
      const preview = URL.createObjectURL(data.selfie_blob)
      setSelfieBlob(data.selfie_blob)
      setSelfiePreview(preview)
    }
  }, [data.selfie_blob, selfiePreview])

  useEffect(() => {
    return () => {
      stopStream()
      revokePreviewIfNeeded(selfiePreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfiePreview])

  const stopCamera = () => {
    stopStream()
    setCameraActive(false)
    setVideoReady(false)
    setCameraStarting(false)
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Seu navegador não suporta acesso à câmera.')
      return
    }

    try {
      stopStream()
      setError(null)
      setVideoReady(false)
      setCameraStarting(true)
      setCameraActive(true)
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
      console.error('Camera error:', err)
      setCameraStarting(false)
      setCameraActive(false)
    }
  }

  useEffect(() => {
    if (!cameraActive) return

    let cancelled = false

    const openCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        // Aguarda o <video> existir na tela antes de anexar o stream.
        let retries = 0
        while (!videoRef.current && retries < 12 && !cancelled) {
          retries += 1
          await new Promise((resolve) => setTimeout(resolve, 25))
        }

        if (!videoRef.current) {
          throw new Error('Elemento de vídeo não disponível')
        }

        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)

        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setVideoReady(true)
        }
      } catch (err) {
        console.error('Camera open error:', err)
        stopStream()
        setCameraActive(false)
        setVideoReady(false)
        setError('Não foi possível abrir a câmera. Tente novamente ou use "Enviar Foto".')
      } finally {
        if (!cancelled) {
          setCameraStarting(false)
        }
      }
    }

    openCamera()

    return () => {
      cancelled = true
    }
  }, [cameraActive])

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Câmera não inicializada corretamente.')
      return
    }

    const width = videoRef.current.videoWidth
    const height = videoRef.current.videoHeight

    if (!videoReady || videoRef.current.readyState < 2 || !width || !height) {
      setError('Aguarde a câmera carregar antes de capturar.')
      return
    }

    const context = canvasRef.current.getContext('2d')
    if (!context) {
      setError('Não foi possível preparar a captura da imagem.')
      return
    }

    canvasRef.current.width = width
    canvasRef.current.height = height
    context.drawImage(videoRef.current, 0, 0, width, height)

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setError('Falha ao capturar selfie. Tente novamente.')
          return
        }

        const preview = URL.createObjectURL(blob)
        revokePreviewIfNeeded(selfiePreview)
        setSelfieBlob(blob)
        setSelfiePreview(preview)
        onUpdate({ selfie_blob: blob })
        setError(null)
        stopCamera()
      },
      'image/jpeg',
      0.95
    )
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    stopCamera()
    revokePreviewIfNeeded(selfiePreview)
    const preview = URL.createObjectURL(file)
    setSelfieBlob(file)
    setSelfiePreview(preview)
    onUpdate({ selfie_blob: file })
    setError(null)
  }

  const removeSelfie = () => {
    revokePreviewIfNeeded(selfiePreview)
    setSelfieBlob(null)
    setSelfiePreview(null)
    onUpdate({ selfie_blob: undefined })
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          📸 Tire uma selfie clara para ser vinculada ao seu cadastro. A imagem será armazenada com
          segurança.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showValidation && !selfiePreview && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">
            Capture ou envie uma selfie para continuar.
          </p>
        </div>
      )}

      {!selfiePreview ? (
        <>
          {!cameraActive ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                Abrir Câmera
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="py-6 text-lg"
              >
                Enviar Foto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-blue-500 opacity-30" />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={captureSelfie}
                  disabled={!videoReady || cameraStarting}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-6 text-lg"
                >
                  {videoReady ? 'Capturar Selfie' : 'Carregando Câmera...'}
                </Button>
                <Button onClick={stopCamera} variant="outline" className="flex-1 py-6 text-lg">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden">
            <img src={selfiePreview} alt="Selfie capturada" className="w-full h-full object-cover" />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={removeSelfie}
              variant="outline"
              className="flex-1 text-orange-600 hover:text-orange-700"
            >
              Tirar Outra Foto
            </Button>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm font-medium">✓ Selfie capturada com sucesso!</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      <p className="text-xs text-gray-500">
        A câmera será desativada após capturar a selfie. Sua imagem será armazenada com segurança.
      </p>
      {!selfieBlob && (
        <p className="text-xs text-gray-500">
          Se a câmera não funcionar no seu computador, use o botão "Enviar Foto" como alternativa.
        </p>
      )}
    </div>
  )
}
