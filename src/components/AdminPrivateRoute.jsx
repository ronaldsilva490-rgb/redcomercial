import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import useAdminStore from '../store/adminStore'

export default function AdminPrivateRoute({ children }) {
  const token = useAdminStore(s => s.token)
  const verifyToken = useAdminStore(s => s.verifyToken)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    if (!token) {
      setVerified(false)
      setLoading(false)
      return
    }

    const result = await verifyToken()
    setVerified(result.ok)
    setLoading(false)
  }, [token, verifyToken])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.6)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#dc141e', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          Verificando acesso...
        </div>
      </div>
    )
  }

  if (!verified) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
