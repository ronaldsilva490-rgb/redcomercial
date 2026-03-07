/**
 * Serviço de Agente de IA
 * Gerencia comunicação com o agente de IA via OpenRouter
 */

const URL_API_BASE = import.meta.env.VITE_API_URL || 'https://redbackend.fly.dev';

class ServicoAgentIA {
  constructor() {
    this.chaveAPI = localStorage.getItem('openrouter_api_key') || '';
    this.modelos = [];
  }

  definirChaveAPI(chave) {
    this.chaveAPI = chave;
    localStorage.setItem('openrouter_api_key', chave);
    console.log('✓ Chave de API definida');
  }

  obterChaveAPI() {
    return this.chaveAPI;
  }

  async validarChaveAPI(chaveAPI) {
    // Validação local de formato primeiro
    if (!chaveAPI || typeof chaveAPI !== 'string') {
      throw new Error('Chave de API inválida');
    }

    const chaveFormatada = chaveAPI.trim();
    
    // Verifica se começa com o prefixo correto do OpenRouter
    if (!chaveFormatada.startsWith('sk-or-v1-')) {
      throw new Error('Formato de chave inválido - deve começar com sk-or-v1-');
    }

    // Verifica o comprimento mínimo
    if (chaveFormatada.length < 65) {
      throw new Error('Chave muito curta - formato inválido');
    }

    // Tenta fazer um teste real com a OpenRouter API
    try {
      console.log('🔍 Testando chave com API OpenRouter...');
      const resposta = await fetch('https://api.openrouter.io/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chaveFormatada}`,
          'HTTP-Referer': 'https://redcomercialweb.vercel.app',
          'X-Title': 'RedCommercial AI Agent'
        }
      });

      console.log('Status OpenRouter:', resposta.status);

      if (resposta.status === 200) {
        console.log('✓ Chave validada com sucesso!');
        return true;
      } else if (resposta.status === 401) {
        throw new Error('Chave inválida ou expirada');
      } else if (resposta.status === 429) {
        throw new Error('Muitas requisições - tente novamente mais tarde');
      } else {
        // Outros erros - mas ainda aceita se formato está ok
        console.warn(`⚠ Status inesperado: ${resposta.status}, mas chave tem formato correto`);
        return true; // Aceita se tem o formato correto
      }
    } catch (erro) {
      console.warn('⚠ Não conseguiu validar via API OpenRouter:', erro.message);
      // Se não conseguir conectar à API (erro de rede/CORS), mas formato está ok, aceita
      if (chaveFormatada.startsWith('sk-or-v1-') && chaveFormatada.length >= 65) {
        console.log('✓ Formato correto - aceitando chave mesmo sem validação via API');
        return true;
      }
      throw erro;
    }
  }

  async obterModelos(chaveAPI = this.chaveAPI) {
    try {
      console.log('📥 Buscando modelos do backend...');
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/models`, {
        method: 'GET',
        headers: {
          'X-API-Key': chaveAPI || this.chaveAPI,
          'Content-Type': 'application/json'
        }
      });

      console.log('Status de modelos:', resposta.status);

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ erro: 'Erro ao carregar' }));
        console.error('Erro ao obter modelos:', erro);
        throw new Error(erro.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      console.log('✓ Modelos recebidos:', dados);
      this.modelos = dados;
      return dados;
    } catch (erro) {
      console.error('❌ Erro ao obter modelos:', erro);
      throw new Error(`Falha ao carregar modelos: ${erro.message}`);
    }
  }

  async enviarPrompt(prompt, modelo, chaveAPI = this.chaveAPI) {
    try {
      console.log('📤 Enviando prompt para IA:', { prompt, modelo });
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelo,
          api_key: chaveAPI,
          aplicar_mudancas: true
        })
      });

      console.log('Status da resposta de chat:', resposta.status);

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ erro: 'Erro desconhecido' }));
        console.error('Erro de chat:', erro);
        throw new Error(erro.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      console.log('✓ Resposta da IA:', dados);
      return dados;
    } catch (erro) {
      console.error('❌ Erro ao enviar prompt:', erro);
      throw new Error(`Falha ao processar prompt: ${erro.message}`);
    }
  }
}

export default new ServicoAgentIA();
