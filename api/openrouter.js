/**
 * Proxy para OpenRouter API
 * Vercel consegue atingir OpenRouter sem bloqueios
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
    const { method, headers, body, query } = req;
    
    // Constrói o path corretamente
    const pathParam = query.path;
    let path = '';
    if (typeof pathParam === 'string') {
      path = '/' + pathParam;
    } else if (Array.isArray(pathParam)) {
      path = '/' + pathParam.join('/');
    }

    console.log(`🔄 Proxying ${method} ${path}`);
    console.log(`Authorization header:`, headers.authorization ? 'Presente' : 'Ausente');
    console.log(`Body:`, body ? JSON.stringify(body).substring(0, 100) : 'Nenhum');

    // Montar headers pro OpenRouter
    const forwardHeaders = {
      'Authorization': headers.authorization, // Vem em lowercase
      'HTTP-Referer': 'https://redcomercialweb.vercel.app',
      'X-Title': 'RedCommercial AI Agent',
      'Content-Type': headers['content-type'] || 'application/json',
      'User-Agent': 'RedCommercial-Proxy/1.0'
    };

    // Remove undefined headers
    Object.keys(forwardHeaders).forEach(key => {
      if (forwardHeaders[key] === undefined) {
        delete forwardHeaders[key];
      }
    });

    console.log(`📤 Headers enviados para OpenRouter:`, Object.keys(forwardHeaders));

    // Faz proxy da requisição
    const response = await fetch(`https://api.openrouter.io/api/v1${path}`, {
      method: method,
      headers: forwardHeaders,
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    
    console.log(`✓ OpenRouter respondeu com status ${response.status}`);
    
    // Se for erro de authorization
    if (response.status === 401) {
      return res.status(401).json({
        erro: 'Chave de API inválida ou expirada',
        status: 401
      });
    }

    if (!response.ok) {
      console.error(`❌ OpenRouter erro: ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro no proxy:', error.message);
    res.status(500).json({
      erro: 'Erro ao fazer proxy com OpenRouter',
      detalhes: error.message
    });
  }
}
