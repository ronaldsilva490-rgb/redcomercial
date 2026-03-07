/**
 * Rota dinâmica para proxy OpenRouter
 * Vercel consegue atingir OpenRouter sem bloqueios
 * 
 * Exemplo:
 * - /api/proxy/models → GET https://api.openrouter.io/api/v1/models
 * - /api/proxy/chat/completions → POST https://api.openrouter.io/api/v1/chat/completions
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-API-Key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, headers, body } = req;
    
    // Extrai o path do URL
    let path = '';
    if (req.query.path) {
      if (Array.isArray(req.query.path)) {
        path = '/' + req.query.path.join('/');
      } else {
        path = '/' + req.query.path;
      }
    }

    console.log(`🔄 Proxy ${method} ${path}`);
    console.log(`Auth header:`, headers.authorization ? 'Sim' : 'Não');
    console.log(`Body type:`, typeof body);
    console.log(`Body:`, body ? (typeof body === 'string' ? body.substring(0, 100) : JSON.stringify(body).substring(0, 100)) : 'Nenhum');

    if (!headers.authorization) {
      return res.status(400).json({
        erro: 'Authorization header obrigatório'
      });
    }

    // Monta o URL completo
    const url = `https://api.openrouter.io/api/v1${path}`;
    
    console.log(`📤 Chamando: ${url}`);

    // Prepara o body corretamente
    let requestBody = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      // Se body é objeto, converte para JSON
      // Se já é string, usa direto
      requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      console.log(`Body a enviar:`, requestBody.substring(0, 100));
    }

    // Faz a requisição pro OpenRouter
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': headers.authorization,
        'HTTP-Referer': 'https://redcomercialweb.vercel.app',
        'X-Title': 'RedCommercial AI Agent',
        'Content-Type': headers['content-type'] || 'application/json',
        'User-Agent': 'RedCommercial-Proxy/1.0'
      },
      body: requestBody
    });

    const data = await response.json().catch(() => ({}));
    
    console.log(`✓ Status ${response.status}`);
    console.log(`Response data:`, JSON.stringify(data).substring(0, 200));
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro no proxy:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      erro: 'Erro ao fazer proxy com OpenRouter',
      detalhes: error.message
    });
  }
}
