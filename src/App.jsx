import { useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import useErrorStore from './store/errorStore'
import { onAuthError } from './services/api'

import ErrorModal from './components/ui/ErrorModal'
import Layout         from './components/layout/Layout'
import AdminPrivateRoute from './components/AdminPrivateRoute'
import { MASTER_MENU } from './components/layout/Sidebar'
import Login          from './pages/auth/Login'
import Register       from './pages/auth/Register'
import AdminLogin     from './pages/admin/AdminLogin'
import AdminRegister  from './pages/admin/AdminRegister'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminManagement from './pages/admin/AdminManagement'
import Dashboard      from './pages/Dashboard'
import Vehicles       from './pages/vehicles/Vehicles'
import Clients        from './pages/clients/Clients'
import Workshop       from './pages/workshop/Workshop'
import Finance        from './pages/finance/Finance'
import Products       from './pages/products/Products'
import Tables         from './pages/tables/Tables'
import Orders         from './pages/orders/Orders'
import PDV            from './pages/pdv/PDV'
import Users          from './pages/admin/Users'
import Settings       from './pages/admin/Settings'
import Sales          from './pages/sales/Sales'
import Bills          from './pages/bills/Bills'
import StockMovements from './pages/stock/StockMovements'
import GarcomView     from './pages/garcom/GarcomView'
import CozinhaView    from './pages/cozinha/CozinhaView'
import EntregadorView from './pages/entregador/EntregadorView'
import CaixaView      from './pages/caixa/CaixaView'
import Leads          from './pages/leads/Leads'

// Hotelaria
import Acomodacoes    from './pages/hospedagem/Acomodacoes'
import Reservas       from './pages/hospedagem/Reservas'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}
function PublicRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? <Navigate to="/" replace /> : children
}

function RouteGuard({ children, path }) {
  const tenant = useAuthStore(s => s.tenant)
  const papel = useAuthStore(s => s.papel)
  
  const tipo = tenant?.tipo || 'comercio'
  const papelLogado = papel || 'dono'

  const fullPath = path === '/' ? '/' : `/${path}`
  // Algumas rotas são declaradas múltiplas vezes no MASTER_MENU por causa de labels diferentes,
  // pegamos todas as definições que apontam pro mesmo destino:
  const menuItems = MASTER_MENU.filter(m => m.to === fullPath)
  
  if (menuItems.length === 0) return children // Permite acesso a rotas não rastreadas (ex: admin)

  const modulosAtivos = tenant?.config?.modulos_ativos || []

  const isAllowed = menuItems.some(item => {
    const isTypeAllowed = item.allowedTypes.includes('ALL') || item.allowedTypes.includes(tipo)
    const isRoleAllowed = item.allowedRoles.includes(papelLogado)
    const isModuleAllowed = !item.requiredModule || modulosAtivos.includes(item.requiredModule)
    return isTypeAllowed && isRoleAllowed && isModuleAllowed
  })

  if (!isAllowed) {
    return <Navigate to="/" replace />
  }

  return children
}

function TenantAdminRoute({ children }) {
  const { papel } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'
  
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}



function ErrorHandler() {
  const error = useErrorStore(s => s.error)
  const isVisible = useErrorStore(s => s.isVisible)
  const clearError = useErrorStore(s => s.clearError)
  const navigate = useNavigate()

  const handleAction = () => {
    if (error?.type === 'logout' || error?.type === 'auth_error') {
      useAuthStore.getState().logout()
      navigate('/login', { replace: true })
    }
    clearError()
  }

  return (
    <ErrorModal
      error={isVisible ? error : null}
      onClose={clearError}
      onAction={error?.type === 'logout' || error?.type === 'auth_error' ? handleAction : null}
      action={error?.type === 'logout' ? 'login' : 'retry'}
    />
  )
}

export default function App() {
  const tenant = useAuthStore(s => s.tenant)
  const user   = useAuthStore(s => s.user)
  const init   = useThemeStore(s => s.init)
  const showError = useErrorStore(s => s.showError)

  useEffect(() => {
    init(tenant?.id, user?.id)
  }, [tenant?.id, user?.id])

  // Configura os listeners de erro da API
  useEffect(() => {
    const unsubscribe = onAuthError((error) => {
      // Obtém a rota atual no momento do erro (suporta navegação SPA)
      const location = window.location?.pathname || ''
      // Evita mostrar modal de sessão expirada em rotas públicas de autenticação
      const publicPaths = ['/login', '/register', '/admin/login', '/admin/register']
      if (publicPaths.some(p => location.startsWith(p))) {
        // Em páginas públicas, não interrompe o fluxo do usuário com modais de auth
        console.debug('Auth error ignored on public path:', location, error)
        return
      }
      showError(error, true)
    })
    return unsubscribe
  }, [showError])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg3)', color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'Outfit, sans-serif', fontSize: 13,
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg3)' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg3)' } },
        }}
      />
      <ErrorHandler />
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminPrivateRoute><AdminDashboard /></AdminPrivateRoute>} />
        <Route path="/admin/management" element={<AdminPrivateRoute><AdminManagement /></AdminPrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index               element={<RouteGuard path="/"><Dashboard /></RouteGuard>} />
          <Route path="vehicles"     element={<RouteGuard path="vehicles"><Vehicles /></RouteGuard>} />
          <Route path="clients"      element={<RouteGuard path="clients"><Clients /></RouteGuard>} />
          <Route path="workshop"     element={<RouteGuard path="workshop"><Workshop /></RouteGuard>} />
          <Route path="finance"      element={<RouteGuard path="finance"><Finance /></RouteGuard>} />
          <Route path="bills"        element={<RouteGuard path="bills"><Bills /></RouteGuard>} />
          <Route path="products"     element={<RouteGuard path="products"><Products /></RouteGuard>} />
          <Route path="tables"       element={<RouteGuard path="tables"><Tables /></RouteGuard>} />
          <Route path="orders"       element={<RouteGuard path="orders"><Orders /></RouteGuard>} />
          <Route path="pdv"          element={<RouteGuard path="pdv"><PDV /></RouteGuard>} />
          <Route path="sales"        element={<RouteGuard path="sales"><Sales /></RouteGuard>} />
          <Route path="stock"        element={<RouteGuard path="stock"><StockMovements /></RouteGuard>} />
          <Route path="garcom"       element={<RouteGuard path="garcom"><GarcomView /></RouteGuard>} />
          <Route path="cozinha"      element={<RouteGuard path="cozinha"><CozinhaView /></RouteGuard>} />
          <Route path="entregas"     element={<RouteGuard path="entregas"><EntregadorView /></RouteGuard>} />
          <Route path="caixa"        element={<RouteGuard path="caixa"><CaixaView /></RouteGuard>} />
          <Route path="leads"        element={<RouteGuard path="leads"><Leads /></RouteGuard>} />
          
          {/* Módulos de Hospedagem */}
          <Route path="acomodacoes"  element={<RouteGuard path="acomodacoes"><Acomodacoes /></RouteGuard>} />
          <Route path="reservas"     element={<RouteGuard path="reservas"><Reservas /></RouteGuard>} />

          {/* Gerenciamento do Tenant (Dono/Gerente apenas) */}
          <Route path="gerenciamento/equipe"       element={<TenantAdminRoute><Users /></TenantAdminRoute>} />
          <Route path="gerenciamento/meu-negocio"  element={<TenantAdminRoute><Settings /></TenantAdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
