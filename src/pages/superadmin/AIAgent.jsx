import React, { useState, useEffect, useRef } from 'react';
import servicoAgentIA from '../../services/aiService.js';
import './css/AIAgent.css';

const AgentIA = () => {
  const [chaveAPI, setChaveAPI] = useState('');
  const [entradaChaveAPI, setEntradaChaveAPI] = useState('');
  const [chaveValida, setChaveValida] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [mensagens, setMensagens] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState('');
  const [erroMensagem, setErroMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('chat');
  const refFimMensagens = useRef(null);
  const [aplicarAutomaticamente, setAplicarAutomaticamente] = useState(true);

  // Carrega chave de API do localStorage ao montar
  useEffect(() => {
    const chaveSalva = servicoAgentIA.obterChaveAPI();
    if (chaveSalva) {
      setChaveAPI(chaveSalva);
      setEntradaChaveAPI('');
      verificarValidadeChave(chaveSalva);
    }
  }, []);

  // Rola para o final quando novas mensagens chegam
  useEffect(() => {
    refFimMensagens.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const verificarValidadeChave = async (chave) => {
    try {
      console.log('🔍 Verificando chave de API...');
      setErroMensagem('');
      setStatus('🔍 Validando chave...');
      const valida = await servicoAgentIA.validarChaveAPI(chave);
      console.log('Resultado da validação:', valida);
      setChaveValida(valida);
      if (valida) {
        servicoAgentIA.definirChaveAPI(chave);
        await carregarModelos(chave);
        setStatus('✓ Chave de API validada com sucesso!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setErroMensagem('❌ Chave de API inválida ou expirada');
        setChaveValida(false);
      }
    } catch (erro) {
      console.error('Erro ao validar chave:', erro);
      setErroMensagem(`❌ ${erro.message || erro}`);
      setChaveValida(false);
      setStatus('');
    }
  };

  const handleDefinirChaveAPI = async () => {
    if (!entradaChaveAPI.trim()) {
        setErroMensagem('⚠️ Cole sua chave de API do Groq');
    }

    setStatus('🔍 Validando chave de API...');
    setErroMensagem('');
    await verificarValidadeChave(entradaChaveAPI);
  };

  const carregarModelos = async (chave = chaveAPI) => {
    try {
      setStatus('📦 Carregando modelos...');
      setErroMensagem('');
      console.log('📥 Buscando modelos do Groq...');
      const dados = await servicoAgentIA.obterModelos(chave);
      console.log('✓ Modelos recebidos:', dados);

      setModelos(dados);
      if (dados && dados.length > 0) {
        setModeloSelecionado(dados[0].id);
      }
      setStatus('✓ Modelos carregados!');
      setTimeout(() => setStatus(''), 2000);
    } catch (erro) {
      console.error('Erro ao carregar modelos:', erro);
      setErroMensagem(`❌ Erro ao carregar modelos: ${erro.message || erro}`);
    }
  };

  const handleEnviarPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setErroMensagem('⚠️ Digite um comando para a IA');
      return;
    }

    if (!modeloSelecionado) {
      setErroMensagem('⚠️ Selecione um modelo');
      return;
    }

    if (!chaveAPI) {
      setErroMensagem('⚠️ Configure sua chave de API primeiro');
      return;
    }

    setMensagens(prev => [...prev, { role: 'usuario', conteudo: prompt, ts: new Date() }]);
    setPrompt('');
    setCarregando(true);
    setStatus('🤖 IA analisando seu pedido...');
    setErroMensagem('');

    try {
      console.log('📤 Enviando para IA:', prompt);
      const resposta = await servicoAgentIA.enviarPrompt(prompt, modeloSelecionado, chaveAPI);
      console.log('📥 Resposta da IA:', resposta);
      
      setMensagens(prev => [...prev, { 
        role: 'ia', 
        conteudo: resposta.resposta || resposta.message || 'Sem resposta',
        ts: new Date(),
        mudancas: resposta.mudancas || []
      }]);
      
      if (resposta.mudancas && resposta.mudancas.length > 0 && aplicarAutomaticamente) {
        setStatus('✓ Mudanças aplicadas com sucesso!');
      } else {
        setStatus('✓ Resposta recebida');
      }
      setTimeout(() => setStatus(''), 3000);
    } catch (erro) {
      console.error('Erro ao enviar prompt:', erro);
      setMensagens(prev => [...prev, { 
        role: 'ia', 
        conteudo: `❌ Erro: ${erro.message || erro}`,
        ts: new Date(),
        isError: true
      }]);
      setErroMensagem(`Erro ao processar: ${erro.message || erro}`);
    } finally {
      setCarregando(false);
    }
  };

  const limparConversas = () => {
    if (confirm('Limpar todas as conversas?')) {
      setMensagens([]);
      setStatus('✓ Conversas limpas');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const desconectar = () => {
    if (confirm('Desconectar da IA?')) {
      setChaveAPI('');
      setChaveValida(false);
      setMensagens([]);
      setModeloSelecionado('');
      localStorage.removeItem('groq_api_key');
    }
  };

  return (
    <div className="ai-agent-container">
      {/* HEADER */}
      <div className="ai-agent-header">
        <div className="ai-agent-titulo">
          <span className="ai-agent-icon">🤖</span>
          <span>Agente de IA (Groq)</span>
        </div>
        {chaveValida && <div className="ai-agent-badge">✓ Conectado</div>}
      </div>

      {/* CONFIGURAÇÃO */}
      {!chaveValida && (
        <div className="ai-agent-setup">
          <div className="ai-agent-setup-titulo">🔑 Configure sua Chave de API</div>
          <div className="ai-agent-setup-instrucoes">
            <ol>
              <li>Acesse <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a></li>
              <li>Copie sua chave de API</li>
              <li>Cole abaixo</li>
            </ol>
          </div>
          
          <div className="ai-agent-setup-input-group">
            <input
              type="password"
              value={entradaChaveAPI}
              onChange={(e) => setEntradaChaveAPI(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDefinirChaveAPI()}
              placeholder="gsk_..."
              className="ai-agent-input"
            />
            <button 
              onClick={handleDefinirChaveAPI}
              disabled={carregando}
              className="ai-agent-btn ai-agent-btn-primary"
            >
              {carregando ? '⏳ Validando...' : '✓ Validar'}
            </button>
          </div>

          {erroMensagem && <div className="ai-agent-erro">{erroMensagem}</div>}
          {status && <div className="ai-agent-status">{status}</div>}
        </div>
      )}

      {/* INTERFACE CHAT (quando configurado) */}
      {chaveValida && (
        <>
          {/* ABAS */}
          <div className="ai-agent-tabs">
            <button 
              className={`ai-agent-tab ${abaAtiva === 'chat' ? 'ativo' : ''}`}
              onClick={() => setAbaAtiva('chat')}
            >
              💬 Chat
            </button>
            <button 
              className={`ai-agent-tab ${abaAtiva === 'modelos' ? 'ativo' : ''}`}
              onClick={() => setAbaAtiva('modelos')}
            >
              🤖 Modelos ({modelos.length})
            </button>
            <button 
              className="ai-agent-tab ai-agent-tab-desconectar"
              onClick={desconectar}
            >
              🚪 Desconectar
            </button>
          </div>

          {/* ABA CHAT */}
          {abaAtiva === 'chat' && (
            <div className="ai-agent-chat">
              <div className="ai-agent-mensagens">
                {mensagens.length === 0 && (
                  <div className="ai-agent-vazio">
                    <div>👋 Bem-vindo ao Agente de IA!</div>
                    <div style={{marginTop: 10, fontSize: 12, color: 'var(--muted)'}}>
                      Descreva o que quer fazer e a IA vai analisar seu código e fazer mudanças.
                    </div>
                    <div style={{marginTop: 10, fontSize: 11, color: 'var(--muted)'}}>Exemplos:</div>
                    <ul style={{fontSize: 11, color: 'var(--muted)', marginLeft: 20}}>
                      <li>"Mude o fundo do dashboard para vermelho escuro"</li>
                      <li>"Adicione um botão de logout na navbar"</li>
                      <li>"Crie um novo componente chamado CartaoUsuario"</li>
                    </ul>
                  </div>
                )}

                {mensagens.map((msg, i) => (
                  <div key={i} className={`ai-agent-mensagem ${msg.role}`}>
                    <div className="ai-agent-mensagem-avatar">
                      {msg.role === 'usuario' ? '👤' : '🤖'}
                    </div>
                    <div className="ai-agent-mensagem-corpo">
                      <div className="ai-agent-mensagem-texto">
                        {msg.conteudo}
                      </div>
                      {msg.mudancas && msg.mudancas.length > 0 && (
                        <div className="ai-agent-mudancas">
                          <div className="ai-agent-mudancas-titulo">📝 Mudanças:</div>
                          {msg.mudancas.map((mud, j) => (
                            <div key={j} className="ai-agent-mudanca">
                              📄 {mud.arquivo}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={refFimMensagens} />
              </div>

              {erroMensagem && <div className="ai-agent-erro">{erroMensagem}</div>}
              {status && <div className="ai-agent-status">{status}</div>}

              <form onSubmit={handleEnviarPrompt} className="ai-agent-form">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva o que quer fazer... (Shift+Enter para nova linha)"
                  className="ai-agent-textarea"
                  disabled={carregando}
                  rows="3"
                />
                <div className="ai-agent-form-botoes">
                  <button 
                    type="submit" 
                    disabled={carregando || !prompt.trim()}
                    className="ai-agent-btn ai-agent-btn-primary"
                  >
                    {carregando ? '⏳ Processando...' : '📤 Enviar'}
                  </button>
                  {mensagens.length > 0 && (
                    <button 
                      type="button" 
                      onClick={limparConversas}
                      className="ai-agent-btn ai-agent-btn-secondary"
                    >
                      🗑️ Limpar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ABA MODELOS */}
          {abaAtiva === 'modelos' && (
            <div className="ai-agent-modelos">
              <div className="ai-agent-modelos-lista">
                {modelos.length === 0 ? (
                  <div className="ai-agent-vazio">Nenhum modelo disponível</div>
                ) : (
                  modelos.map((modelo, i) => (
                    <div
                      key={i}
                      className={`ai-agent-modelo ${modeloSelecionado === modelo.id ? 'selecionado' : ''}`}
                      onClick={() => setModeloSelecionado(modelo.id)}
                    >
                      <div className="ai-agent-modelo-nome">{modelo.name}</div>
                      <div className="ai-agent-modelo-info">{modelo.description || ''}</div>
                      <div className="ai-agent-modelo-tier">{modelo.pricing_tier}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentIA;
