/**
 * Proxy para /api/v1/chat/completions do OpenRouter
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { authorization } = req.headers;
    const { body } = req;
    
    if (!authorization) {
      return res.status(400).json({ erro: 'Authorization header obrigatório' });
    }

    if (!body) {
      return res.status(400).json({ erro: 'Body obrigatório' });
    }

    console.log('📤 POST /api/proxy/chat → api.openrouter.io/api/v1/chat/completions');
    console.log('Body:', JSON.stringify(body).substring(0, 100));

    const requestBody = typeof body === 'string' ? body : JSON.stringify(body);

    const response = await fetch('https://api.openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'HTTP-Referer': 'https://redcomercialweb.vercel.app',
        'X-Title': 'RedCommercial AI Agent',
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    const data = await response.json();
    console.log(`✓ Status ${response.status}`);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return res.status(500).json({
      erro: 'Erro ao chamar chat',
      detalhes: error.message
    });
  }
}
