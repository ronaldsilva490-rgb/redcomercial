/**
 * ImageUpload — componente reutilizável de upload de foto. v9.1
 *
 * MUDANÇAS v9.1:
 * - Preview local antes do upload (não depende do bucket existir)
 * - Graceful degradation: se upload falha, mantém preview local
 * - FotoGallery com preview imediato de cada foto adicionada
 * - Tratamento correto de URL inválida/quebrada
 */
import { useState, useRef } from 'react'
import { Camera, X, Loader, ImageOff } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 5

/** Cria um objectURL local para preview imediato */
function fileToPreview(file) {
  return URL.createObjectURL(file)
}

/** Converte File para base64 */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload  = () => res(reader.result)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
}

function validateFile(file) {
  if (!ALLOWED_MIME.includes(file.type)) return 'Formato inválido. Use JPG, PNG ou WebP'
  if (file.size > MAX_MB * 1024 * 1024) return `Arquivo muito grande. Máximo ${MAX_MB}MB`
  return null
}

/**
 * ImageUpload — foto única (avatar, logo, produto)
 */
export default function ImageUpload({
  url, onChange, tipo = 'misc',
  label = 'Foto', size = 100, shape = 'square'
}) {
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(null)  // preview local temporário
  const inputRef = useRef(null)

  const radius = shape === 'circle' ? '50%' : 10
  const displayUrl = preview || url  // mostra preview local ou URL salva

  const handleFile = async (file) => {
    if (!file) return
    const err = validateFile(file)
    if (err) { toast.error(err); return }

    // Preview local imediato
    const localPreview = fileToPreview(file)
    setPreview(localPreview)

    setUploading(true)
    try {
      const b64 = await fileToBase64(file)
      const { data } = await api.post('/api/upload/image', {
        base64: b64, mime: file.type, tipo,
      })
      const remoteUrl = data.data?.url || ''
      URL.revokeObjectURL(localPreview)
      setPreview(null)
      onChange(remoteUrl)
      toast.success('Foto anexada com sucesso! 📸')
    } catch {
      // Upload falhou: mantém preview local, não remove
      toast.error('Não consegui enviar a foto agora, mas salvei ela aqui! ⚠️')
      // Passa o objectURL para o form (será perdido ao recarregar, mas não trava o fluxo)
      onChange(localPreview)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (e) => {
    e.stopPropagation()
    if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
    if (url && url.startsWith('http')) {
      try { await api.delete('/api/upload/image', { data: { url } }) } catch {}
    }
    onChange('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </span>
      )}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: radius,
          border: `2px dashed ${displayUrl ? 'transparent' : 'var(--border)'}`,
          background: displayUrl ? 'transparent' : 'var(--bg3)',
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          transition: 'border-color 0.2s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!displayUrl) e.currentTarget.style.borderColor = 'var(--red)' }}
        onMouseLeave={e => { if (!displayUrl) e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="foto"
              onError={e => { e.target.style.display = 'none' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: shape === 'circle' ? '50%' : 8, display: 'block' }}
            />
            {/* Overlay */}
            <div
              className="img-overlay"
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'background 0.2s',
                borderRadius: shape === 'circle' ? '50%' : 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)' }}
            >
              {uploading
                ? <Loader size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <>
                    <Camera size={14} color="#fff" style={{ opacity: 0 }} className="overlay-icon" />
                    <button
                      onClick={handleRemove}
                      style={{
                        background: 'rgba(232,25,44,0.85)', border: 'none', borderRadius: '50%',
                        width: 22, height: 22, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', opacity: 0,
                      }}
                      className="overlay-icon"
                    >
                      <X size={11} color="#fff" />
                    </button>
                  </>
              }
            </div>
          </>
        ) : uploading ? (
          <Loader size={20} color="var(--muted)" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
            <Camera size={size < 60 ? 16 : 22} color="var(--muted)" />
            {size >= 60 && (
              <span style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>
                Clique para{'\n'}adicionar
              </span>
            )}
          </div>
        )}
      </div>

      <style>{`
        .img-overlay:hover .overlay-icon { opacity: 1 !important; }
      `}</style>

      <input
        ref={inputRef} type="file"
        accept={ALLOWED_MIME.join(',')}
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

/**
 * FotoGallery — galeria de múltiplas fotos (veículos)
 * Mostra preview LOCAL imediato antes do upload terminar
 */
export function FotoGallery({ fotos = [], onChange, tipo = 'vehicles', max = 10 }) {
  const [uploading, setUploading] = useState(false)
  const [previews,  setPreviews]  = useState([])  // {url, uploading, local}
  const inputRef = useRef(null)

  // Sincroniza previews com fotos salvas
  const allFotos = [
    ...fotos,                           // URLs remotas já salvas
    ...previews.map(p => p.url),        // previews locais em upload
  ]

  const handleFiles = async (files) => {
    if (!files?.length) return
    const arr = Array.from(files).slice(0, max - allFotos.length)
    if (!arr.length) { toast.error(`Máximo de ${max} fotos`); return }

    // Valida arquivos
    const validos = arr.filter(f => {
      const err = validateFile(f)
      if (err) { toast.error(`${f.name}: ${err}`); return false }
      return true
    })
    if (!validos.length) return

    // Preview local imediato
    const novosPreview = validos.map(f => ({ url: fileToPreview(f), uploading: true, local: true }))
    setPreviews(p => [...p, ...novosPreview])
    setUploading(true)

    const remotas = []
    for (let i = 0; i < validos.length; i++) {
      const file = validos[i]
      const localUrl = novosPreview[i].url
      try {
        const b64 = await fileToBase64(file)
        const { data } = await api.post('/api/upload/image', { base64: b64, mime: file.type, tipo })
        const remoteUrl = data.data?.url || ''
        URL.revokeObjectURL(localUrl)
        remotas.push(remoteUrl)
      } catch {
        // Mantém preview local como fallback
        remotas.push(localUrl)
      }
    }

    setPreviews([])
    setUploading(false)
    if (remotas.length) {
      onChange([...fotos, ...remotas])
      toast.success(`${remotas.length} foto(s) adicionada(s)!`)
    }
  }

  const handleRemove = async (url, isRemote) => {
    if (isRemote) {
      // Remove da lista de fotos remotas
      onChange(fotos.filter(f => f !== url))
      if (url.startsWith('http')) {
        try { await api.delete('/api/upload/image', { data: { url } }) } catch {}
      }
    } else {
      // Remove de preview local
      URL.revokeObjectURL(url)
      setPreviews(p => p.filter(x => x.url !== url))
    }
  }

  return (
    <div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
        Fotos ({allFotos.length}/{max})
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Fotos remotas salvas */}
        {fotos.map((url, i) => (
          <div key={`r-${i}`} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg4)' }}>
            <img
              src={url}
              alt={`foto ${i+1}`}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <ImageOff size={20} color="var(--muted)" />
            </div>
            <button
              onClick={() => handleRemove(url, true)}
              style={{
                position: 'absolute', top: 3, right: 3,
                background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%',
                width: 20, height: 20, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}
            >
              <X size={10} color="#fff" />
            </button>
          </div>
        ))}

        {/* Previews locais em upload */}
        {previews.map((p, i) => (
          <div key={`p-${i}`} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <img src={p.url} alt="enviando" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
            }}>
              <Loader size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        ))}

        {/* Botão adicionar */}
        {allFotos.length < max && (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 8,
              border: '2px dashed var(--border)', background: 'var(--bg3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', cursor: uploading ? 'default' : 'pointer',
              flexShrink: 0, gap: 4,
            }}
          >
            {uploading
              ? <Loader size={16} color="var(--muted)" style={{ animation: 'spin 1s linear infinite' }} />
              : <>
                  <Camera size={18} color="var(--muted)" />
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>Adicionar</span>
                </>
            }
          </div>
        )}
      </div>
      <input
        ref={inputRef} type="file" multiple
        accept={ALLOWED_MIME.join(',')}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
