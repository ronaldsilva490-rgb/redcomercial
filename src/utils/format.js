// Formata valor para BRL
export const formatMoney = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

// Formata data DD/MM/YYYY
export const formatDate = (str) => {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

// Labels de status
export const statusLabel = {
  disponivel:      'Disponível',
  reservado:       'Reservado',
  vendido:         'Vendido',
  consignado:      'Consignado',
  aberta:          'Aberta',
  em_andamento:    'Em Andamento',
  aguardando_peca: 'Aguard. Peça',
  concluida:       'Concluída',
  cancelada:       'Cancelada',
  novo:            'Novo',
  contato:         'Contato',
  negociando:      'Negociando',
  fechado:         'Fechado',
  perdido:         'Perdido',
}

export const statusBadge = {
  disponivel:      'badge-green',
  reservado:       'badge-yellow',
  vendido:         'badge-gray',
  consignado:      'badge-purple',
  aberta:          'badge-blue',
  em_andamento:    'badge-yellow',
  aguardando_peca: 'badge-yellow',
  concluida:       'badge-green',
  cancelada:       'badge-red',
  novo:            'badge-blue',
  contato:         'badge-blue',
  negociando:      'badge-yellow',
  fechado:         'badge-green',
  perdido:         'badge-gray',
}

// Trunca string
export const truncate = (str, n = 30) =>
  str && str.length > n ? str.slice(0, n) + '…' : (str || '—')
