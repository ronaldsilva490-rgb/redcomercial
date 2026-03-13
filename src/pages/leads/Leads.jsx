import React, { useEffect, useState } from 'react'
import { Zap, Plus, Search, Filter, MoreVertical, Phone, Mail, User } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await api.get('/api/leads')
        setLeads(res.data.data || [])
      } catch (err) {
        toast.error("Erro ao carregar leads")
      } finally {
        setLoading(false)
      }
    }
    loadLeads()
  }, [])

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">GESTÃO DE LEADS (CRM)</h1>
          <p className="page-subtitle">Acompanhe seus potenciais compradores</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> Novo Lead
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', opacity: 0.6 }}>
            <Zap size={48} style={{ marginBottom: 16 }} />
            <p>Nenhum lead registrado. Comece a capturar oportunidades!</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Contato</th>
                <th>Origem</th>
                <th>Veículo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.nome}</td>
                  <td>
                    <span className={`badge badge-${lead.status === 'novo' ? 'blue' : 'green'}`}>
                      {lead.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {lead.telefone && <Phone size={14} title={lead.telefone} />}
                      {lead.email && <Mail size={14} title={lead.email} />}
                    </div>
                  </td>
                  <td>{lead.origem}</td>
                  <td>{lead.vehicles?.modelo || '—'}</td>
                  <td><MoreVertical size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
