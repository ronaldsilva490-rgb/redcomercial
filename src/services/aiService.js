/**
 * Serviço de Agente de IA
 * Gerencia comunicação com o agente de IA via Groq (backend)
 */

const URL_API_BASE = import.meta.env.VITE_API_URL || 'https://redbackend.fly.dev';

class ServicoAgentIA {
  constructor() {
    this.chaveAPI = localStorage.getItem('groq_api_key') || '';
    this.modelos = [];
  }

  definirChaveAPI(chave) {
    this.chaveAPI = chave;
    localStorage.setItem('groq_api_key', chave);
    console.log('✓ Chave de API Groq definida');
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
    
    // Verifica se começa com o prefixo correto do Groq
    if (!chaveFormatada.startsWith('gsk_')) {
      throw new Error('Formato de chave inválido - chave Groq deve começar com gsk_');
    }

    // Tenta fazer um teste real com o backend
    try {
      console.log('🔍 Testando chave Groq via backend...');
      
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: chaveFormatada
        })
      });

      console.log('Status backend:', resposta.status);

      if (resposta.status === 200) {
        const dados = await resposta.json();
        if (dados.valida) {
          console.log('✓ Chave validada com sucesso!');
          return true;
        }
      } else if (resposta.status === 401) {
        throw new Error('Chave inválida ou expirada');
      } else {
        console.warn(`⚠ Status inesperado: ${resposta.status}, mas aceitando`);
        return true;
      }
    } catch (erro) {
      console.warn('⚠ Não conseguiu validar via backend:', erro.message);
      // Se não conseguir conectar mas o formato está OK, aceita
      if (chaveFormatada.startsWith('gsk_') && chaveFormatada.length >= 50) {
        console.log('✓ Formato correto - aceitando chave mesmo sem validação via API');
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
      
      // Chama o backend
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chaveAPI}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Status de modelos:', resposta.status);

      if (resposta.status === 401) {
        throw new Error('Chave de API inválida ou expirada');
      }

      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status} ao buscar modelos`);
      }

      const dados = await resposta.json();
      const modelos = dados.data || [];
      
      // Processar e ordenar modelos
      const modelosProcessados = modelos.map(m => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description || '',
        pricing: m.pricing || {},
        is_recommended: m.is_recommended || false
      }));

      // Ordenar com recomendados primeiro
      modelosProcessados.sort((a, b) => {
        if (a.is_recommended === b.is_recommended) {
          return a.name.localeCompare(b.name);
        }
        return b.is_recommended - a.is_recommended;
      });

      console.log(`✓ ${modelosProcessados.length} modelos recebidos`);
      this.modelos = modelosProcessados;
      return modelosProcessados;
    } catch (erro) {
      console.error('❌ Erro ao obter modelos:', erro);
      // Se falhar, retorna modelos padrão para que o usuário possa usar
      const modelosPadrao = [
        { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile (Recomendado)', is_recommended: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', is_recommended: false },
        { id: 'llama3-70b-8192', name: 'Llama 3 70B', is_recommended: false }
      ];
      console.warn('⚠ Usando modelos padrão');
      this.modelos = modelosPadrao;
      return modelosPadrao;
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

      console.log('📤 Enviando para Groq via backend:', { modelo });
      
      // Chama o backend
      const resposta = await fetch(`${URL_API_BASE}/api/superadmin/ai-agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          modelo: modelo,
          api_key: chaveAPI
        })
      });

      console.log('Status da resposta:', resposta.status);

      if (resposta.status === 401) {
        throw new Error('Chave de API inválida ou expirada');
      }

      if (resposta.status === 429) {
        throw new Error('Muitas requisições - tente novamente em alguns segundos');
      }

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
        const msg = erro.error?.message || `Erro HTTP ${resposta.status}`;
        console.error('Erro de chat:', erro);
        throw new Error(msg);
      }

      const dados = await resposta.json();
      const resposta_ia = dados.resposta || 'Sem resposta';
      
      console.log('✓ Resposta da IA recebida');
      
      return {
        resposta: resposta_ia,
        message: resposta_ia,
        modelo_usado: modelo
      };
    } catch (erro) {
      console.error('❌ Erro ao enviar prompt:', erro);
      throw new Error(`Falha ao processar: ${erro.message}`);
    }
  }
}

export default new ServicoAgentIA();
