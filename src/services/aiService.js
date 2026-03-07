/**
 * Serviço de Agente de IA
 * Gerencia comunicação com o agente de IA via OpenRouter
 */

const URL_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';

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
    try {
      console.log('🔍 Validando chave de API com backend...');
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: chaveAPI })
      });

      console.log('Status da resposta:', resposta.status);
      
      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ erro: 'Erro desconhecido' }));
        console.error('Erro de validação:', erro);
        throw new Error(erro.erro || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      console.log('✓ Resposta de validação:', dados);
      return dados.valida || dados.valid || false;
    } catch (erro) {
      console.error('❌ Erro ao validar chave:', erro);
      throw new Error(`Falha ao validar chave: ${erro.message}`);
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
