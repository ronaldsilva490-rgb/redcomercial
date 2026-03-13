import { useState } from 'react'
import api from '../../services/api'

export default function ApiTest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testEndpoints = async () => {
    setLoading(true)
    setResult('Testando endpoints...\n')
    
    try {
      // Teste 1: Health Check
      setResult(prev => prev + '1. Teste Health: ')
      const health = await fetch('https://redbackend.fly.dev/health').catch(() => null)
      setResult(prev => prev + (health ? `✓ ${health.status}\n` : '✗ Falhou\n'))

      // Teste 2: Business Tipos com axios
      setResult(prev => prev + '2. Teste /api/business/tipos: ')
      const tipos = await api.get('/api/business/tipos').catch(e => {
        console.error('Erro:', e)
        return { error: true, message: e.message, status: e.response?.status }
      })
      setResult(prev => prev + (tipos.error 
        ? `✗ Status ${tipos.status}: ${tipos.message}\n` 
        : `✓ ${tipos.data.length || 'N/A'} tipos\n`))

      // Teste 3: Direto com fetch
      setResult(prev => prev + '3. Teste direto (fetch): ')
      const fetchRes = await fetch('https://redbackend.fly.dev/api/business/tipos')
      setResult(prev => prev + `✓ Status ${fetchRes.status}\n`)
      const json = await fetchRes.json()
      setResult(prev => prev + `   Resposta: ${JSON.stringify(json).substring(0, 100)}...\n`)

      // Teste 4: API Info
      setResult(prev => prev + `4. API Base URL: ${api.defaults.baseURL}\n`)
      setResult(prev => prev + `5. Timeout: ${api.defaults.timeout}ms\n`)
      
    } catch (err) {
      setResult(prev => prev + `\nErro geral: ${err.message}\n`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #050202 100%)',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
      padding: '40px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>🔧 Teste de Conexão API</h1>

        <button
          onClick={testEndpoints}
          disabled={loading}
          style={{
            background: loading ? 'rgba(220,20,30,0.4)' : 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 20,
          }}
        >
          {loading ? 'Testando...' : 'Testar Conexão'}
        </button>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 20,
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          height: 400,
          overflowY: 'auto',
          color: 'rgba(255,255,255,0.8)',
        }}>
          {result || 'Clique em "Testar Conexão" para começar'}
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <p>URL: https://redbackend.fly.dev</p>
          <p>Endpoint: /api/business/tipos</p>
        </div>
      </div>

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(220,20,30,0.4);
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
