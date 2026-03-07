# Teste de Conexão com API

## Problema
O frontend está recebendo erro ao tentar obter os tipos de negócio do endpoint `/api/business/tipos`.

## Verificações Necessárias

### 1. Verificar variável de ambiente
```bash
# Confirme que o arquivo .env.local existe e contém:
VITE_API_URL=https://redbackend.fly.dev
```

### 2. Testar no Console do Navegador (F12)

Cole isto no console:
```javascript
// Teste 1: Verificar URL base
console.log('API URL:', import.meta.env.VITE_API_URL)

// Teste 2: Fazer requisição direta
fetch('https://redbackend.fly.dev/api/business/tipos')
  .then(r => {
    console.log('Status:', r.status)
    console.log('Headers:', r.headers)
    return r.json()
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err.message))

// Teste 3: Usar axios
import axios from 'axios'
const api = axios.create({ baseURL: 'https://redbackend.fly.dev' })
api.get('/api/business/tipos')
  .then(r => console.log('Tipos:', r.data))
  .catch(e => console.error('Erro:', e.message, e.response?.status))
```

### 3. Verificar Backend
No backend (Fly.io), verifique:
```bash
# Log do backend
fly logs -a red-backend

# Ou teste localmente
curl -v https://redbackend.fly.dev/api/business/tipos
```

### 4. CORS Issues
Se receber erro de CORS, verifique no `main.py` do backend:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ou especifique seu domínio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Solução Implementada

✅ O Register.jsx agora tem:
- **Logs detalhados** de erro
- **Fallback com tipos locais** caso a API falhe
- **Melhor tratamento de resposta** (suporta formatos diferentes)
- **Aviso visual** ao usuário se usar tipos padrão

## Próximos Passos

1. Acesse http://localhost:3000/register
2. Abra DevTools (F12)
3. Veja os logs exatos do erro
4. Verifique a resposta do backend
5. Compartilhe os logs para diagnóstico

