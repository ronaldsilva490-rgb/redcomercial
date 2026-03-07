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

    if (!headers.authorization) {
      return res.status(400).json({
        erro: 'Authorization header obrigatório'
      });
    }

    // Monta o URL completo
    const url = `https://api.openrouter.io/api/v1${path}`;
    
    console.log(`📤 Chamando: ${url}`);

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
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    
    console.log(`✓ Status ${response.status}`);
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro no proxy:', error.message);
    res.status(500).json({
      erro: 'Erro ao fazer proxy com OpenRouter',
      detalhes: error.message
    });
  }
}
