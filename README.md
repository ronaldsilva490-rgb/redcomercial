# Red Comercial (Frontend)

Este é o frontend da aplicação **Red Comercial**, uma Single Page Application (SPA) reativa construída com React e Vite.

## 🚀 Tecnologias Essenciais
* **Framework:** React 18
* **Bundler & Tooling:** Vite
* **Roteamento:** React Router DOM (v6)
* **Gerenciamento de Estado:** Zustand
* **Integração de Backend:** Cliente JavaScript do Supabase (`@supabase/supabase-js`), Axios
* **UI e Ícones:** Lucide React, React Hot Toast
* **E2E Testing:** Puppeteer

---

## 🛠️ Configuração Inicial (Ambiente de Desenvolvimento)

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão LTS recomendada) instalado na sua máquina.

### 2. Instalação
1. Navegue até o diretório do frontend:
   ```bash
   cd redcomercial
   ```
2. Instale as dependências via NPM:
   ```bash
   npm install
   ```

### 3. Variáveis de Ambiente
Renomeie ou crie seu arquivo `.env.local` na raiz do projeto contendo as chaves do Supabase e configurações da API:
```bash
cp .env.local.example .env.local
```
*(Certifique-se de preencher corretamente a URL do Backend e as Chaves Públicas/URL do Supabase).*

### 4. Executando o Servidor de Desenvolvimento
Inicie o o projeto com hot-reload ativo:
```bash
npm run dev
```
O aplicativo provavelmente estará rodando no endereço informado no console pelo Vite (ex: `http://localhost:5173`).

---

## 🧪 Testes E2E (End-to-End)
A aplicação conta com testes de automação e integração usando o Puppeteer (arquivos `ui_e2e_signup.js` e `.cjs` na raiz).
Para rodá-los (dependendo do que está configurado em seus scripts npm), garanta que seu ambiente de desenvolvimento esteja de pé e então rode seus scripts Node na raiz do projeto.

---

## 🚀 Build e Deploy
A aplicação está preparada para ser hospedada de forma fácil e nativa na **Vercel** (`vercel.json` incluso).

Para compilar o aplicativo localmente e gerar a versão final otimizada para produção:
```bash
npm run build
```
O resultado será compilado na pasta padrão `dist/`. Para visualizar essa versão localmente:
```bash
npm run preview
```
