import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'

import Layout         from './components/layout/Layout'
import Login          from './pages/auth/Login'
import Register       from './pages/auth/Register'
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
import AIAgent           from './pages/superadmin/AIAgent'
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

export default function App() {
  const tenant = useAuthStore(s => s.tenant)
  const init   = useThemeStore(s => s.init)

  useEffect(() => {
    init(tenant?.id)
  }, [tenant?.id, init])

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
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
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
          <Route path="ai"          element={<AIAgent />} />
          <Route path="db"          element={<DBExplorer />} />
          <Route path="deploy"      element={<DeployControl />} />
          <Route path="logs"        element={<Logs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
