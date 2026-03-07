import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_type', data.user_type);
        
        if (data.user_type === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao conectar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Gradient Background com Logo Watermark */}
      <div className="login-gradient-bg">
        <svg className="login-logo-watermark" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <text x="100" y="110" textAnchor="middle" fontSize="80" fontWeight="bold" fill="currentColor">
            R
          </text>
        </svg>
      </div>

      {/* Card de Login */}
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">RED</h1>
          <p className="login-subtitle">Integrado. Inteligente. Seu negócio.</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p>RED System Corporation™</p>
        </div>
      </div>
    </div>
  );
}
