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

    // Tenta validar via backend (que faz proxy para OpenRouter)
    try {
      console.log('🔍 Validando chave via backend...');
      const response = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: chaveFormatada })
      });

      const data = await response.json();
      console.log('Status validação:', response.status, 'Resposta:', data);

      if (response.ok && (data.valida || data.valid)) {
        console.log('✓ Chave validada com sucesso!');
        return true;
      } else if (response.status === 401) {
        throw new Error('Chave inválida ou expirada');
      } else {
        // Mesmo que não consiga validar via API, aceita se formato está ok
        console.warn('⚠ Não conseguiu validar, mas formato está correto');
        return true;
      }
    } catch (erro) {
      console.warn('⚠ Erro na validação:', erro.message);
      // Se não conseguir validar, mas o formato está OK, aceita mesmo assim
      if (chaveFormatada.startsWith('sk-or-v1-') && chaveFormatada.length >= 65) {
        console.log('✓ Formato correto - aceitando chave mesmo sem validação');
        return true;
      }
      throw erro;
    }
  }

  async obterModelos(chaveAPI = this.chaveAPI) {
    try {
      if (!chaveAPI) {
        throw new Error('Chave de API não fornecida');
      }

      console.log('📥 Buscando modelos via backend...');
      
      // Chamar backend que faz proxy para OpenRouter
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chaveAPI}`
        },
        body: JSON.stringify({ api_key: chaveAPI })
      });

      console.log('Status de modelos:', resposta.status);

      if (resposta.status === 401) {
        throw new Error('Chave de API inválida ou expirada');
      }

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ erro: 'Erro ao carregar' }));
        throw new Error(erro.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      const modelos = dados.data || [];
      
      console.log(`✓ ${modelos.length} modelos recebidos`);
      this.modelos = modelos;
      return modelos;
    } catch (erro) {
      console.error('❌ Erro ao obter modelos:', erro);
      throw new Error(`Falha ao carregar modelos: ${erro.message}`);
    }
  }

  async enviarPrompt(prompt, modelo, chaveAPI = this.chaveAPI) {
    try {
      if (!chaveAPI) {
        throw new Error('Chave de API não fornecida');
      }

      if (!modelo) {
        throw new Error('Modelo não selecionado');
      }

      console.log('📤 Enviando prompt para IA via backend');
      
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chaveAPI}`
        },
        body: JSON.stringify({
          prompt: prompt,
          modelo: modelo,
          api_key: chaveAPI,
          aplicar_mudancas: true
        })
      });

      console.log('Status da resposta:', resposta.status);

      if (resposta.status === 401) {
        throw new Error('Chave de API inválida ou expirada');
      }

      if (resposta.status === 429) {
        throw new Error('Muitas requisições - tente novamente mais tarde');
      }

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ erro: 'Erro desconhecido' }));
        throw new Error(erro.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      
      console.log('✓ Resposta recebida');
      
      return {
        resposta: dados.resposta || dados.message || 'Sem resposta',
        message: dados.resposta || dados.message || 'Sem resposta',
        mudancas: dados.mudancas || [],
        modelo_usado: modelo
      };
    } catch (erro) {
      console.error('❌ Erro ao enviar prompt:', erro);
      throw new Error(`Falha ao processar: ${erro.message}`);
    }
  }
}

export default new ServicoAgentIA();
