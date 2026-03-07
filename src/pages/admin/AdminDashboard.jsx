import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertCircle, CheckCircle, LogOut, RefreshCw, Zap,
  Users, TrendingUp, Clock, Server, Database, Globe, BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [servicos, setServicos] = useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)

  // Verificar autenticação na carga
  useEffect(() => {
    const verificarAuth = () => {
      const adminUser = localStorage.getItem('admin_user')
      const token = localStorage.getItem('admin_token')

      if (!token || !adminUser) {
        navigate('/admin/login')
        return
      }

      setAdmin(JSON.parse(adminUser))
      setCarregando(false)
      carregarDados()
    }

    verificarAuth()
  }, [navigate])

  // Auto refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(carregarDados, 30000)
    return () => clearInterval(interval)
  }, [])

  const carregarDados = async () => {
    try {
      setAtualizando(true)
      const token = localStorage.getItem('admin_token')

      // Simular carregamento de stats
      const statsData = {
        total_tenants_ativos: 12,
        tenants_restaurantes: 5,
        tenants_concessionarias: 4,
        tenants_comercios: 3,
        total_usuarios_ativos: 48,
        logs_24h: 342,
        erros_24h: 8
      }

      // Simular logs
      const logsData = [
        { id: 1, acao: 'login', admin: 'admin', timestamp: new Date(), status: 'sucesso' },
        { id: 2, acao: 'criar_usuario', admin: 'admin', timestamp: new Date(Date.now() - 60000), status: 'sucesso' },
        { id: 3, acao: 'deletar_sessao', admin: 'admin', timestamp: new Date(Date.now() - 300000), status: 'erro' }
      ]

      // Simular serviços
      const servicosData = [
        { nome: 'API Backend', status: 'online', latencia: 45, url: 'https://redbackend.fly.dev' },
        { nome: 'Frontend', status: 'online', latencia: 120, url: 'https://redcomercialweb.vercel.app' },
        { nome: 'Banco de Dados', status: 'online', latencia: 28, url: 'Supabase PostgreSQL' },
        { nome: 'Serviço de Email', status: 'offline', latencia: null, url: 'SendGrid' }
      ]

      setStats(statsData)
      setLogs(logsData)
      setServicos(servicosData)
      setUltimaAtualizacao(new Date())
      setAtualizando(false)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setAtualizando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    toast.success('Desconectado com sucesso')
    navigate('/admin/login')
  }

  const handleRefresh = async () => {
    setAtualizando(true)
    await carregarDados()
  }

  if (carregando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#dc141e', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>Carregando dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={LOGO} alt="RED" style={{ width: 50, height: 50 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Painel Admin</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Bem-vindo, <strong>{admin?.nome}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRefresh}
            disabled={atualizando}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} style={{ animation: atualizando ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'rgba(220,20,30,0.2)',
              border: '1px solid rgba(220,20,30,0.3)',
              borderRadius: 8,
              color: '#dc141e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Topo com status e última atualização */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Card Status Geral */}
        <div style={{
          padding: 16,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <CheckCircle size={24} color='#22c55e' />
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Status</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Sistema Online</div>
          </div>
        </div>

        {/* Card Última Atualização */}
        <div style={{
          padding: 16,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Última Atualização</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {ultimaAtualizacao ? ultimaAtualizacao.toLocaleTimeString('pt-BR') : '—'}
          </div>
        </div>

        {/* Card Versão */}
        <div style={{
          padding: 16,
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Versão</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>RED v5.0</div>
        </div>
      </div>

      {/* Métricas Principais */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32
        }}>
          <MetricCard
            icon={<Users size={20} />}
            label="Empresas Ativas"
            valor={stats.total_tenants_ativos}
            cor="#3b82f6"
          />
          <MetricCard
            icon={<TrendingUp size={20} />}
            label="Usuários Ativos"
            valor={stats.total_usuarios_ativos}
            cor="#10b981"
          />
          <MetricCard
            icon={<Activity size={20} />}
            label="Logs (24h)"
            valor={stats.logs_24h}
            cor="#f59e0b"
          />
          <MetricCard
            icon={<AlertCircle size={20} />}
            label="Erros (24h)"
            valor={stats.erros_24h}
            cor="#ef4444"
          />
        </div>
      )}

      {/* Health Check dos Serviços */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={20} /> Saúde dos Serviços
        </h2>

        <div style={{
          display: 'grid',
          gap: 12
        }}>
          {servicos.map((srv) => (
            <div
              key={srv.nome}
              style={{
                padding: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {srv.status === 'online' ? (
                  <CheckCircle size={20} color='#22c55e' />
                ) : (
                  <AlertCircle size={20} color='#ef4444' />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{srv.nome}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{srv.url}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {srv.latencia && (
                  <div style={{
                    padding: '4px 12px',
                    background: srv.latencia > 100 ? 'rgba(251, 146, 60, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    border: srv.latencia > 100 ? '1px solid rgba(251, 146, 60, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Clock size={12} />
                    {srv.latencia}ms
                  </div>
                )}
                <div style={{
                  padding: '4px 12px',
                  background: srv.status === 'online' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: srv.status === 'online' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: srv.status === 'online' ? '#22c55e' : '#ef4444'
                }}>
                  {srv.status === 'online' ? '● Online' : '● Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Recentes */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={20} /> Logs Recentes
        </h2>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Ação</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Administrador</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Horário</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: idx < logs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13 }}><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{log.acao}</code></td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{log.admin}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: log.status === 'sucesso' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: log.status === 'sucesso' ? '#22c55e' : '#ef4444'
                    }}>
                      {log.status === 'sucesso' ? '✓' : '✕'} {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
                    {log.timestamp.toLocaleTimeString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function MetricCard({ icon, label, valor, cor }) {
  return (
    <div style={{
      padding: 20,
      background: `rgba(${cor.slice(1).match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.1)`,
      border: `1px solid rgba(${cor.slice(1).match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.2)`,
      borderRadius: 12,
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, opacity: 0.7 }}>
        {icon}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
        {valor}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
        {label}
      </div>
    </div>
  )
}
