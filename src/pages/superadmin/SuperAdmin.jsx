// Redirect legacy /superadmin route — agora usa SuperAdminLayout com rotas filhas
import { Navigate } from 'react-router-dom'
export default function SuperAdmin() { return <Navigate to="/superadmin" replace /> }
