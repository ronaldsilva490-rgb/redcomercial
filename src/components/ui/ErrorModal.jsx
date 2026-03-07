import { AlertCircle, X, Wifi, Clock, Lock, Server } from 'lucide-react'

const ERROR_TYPES = {
  'network': { icon: Wifi, title: 'Erro de Conexão', color: '#ff6b6b' },
  'timeout': { icon: Clock, title: 'Tempo Esgotado', color: '#ffa94d' },
  'auth': { icon: Lock, title: 'Erro de Autenticação', color: '#ff8787' },
  'server': { icon: Server, title: 'Erro do Servidor', color: '#dc141e' },
  'default': { icon: AlertCircle, title: 'Erro', color: '#ff6b6b' }
}

export default function ErrorModal({ error, onClose, action = 'retry', onAction }) {
  if (!error) return null

  const getErrorType = (err) => {
    if (!err) return 'default'
    if (typeof err === 'string') {
      if (err.includes('network') || err.includes('Network')) return 'network'
      if (err.includes('timeout') || err.includes('Timeout')) return 'timeout'
      if (err.includes('401') || err.includes('403')) return 'auth'
      if (err.includes('5')) return 'server'
    }
    if (err.code === 'ECONNABORTED') return 'timeout'
    if (err.message?.includes('Network')) return 'network'
    if (err.status === 401 || err.status === 403) return 'auth'
    if (err.status >= 500) return 'server'
    return 'default'
  }

  const getErrorMessage = (err) => {
    if (!err) return 'Erro desconhecido'
    if (typeof err === 'string') return err
    if (err.message) return err.message
    if (err.response?.data?.error) return err.response.data.error
    if (err.response?.statusText) return err.response.statusText
    return 'Algo deu errado. Tente novamente.'
  }

  const getErrorDetails = (err) => {
    if (!err) return null
    if (err.response?.status) return `Status: ${err.response.status}`
    if (err.code) return `Código: ${err.code}`
    return null
  }

  const type = getErrorType(error)
  const config = ERROR_TYPES[type] || ERROR_TYPES.default
  const Icon = config.icon
  const message = getErrorMessage(error)
  const details = getErrorDetails(error)

  const buttonLabels = {
    'retry': 'Tentar novamente',
    'login': 'Ir para login',
    'home': 'Voltar para início',
    'refresh': 'Atualizar página'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{
        background: 'rgba(20,20,20,0.95)',
        border: `2px solid ${config.color}`,
        borderRadius: 16,
        padding: '32px 28px',
        maxWidth: 450,
        width: '90%',
        boxShadow: `0 0 40px rgba(${parseInt(config.color.slice(1,3),16)}, ${parseInt(config.color.slice(3,5),16)}, ${parseInt(config.color.slice(5,7),16)}, 0.3)`,
        animation: 'slideUp 0.3s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon size={24} color={config.color} strokeWidth={2} />
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {config.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: 14,
          lineHeight: 1.6,
          margin: '0 0 12px 0',
          wordBreak: 'break-word',
        }}>
          {message}
        </p>

        {details && (
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            margin: '12px 0 0 0',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 12px',
            borderRadius: 8,
          }}>
            {details}
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 24,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.4)'
              e.target.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              e.target.style.background = 'transparent'
            }}
          >
            Fechar
          </button>
          {onAction && (
            <button
              onClick={onAction}
              style={{
                flex: 1,
                background: config.color,
                border: 'none',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.target.style.opacity = 0.8}
              onMouseLeave={e => e.target.style.opacity = 1}
            >
              {buttonLabels[action] || 'Tentar novamente'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
