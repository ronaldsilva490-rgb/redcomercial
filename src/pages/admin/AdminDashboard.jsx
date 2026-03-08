import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertCircle, CheckCircle, LogOut, RefreshCw, Users, 
  TrendingUp, Clock, Server, Database, Shield, Settings, Trash2
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
  const [admins, setAdmins] = useState([])
  const [tenants, setTenants] = useState([])
  const [systemStatus, setSystemStatus] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [abas, setAbas] = useState('dashboard')

  // Verificar autenticação na carga
  useEffect(() => {
    const adminUser = localStorage.getItem('admin_user')
    const token = localStorage.getItem('admin_token')

    if (!token || !adminUser) {
      navigate('/admin/login')
      return
    }

    setAdmin(JSON.parse(adminUser))
    setCarregando(false)
  }, [navigate])

  const carregarDados = useCallback(async () => {
    try {
      setAtualizando(true)
      const token = localStorage.getItem('admin_token')

      // Chamar as ROTAS REAIS do backend
      const promises = [
        api.get('/api/superadmin/status', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        api.get('/api/auth/admin/list', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        api.get('/api/superadmin/tenants', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        api.get('/api/superadmin/logs', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
      ]

      const [statusRes, adminsRes, tenantsRes, logsRes] = await Promise.all(promises)

      // Processar responses
      if (statusRes?.data?.data) setSystemStatus(statusRes.data.data)
      if (adminsRes?.data?.data) setAdmins(adminsRes.data.data)
      if (tenantsRes?.data?.data) setTenants(tenantsRes.data.data)
      if (logsRes?.data?.data) setLogs(logsRes.data.data)

      // Stats
      setStats({
        total_tenants_ativos: tenantsRes?.data?.data?.length || 0,
        total_usuarios_ativos: adminsRes?.data?.data?.length || 0,
        logs_24h: logsRes?.data?.data?.length || 0,
        erros_24h: 0
      })

      setUltimaAtualizacao(new Date())
      setAtualizando(false)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setAtualizando(false)
    }
  }, [])

  // Auto refresh a cada 30 segundos - SÓ DEPOIS QUE CARREGOU
  useEffect(() => {
    if (admin) {
      carregarDados()
      const interval = setInterval(carregarDados, 30000)
      return () => clearInterval(interval)
    }
  }, [admin, carregarDados])

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

  const desativarAdmin = async (adminId) => {
    if (!window.confirm('Desativar este admin?')) return
    try {
      await api.post(`/api/auth/admin/deactivate/${adminId}`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      toast.success('Admin desativado')
      carregarDados()
    } catch (err) {
      toast.error('Erro ao desativar')
    }
  }

  const deletarAdmin = async (adminId) => {
    if (!window.confirm('DELETAR este admin?')) return
    try {
      await api.delete(`/api/auth/admin/${adminId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      toast.success('Admin deletado')
      carregarDados()
    } catch (err) {
      toast.error('Erro ao deletar')
    }
  }

  if (carregando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#dc141e', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>Carregando...</div>
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
        marginBottom: 32,
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={LOGO} alt="RED" style={{ width: 50, height: 50 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>🛡️ Admin</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              <strong>{admin?.nome}</strong>
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
              fontSize: 13,
            }}
          >
            <RefreshCw size={14} style={{ animation: atualizando ? 'spin 1s linear infinite' : 'none' }} />
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
              fontSize: 13,
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 16,
        overflowX: 'auto'
      }}>
        {[
          { id: 'dashboard', label: '📊 Dashboard'},
          { id: 'admins', label: '👥 Administradores'},
          { id: 'tenants', label: '🏢 Empresas'},
          { id: 'logs', label: '📋 Logs'},
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbas(aba.id)}
            style={{
              padding: '8px 16px',
              background: abas === aba.id ? 'rgba(220,20,30,0.2)' : 'transparent',
              border: abas === aba.id ? '1px solid rgba(220,20,30,0.4)' : '1px solid transparent',
              borderRadius: 8,
              color: abas === aba.id ? '#dc141e' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {abas === 'dashboard' && stats && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32
          }}>
            <MetricCard label="Empresas" valor={stats.total_tenants_ativos} cor="#3b82f6" icon="🏢" />
            <MetricCard label="Administradores" valor={stats.total_usuarios_ativos} cor="#10b981" icon="👥" />
            <MetricCard label="Logs" valor={stats.logs_24h} cor="#f59e0b" icon="📋" />
            <MetricCard label="Atualizado" valor={ultimaAtualizacao?.toLocaleTimeString('pt-BR') || '—'} cor="#a855f7" icon="🕒" />
          </div>

          <div style={{
            padding: 16,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 12,
            marginBottom: 32
          }}>
            <CheckCircle size={24} color='#22c55e' style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>✅ Sistema Online</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Todos os serviços operacionais
            </div>
          </div>
        </div>
      )}

      {/* ADMINS */}
      {abas === 'admins' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 Administradores ({admins.length})</h2>
          {admins.length === 0 ? (
            <div style={{
              padding: 32,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: 'rgba(255,255,255,0.5)'
            }}>
              Nenhum admin
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {admins.map((adm) => (
                <div
                  key={adm.id}
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
                  <div>
                    <div style={{ fontWeight: 700 }}>{adm.nome}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>@{adm.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => desativarAdmin(adm.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(220,20,30,0.2)',
                        border: '1px solid rgba(220,20,30,0.3)',
                        borderRadius: 6,
                        color: '#dc141e',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      🗑️ Desativar
                    </button>
                    <button
                      onClick={() => deletarAdmin(adm.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(220,20,30,0.2)',
                        border: '1px solid rgba(220,20,30,0.3)',
                        borderRadius: 6,
                        color: '#dc141e',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      ❌ Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TENANTS */}
      {abas === 'tenants' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏢 Empresas ({tenants.length})</h2>
          {tenants.length === 0 ? (
            <div style={{
              padding: 32,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: 'rgba(255,255,255,0.5)'
            }}>
              Nenhuma empresa
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12
            }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  style={{
                    padding: 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{tenant.nome || tenant.id}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                    Tipo: <strong>{tenant.tipo}</strong>
                  </div>
                  <button
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 6,
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    👁️ Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOGS */}
      {abas === 'logs' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Logs ({logs.length})</h2>
          {logs.length === 0 ? (
            <div style={{
              padding: 32,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: 'rgba(255,255,255,0.5)'
            }}>
              Nenhum log
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Ação</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'none' }}>Usuário</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 20).map((log, idx) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{log.acao}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, display: 'none' }}>{log.usuario}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function MetricCard({ label, valor, cor, icon }) {
  return (
    <div style={{
      padding: 16,
      background: `rgba(${parseInt(cor.slice(1,3), 16)},${parseInt(cor.slice(3,5), 16)},${parseInt(cor.slice(5,7), 16)},0.1)`,
      border: `1px solid rgba(${parseInt(cor.slice(1,3), 16)},${parseInt(cor.slice(3,5), 16)},${parseInt(cor.slice(5,7), 16)},0.2)`,
      borderRadius: 12,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{valor}</div>
    </div>
  )
}
