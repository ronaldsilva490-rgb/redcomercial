/**
 * PixModal — QR Code PIX + Copia e Cola.
 * 100% offline. Corrigido: fallback robusto para cidade null.
 */
import { useEffect, useRef, useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { generatePixPayload } from '../../utils/pix'
import useAuthStore from '../../store/authStore'
import { formatMoney } from '../../utils/format'

export default function PixModal({ amount, txid, description, onClose, onConfirm, confirming }) {
  const { tenant } = useAuthStore()
  const qrRef   = useRef(null)
  const [payload, setPayload] = useState('')
  const [copied,  setCopied]  = useState(false)
  const [qrError, setQrError] = useState(false)
  const [error,   setError]   = useState(null)

  // Dados PIX — com fallbacks robustos
  const pixKey     = (tenant?.pix_chave || '').trim()
  const pixTitular = (tenant?.pix_titular || tenant?.nome || 'Estabelecimento').trim().slice(0, 25)
  // cidade: garante string não-vazia, máx 15 chars, ASCII
  const cidade     = ((tenant?.cidade || 'Brasil').trim() || 'Brasil').slice(0, 15)
  const configured = !!pixKey

  useEffect(() => {
    if (!configured) return
    try {
      const p = generatePixPayload({
        pixKey,
        merchantName: pixTitular,
        merchantCity: cidade,
        amount:       amount && amount > 0 ? amount : undefined,
        txid:         txid || undefined,
        description:  description || `Pagamento RED`,
      })
      setPayload(p)
      setError(null)
    } catch (e) {
      setError(`Erro ao gerar PIX: ${e.message}. Verifique a chave em Administração → Meu Negócio.`)
    }
  }, [pixKey, pixTitular, cidade, amount, txid, description, configured])

  // Gera QR Code
  useEffect(() => {
    if (!payload || !qrRef.current) return
    qrRef.current.innerHTML = ''
    setQrError(false)
    if (window.QRCode) {
      try {
        new window.QRCode(qrRef.current, {
          text: payload, width: 200, height: 200,
          colorDark: '#0A0A0B', colorLight: '#F0EEF0',
          correctLevel: window.QRCode.CorrectLevel.M,
        })
      } catch { setQrError(true) }
    } else {
      setQrError(true)
    }
  }, [payload])

  const handleCopy = () => {
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!configured) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">PIX não configurado</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10 }}>
              <AlertTriangle size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
                Configure sua <strong>chave PIX</strong> em{' '}
                <strong>Administração → Meu Negócio → PIX</strong> para receber pagamentos.
                <br /><br />
                Gratuito, direto para sua conta bancária.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Entendi</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-title">Pagar com PIX</span>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Pagamento direto · sem taxas</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center' }}>
          {error ? (
            <div style={{ background: 'rgba(232,25,44,0.08)', border: '1px solid rgba(232,25,44,0.25)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%' }}>
              <AlertTriangle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6 }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Valor */}
              <div style={{
                textAlign: 'center',
                background: 'var(--bg4)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 20px', width: '100%',
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Valor a pagar</div>
                <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
                  {formatMoney(amount)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Para: <strong style={{ color: 'var(--dim)' }}>{pixTitular}</strong>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {qrError ? (
                  <div style={{
                    width: 200, height: 200, background: 'var(--bg4)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 16,
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
                    Use o Copia e Cola abaixo
                  </div>
                ) : (
                  <div
                    ref={qrRef}
                    style={{ background: 'var(--text)', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Escaneie com o app do banco</div>
              </div>

              {/* Copia e Cola */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>PIX Copia e Cola</div>
                <div style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 10, fontFamily: 'DM Mono', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'all', cursor: 'text' }}>
                    {payload}
                  </div>
                  <button onClick={handleCopy} style={{
                    background: copied ? 'rgba(34,197,94,0.12)' : 'var(--bg3)',
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                    borderRadius: 6, cursor: 'pointer', padding: '6px 10px',
                    color: copied ? 'var(--green)' : 'var(--dim)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
                  }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{
                fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6,
                background: 'var(--bg4)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)', width: '100%',
              }}>
                💡 Confirme o recebimento no seu app bancário antes de clicar em confirmar.
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={confirming || !!error}>
            {confirming
              ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Confirmando...</>
              : '✅ Confirmar Pagamento'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
