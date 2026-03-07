/**
 * Proxy para /api/v1/models do OpenRouter
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { authorization } = req.headers;
    
    if (!authorization) {
      return res.status(400).json({ erro: 'Authorization header obrigatório' });
    }

    console.log('📤 GET /api/proxy/models → api.openrouter.io/api/v1/models');

    const response = await fetch('https://api.openrouter.io/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'HTTP-Referer': 'https://redcomercialweb.vercel.app',
        'X-Title': 'RedCommercial AI Agent'
      }
    });

    const data = await response.json();
    console.log(`✓ Status ${response.status}`);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return res.status(500).json({
      erro: 'Erro ao buscar modelos',
      detalhes: error.message
    });
  }
}
