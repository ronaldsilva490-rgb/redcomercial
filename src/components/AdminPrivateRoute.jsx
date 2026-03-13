import { Navigate } from 'react-router-dom'

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * Guard simples para rotas admin.
 * Lê admin_token do localStorage OU cookie (fallback para Chrome Mobile).
 * O backend valida o JWT em cada chamada real de API.
 */
export default function AdminPrivateRoute({ children }) {
  const token = localStorage.getItem('admin_token') || getCookie('admin_token')
  const admin = localStorage.getItem('admin_user') || getCookie('admin_user')

  // Se veio do cookie, restaura pro localStorage
  if (token && !localStorage.getItem('admin_token')) {
    localStorage.setItem('admin_token', token)
  }
  if (admin && !localStorage.getItem('admin_user')) {
    localStorage.setItem('admin_user', admin)
  }

  if (!token || !admin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
