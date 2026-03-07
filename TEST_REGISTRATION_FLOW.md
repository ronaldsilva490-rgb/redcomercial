# Teste do Fluxo de Registro

## Problemas encontrados e corrigidos:

### 1. **Login.jsx - Endpoint incorreto**
- ❌ Antes: `api.post('/auth/login', ...)`
- ✅ Depois: `api.post('/api/auth/login', ...)`
- ❌ Antes: Salvava como `token` 
- ✅ Depois: Salva como `access_token` (compatível com authStore)

### 2. **Register.jsx - Issues de redirecionamento**
- ❌ Antes: Usava `window.location.href` imediatamente
- ✅ Depois: Usa `useNavigate()` com delay de 500ms
- ❌ Antes: Sem tratamento detalhado de erros
- ✅ Depois: Com console.log para debug e erros específicos

### 3. **Fluxo de registro agora é:**
1. POST `/api/auth/register` → Cria tenant + usuário
2. POST `/api/auth/login` → Faz login automático
3. Aguarda 500ms para sincronização de estado
4. Redireciona para `/` com `navigate()`
5. Se falhar, redireciona para `/login`

## Teste recomendado:

1. Abra DevTools (F12) → Console
2. Vá em `/register`
3. Preench o formulário:
   - Tipo de negócio: "restaurante"
   - Nome: "Teste Restaurant"
   - Email: "test123@example.com"
   - Senha: "senha123"
   - Confirmar: "senha123"
4. Clique em "Criar conta"
5. Observe no console:
   ```
   【REGISTER】 Iniciando registro com email: test123@example.com
   【REGISTER】 ✓ Usuário criado com sucesso
   【REGISTER】 Tentando fazer login automático...
   【REGISTER】 ✓ Login bem-sucedido
   【REGISTER】 Redirecionando para dashboard...
   ```

## Se ainda tiver problema:

- Verifique se backend está respondendo em `/api/auth/register`
- Verifique se a resposta contém o token em `data.data.access_token`
- Verifique localStorage → Application → Local Storage para confirmar que `access_token` está sendo salvo
- Verifique se há erro 401 ou 403 na aba Network

## Estrutura esperada da resposta de login:

```json
{
  "status": "success",
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "...",
      "email": "test123@example.com",
      "username": "..."
    },
    "tenant": {
      "id": "...",
      "nome": "Teste Restaurant",
      ...
    },
    "papel": "dono"
  }
}
```
