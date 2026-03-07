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
    const { method, headers, body } = req;
    const path = req.query.path ? '/' + req.query.path.join('/') : '';

    console.log(`🔄 Proxying ${method} ${path}`);
    console.log(`Headers recebidos:`, Object.keys(headers));

    // Faz proxy da requisição
    const response = await fetch(`https://api.openrouter.io/api/v1${path}`, {
      method: method,
      headers: {
        'Authorization': headers.authorization || headers['Authorization'],
        'HTTP-Referer': 'https://redcomercialweb.vercel.app',
        'X-Title': 'RedCommercial AI Agent',
        'Content-Type': headers['content-type'] || 'application/json',
        'User-Agent': 'RedCommercial-Proxy/1.0'
      },
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro no proxy:', error);
    res.status(500).json({
      erro: 'Erro ao fazer proxy com OpenRouter',
      detalhes: error.message
    });
  }
}
