/**
 * Users.jsx — Gestão de funcionários.
 * Suporte a username (sem @email) ou email.
 * Verifica disponibilidade do username em tempo real.
 * Papéis filtrados por tipo de negócio.
 */
import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Shield, UserCheck, UserX, AtSign, Check, X, Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export const PAPEL_CONFIG = {
  dono:        { label: 'Dono',        color: '#E8192C', emoji: '👑' },
  gerente:     { label: 'Gerente',     color: '#F59E0B', emoji: '🏷️' },
  vendedor:    { label: 'Vendedor',    color: '#3B82F6', emoji: '🛒' },
  caixa:       { label: 'Caixa',       color: '#22C55E', emoji: '💰' },
  garcom:      { label: 'Garçom',      color: '#F97316', emoji: '🍽️' },
  cozinheiro:  { label: 'Cozinheiro',  color: '#A78BFA', emoji: '🍳' },
  entregador:  { label: 'Entregador',  color: '#06B6D4', emoji: '🛵' },
  mecanico:    { label: 'Mecânico',    color: '#8B5CF6', emoji: '🔧' },
}

const PAPEIS_POR_TIPO = {
  concessionaria: ['gerente', 'vendedor', 'mecanico'],
  restaurante:    ['gerente', 'caixa', 'garcom', 'cozinheiro', 'entregador'],
  comercio:       ['gerente', 'caixa', 'vendedor', 'entregador'],
}

const PAPEL_DESC = {
  gerente:    'Acesso completo, exceto conta principal',
  vendedor:   'PDV, clientes e produtos',
  caixa:      'Pedidos, cobranças, delivery e chamada de garçom',
  garcom:     'Mesas, comandas, envio para cozinha e pagamentos',
  cozinheiro: 'Fila da cozinha — aceita, prepara e finaliza itens',
  entregador: 'Pedidos delivery — marca saindo e entregue',
  mecanico:   'Ordens de serviço da oficina',
}

