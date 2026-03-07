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
      console.log('🔍 Testando chave via proxy Vercel...');
      
      // Usa o proxy também para validação
      const resposta = await fetch('/api/openrouter?path=models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chaveFormatada}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Status OpenRouter:', resposta.status);

      if (resposta.status === 200) {
        console.log('✓ Chave validada com sucesso!');
        return true;
      } else if (resposta.status === 401) {
        throw new Error('Chave inválida ou expirada');
      } else {
        console.warn(`⚠ Status inesperado: ${resposta.status}, mas aceitando`);
        return true;
      }
    } catch (erro) {
      console.warn('⚠ Não conseguiu validar via OpenRouter API:', erro.message);
      // Se não conseguir conectar mas o formato está OK, aceita
      if (chaveFormatada.startsWith('sk-or-v1-') && chaveFormatada.length >= 65) {
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

      console.log('📥 Buscando modelos via proxy Vercel...');
      
      // Usa o proxy do Vercel ao invés de chamar OpenRouter direto
      const resposta = await fetch('/api/openrouter?path=models', {
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
        is_recommended: ['openrouter/auto', 'meta-llama/llama-2-70b-chat', 'mistralai/mistral-7b-instruct'].includes(m.id)
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
        { id: 'openrouter/auto', name: 'Auto (Recomendado)', is_recommended: true },
        { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B', is_recommended: true },
        { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', is_recommended: true }
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

      console.log('📤 Enviando para OpenRouter via proxy Vercel:', { modelo });
      
      // Usa o proxy do Vercel ao invés de chamar OpenRouter direto
      const resposta = await fetch('/api/openrouter?path=chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chaveAPI}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelo,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
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
      const resposta_ia = dados.choices?.[0]?.message?.content || 'Sem resposta';
      
      console.log('✓ Resposta da IA recebida');
      
      return {
        resposta: resposta_ia,
        message: resposta_ia,
        modelo_usado: modelo,
        tokens_usados: dados.usage || {}
      };
    } catch (erro) {
      console.error('❌ Erro ao enviar prompt:', erro);
      throw new Error(`Falha ao processar: ${erro.message}`);
    }
  }
}

export default new ServicoAgentIA();
