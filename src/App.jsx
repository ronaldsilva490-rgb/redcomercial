import { useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import useErrorStore from './store/errorStore'
import { onAuthError } from './services/api'

import ErrorModal from './components/ui/ErrorModal'
import Layout         from './components/layout/Layout'
import AdminPrivateRoute from './components/AdminPrivateRoute'
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
import CaixaSessao    from './pages/caixa/CaixaSessao'
import SuperAdminLayout  from './components/layout/SuperAdminLayout'
import SystemStatus      from './pages/superadmin/SystemStatus'
import TenantsOverview   from './pages/superadmin/TenantsOverview'
import DBExplorer        from './pages/superadmin/DBExplorer'
import DeployControl     from './pages/superadmin/DeployControl'
import Logs              from './pages/superadmin/Logs'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}
function PublicRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? <Navigate to="/" replace /> : children
}

function LogoutMonitor() {
  const navigate = useNavigate()
  
  useEffect(() => {
    const checkLogout = () => {
      if (localStorage.getItem('force_logout') === 'true') {
        localStorage.removeItem('force_logout')
        navigate('/login', { replace: true })
      }
    }

    checkLogout()
    const interval = setInterval(checkLogout, 500)
    return () => clearInterval(interval)
  }, [navigate])

  return null
}

function ErrorHandler() {
  const error = useErrorStore(s => s.error)
  const isVisible = useErrorStore(s => s.isVisible)
  const clearError = useErrorStore(s => s.clearError)
  const navigate = useNavigate()

  const handleAction = () => {
    if (error?.type === 'logout') {
      navigate('/login', { replace: true })
    } else if (error?.type === 'auth_error' || error?.type === 'forbidden') {
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
  const init   = useThemeStore(s => s.init)
  const showError = useErrorStore(s => s.showError)

  useEffect(() => {
    init(tenant?.id)
  }, [tenant?.id])

  // Configura os listeners de erro da API
  useEffect(() => {
    const unsubscribe = onAuthError((error) => {
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
      <LogoutMonitor />
      <ErrorHandler />
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminPrivateRoute><AdminDashboard /></AdminPrivateRoute>} />
        <Route path="/admin/management" element={<AdminPrivateRoute><AdminManagement /></AdminPrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index               element={<Dashboard />} />
          <Route path="vehicles"     element={<Vehicles />} />
          <Route path="clients"      element={<Clients />} />
          <Route path="workshop"     element={<Workshop />} />
          <Route path="finance"      element={<Finance />} />
          <Route path="bills"        element={<Bills />} />
          <Route path="products"     element={<Products />} />
          <Route path="tables"       element={<Tables />} />
          <Route path="orders"       element={<Orders />} />
          <Route path="pdv"          element={<PDV />} />
          <Route path="sales"        element={<Sales />} />
          <Route path="stock"        element={<StockMovements />} />
          <Route path="garcom"       element={<GarcomView />} />
          <Route path="cozinha"      element={<CozinhaView />} />
          <Route path="entregas"     element={<EntregadorView />} />
          <Route path="caixa"        element={<CaixaView />} />
          <Route path="sessao-caixa" element={<CaixaSessao />} />
          <Route path="admin/users"    element={<Users />} />
          <Route path="admin/settings" element={<Settings />} />
        </Route>
        {/* Superadmin — layout próprio, sem menus de empresa */}
        <Route path="/superadmin" element={<PrivateRoute><SuperAdminLayout /></PrivateRoute>}>
          <Route index              element={<SystemStatus />} />
          <Route path="empresas"    element={<TenantsOverview />} />
          <Route path="db"          element={<DBExplorer />} />
          <Route path="deploy"      element={<DeployControl />} />
          <Route path="logs"        element={<Logs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