export default function Users() {
  const { tenant, papel: meuPapel } = useAuthStore()
  const tipo   = tenant?.tipo || 'comercio'
  const papeis = PAPEIS_POR_TIPO[tipo] || ['gerente', 'vendedor']

  const [users,          setUsers]          = useState([])
  const [myUnits,        setMyUnits]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [modal,          setModal]          = useState(false)
  const [form,           setForm]           = useState({ login: '', password: '', papel: papeis[0], units: [] })
  const [saving,         setSaving]         = useState(false)
  const [showPw,         setShowPw]         = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [checkTimer,     setCheckTimer]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [resUsers, resUnits] = await Promise.all([
        api.get('/api/tenants/users'),
        api.get('/api/tenants/my-units').catch(() => ({ data: { data: [] } }))
      ])
      setUsers(resUsers.data.data || [])
      setMyUnits(resUnits?.data?.data || [])
    } catch { toast.error("Oops! Não consegui buscar funcionários. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = () => {
    setForm({ login: '', password: '', papel: papeis[0], units: [tenant?.id] })
    setUsernameStatus(null)
    setShowPw(false)
    setModal(true)
  }

  // Verifica username em tempo real (com debounce 600ms)
  const handleLoginChange = (val) => {
    // Remove espaços, converte pra minúsculo e tira caracteres inválidos
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    set('login', cleanVal)

    if (cleanVal.length < 3) {
      setUsernameStatus(null)
      return
    }

    setUsernameStatus('checking')
    if (checkTimer) clearTimeout(checkTimer)
    setCheckTimer(setTimeout(async () => {
      try {
        const cleanSlug = tenant?.slug?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "") || ''
        const fullUsername = `${cleanVal}@${cleanSlug}.red.internal`
        const { data } = await api.post('/api/tenants/check-username', { username: fullUsername })
        setUsernameStatus(data.data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus(null)
      }
    }, 600))
  }

  const handleSave = async () => {
    if (!form.login || !form.password) return toast.error('Crie um login e senha para essa pessoa, por favor! 🔑')
    if (form.password.length < 6) return toast.error('A senha é super secreta! Precisa ter no mínimo 6 caracteres 🔐')
    if (usernameStatus === 'taken') return toast.error('Putz, esse username já tem dono! Tente outro 😅')
    if (usernameStatus === 'invalid') return toast.error('Nome de usuário inválido')

    setSaving(true)
    try {
      const cleanSlug = tenant?.slug?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "") || ''
      await api.post('/api/tenants/users/invite', {
        login:    `${form.login}@${cleanSlug}.red.internal`,
        password: form.password,
        papel:    form.papel,
        units:    form.units,
      })
      toast.success('Novo membro do time cadastrado com sucesso! 🎉')
      setModal(false)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao cadastrar')
    } finally { setSaving(false) }
  }

  const handleToggleAtivo = async (userId, atualAtivo) => {
    try {
      await api.patch(`/api/tenants/users/${userId}`, { ativo: !atualAtivo })
      toast.success(atualAtivo ? 'Acesso suspenso' : 'Acesso reativado')
      await load()
    } catch { toast.error('Erro ao atualizar') }
  }

  const handleChangePapel = async (userId, newPapel) => {
    try {
      await api.patch(`/api/tenants/users/${userId}`, { papel: newPapel })
      toast.success('O cargo desse usuário acabou de ser alterado! 🛠️')
      await load()
    } catch { toast.error("Vixe... não consegui salvar a alteração em papel 😕") }
  }

  const isAdmin = meuPapel === 'dono' || meuPapel === 'gerente'
  const isUsername = form.login && !form.login.includes('@')

  const loginStatusIcon = () => {
    if (!form.login || form.login.length < 3) return null
    if (usernameStatus === 'checking') return <div className="spinner" style={{ width: 14, height: 14 }} />
    if (usernameStatus === 'available') return <Check size={14} color="var(--green)" />
    if (usernameStatus === 'taken') return <X size={14} color="var(--red)" />
    if (usernameStatus === 'invalid') return <X size={14} color="var(--yellow)" />
    return null
  }

  const loginStatusMsg = () => {
    if (!form.login) return null
    if (usernameStatus === 'available') return { text: 'Disponível', color: 'var(--green)' }
    if (usernameStatus === 'taken')     return { text: 'Já está em uso', color: 'var(--red)' }
    if (usernameStatus === 'invalid')   return { text: 'Só letras, números, ponto, traço ou underline', color: 'var(--yellow)' }
    if (usernameStatus === 'checking')  return { text: 'Verificando...', color: 'var(--muted)' }
    return null
  }

  const statusMsg = loginStatusMsg()

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Funcionários</div>
          <div className="page-subtitle">{users.length} cadastrado(s)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /></button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openModal}>
              <Plus size={14} /> Novo Funcionário
            </button>
          )}
        </div>
      </div>

      {/* Tipo de negócio */}
      <div style={{ marginBottom: 20, padding: '10px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={13} color="var(--red)" />
        Tipo de negócio: <strong style={{ color: 'var(--dim)' }}>
          {tipo === 'restaurante' ? 'Restaurante / Bar' : tipo === 'concessionaria' ? 'Concessionária' : 'Comércio'}
        </strong>
        · Papéis disponíveis: {papeis.map(p => PAPEL_CONFIG[p]?.label).join(', ')}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuário / Login</th>
                <th>Papel</th>
                <th>Status</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const pc = PAPEL_CONFIG[u.papel] || { label: u.papel, color: 'var(--muted)', emoji: '👤' }
                const isDono = u.papel === 'dono'
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                        {u.display_login || u.username || u.email || '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <AtSign size={9} /> acesso de loja exclusivo
                      </div>
                    </td>
                    <td>
                      {isAdmin && !isDono ? (
                        <select
                          value={u.papel}
                          onChange={e => handleChangePapel(u.user_id, e.target.value)}
                          style={{
                            background: 'var(--bg3)', border: '1px solid var(--border)',
                            borderRadius: 7, color: pc.color,
                            padding: '4px 8px', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                          }}>
                          {papeis.map(p => (
                            <option key={p} value={p}>{PAPEL_CONFIG[p]?.emoji} {PAPEL_CONFIG[p]?.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: pc.color, fontWeight: 700 }}>
                          {pc.emoji} {pc.label}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                        background: u.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                        color: u.ativo ? 'var(--green)' : 'var(--muted)',
                        border: `1px solid ${u.ativo ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                      }}>
                        {u.ativo ? '● Ativo' : '○ Suspenso'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        {!isDono && (
                          <button
                            onClick={() => handleToggleAtivo(u.user_id, u.ativo)}
                            title={u.ativo ? 'Suspender acesso' : 'Reativar acesso'}
                            style={{
                              background: 'none', border: '1px solid var(--border)',
                              borderRadius: 7, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: 5, padding: '5px 10px',
                              color: u.ativo ? 'var(--red)' : 'var(--green)',
                              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                              transition: 'all 0.15s',
                            }}>
                            {u.ativo ? <><UserX size={12} /> Suspender</> : <><UserCheck size={12} /> Reativar</>}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="empty-state" style={{ padding: 32 }}>
              <Shield size={36} style={{ opacity: 0.3 }} />
              <p>Nenhum funcionário cadastrado</p>
            </div>
          )}
        </div>
      )}

      {/* Modal novo funcionário */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo Funcionário</span>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Login */}
              <div>
                <label className="label">Acesso do Funcionário *</label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      className="input"
                      value={form.login}
                      onChange={e => handleLoginChange(e.target.value)}
                      placeholder="nome.sobrenome"
                      autoFocus
                      autoComplete="off"
                      style={{ 
                        paddingRight: 36, 
                        borderTopRightRadius: 0, 
                        borderBottomRightRadius: 0,
                      }}
                    />
                    {loginStatusIcon() && (
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                        {loginStatusIcon()}
                      </div>
                    )}
                  </div>
                  <div style={{
                    border: '1px solid var(--border)',
                    borderTopRightRadius: 10,
                    padding: '0 16px', 
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center',
                    color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600,
                  }}>
                    @{tenant?.slug?.replace(/-/g, '')}
                  </div>
                </div>
                {statusMsg && (
                  <div style={{ fontSize: 11, color: statusMsg.color, marginTop: 4 }}>{statusMsg.text}</div>
                )}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                  O usuário fará login no painel digitando: <strong style={{ color: '#dc141e' }}>{form.login || 'nome'}@{tenant?.slug?.replace(/-/g, '')}</strong>
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="label">Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password && form.password.length < 6 && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Mínimo 6 caracteres</div>
                )}
              </div>

              {/* Papel */}
              <div>
                <label className="label">Papel *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {papeis.map(p => {
                    const pc = PAPEL_CONFIG[p]
                    return (
                      <button key={p}
                        onClick={() => set('papel', p)}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                          background: form.papel === p ? 'var(--red-glow)' : 'var(--bg3)',
                          border: `1.5px solid ${form.papel === p ? 'var(--red-border)' : 'var(--border)'}`,
                          textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <div style={{ fontSize: 16, marginBottom: 2 }}>{pc?.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: form.papel === p ? pc?.color : 'var(--dim)' }}>{pc?.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>{PAPEL_DESC[p]}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Seleção de Múltiplas Lojas (Se houver > 1) */}
              {myUnits.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <label className="label">Vincular às Lojas (Multi-Filial)</label>
                  <div style={{ 
                    marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
                    maxHeight: 120, overflowY: 'auto', paddingRight: 6
                  }}>
                    {myUnits.map(t => {
                      const isChecked = form.units.includes(t.id)
                      return (
                        <label key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          borderRadius: 8, cursor: 'pointer',
                          background: isChecked ? 'rgba(220,20,30,0.06)' : 'var(--bg3)',
                          border: `1px solid ${isChecked ? 'rgba(220,20,30,0.4)' : 'var(--border)'}`,
                          transition: 'all 0.2s'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                set('units', [...form.units, t.id])
                              } else {
                                if (t.id === tenant?.id) {
                                  toast.error("O funcionário precisa estar vinculado à loja atual!")
                                  return
                                }
                                set('units', form.units.filter(id => id !== t.id))
                              }
                            }}
                            style={{ accentColor: 'var(--red)', width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? 'var(--text)' : 'var(--dim)' }}>{t.nome}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Loja do tipo: {t.tipo.replace('_', ' ')}</div>
                          </div>
                          {t.id === tenant?.id && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--red-glow)', padding: '2px 8px', borderRadius: 10 }}>Atual</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || (form.password && form.password.length < 6)}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Criando...</> : '+ Criar Funcionário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
