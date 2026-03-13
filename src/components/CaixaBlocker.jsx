import { useEffect, useState, useCallback } from 'react'
import { Lock } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import CaixaSessao from '../pages/caixa/CaixaSessao'

export default function CaixaBlocker({ children }) {
  const { papel } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [caixaAberto, setCaixaAberto] = useState(false)

  const isManager = ['dono', 'gerente'].includes(papel)

  const checkCaixa = useCallback(async () => {
    try {
      const { data } = await api.get('/api/caixa/sessao')
      const sessaoData = data.data || data
      setCaixaAberto(!!sessaoData.aberto)
    } catch {
      setCaixaAberto(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkCaixa()
    
    // Polling a cada 30 segundos para checar se alguém fechou o caixa em outro terminal
    const interval = setInterval(checkCaixa, 30000)
    return () => clearInterval(interval)
  }, [checkCaixa])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mr-3"></div>
        Verificando status do caixa...
      </div>
    )
  }

  if (caixaAberto) {
    return children
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(220, 20, 30, 0.3)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(220, 20, 30, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Lock size={32} color="#dc141e" />
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text)' }}>
          Caixa Fechado
        </h2>
        
        <p style={{ color: 'var(--dim)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Para registrar vendas, comandas ou gerenciar delivery, é necessário
          iniciar o expediente financeiro antes.
        </p>

        {isManager ? (
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Módulo Administrativo Rápido:</span>
              </div>
              <CaixaSessao embedded={true} />
            </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.2rem' }}>Sem permissão</strong>
            <span style={{ fontSize: '13px', color: 'var(--dim)' }}>
              Apenas gerentes e administradores podem abrir o caixa.
              Peça autorização para iniciar o expediente.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
