import React, { useState, useEffect, useRef } from 'react';
import aiService from '../../services/aiService.js';
import './css/AIAgent.css';

const AIAgent = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [tabActive, setTabActive] = useState('chat');
  const messagesEndRef = useRef(null);
  const [autoApplyChanges, setAutoApplyChanges] = useState(true);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = aiService.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setApiKeyInput('');
      checkKeyValidity(savedKey);
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkKeyValidity = async (key) => {
    try {
      const isValid = await aiService.validateApiKey(key);
      setIsKeyValid(isValid);
      if (isValid) {
        aiService.setApiKey(key);
        await loadModels(key);
      }
    } catch (error) {
      console.error('Error validating key:', error);
      setIsKeyValid(false);
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setStatus('⚠️ Please enter an API key');
      return;
    }

    setStatus('🔍 Validating API key...');
    await checkKeyValidity(apiKeyInput);
    
    if (isKeyValid) {
      setApiKey(apiKeyInput);
      setApiKeyInput('');
      setStatus('✓ API key validated!');
      setTimeout(() => setStatus(''), 3000);
    } else {
      setStatus('✗ Invalid API key');
    }
  };

  const loadModels = async (key = apiKey) => {
    try {
      setStatus('📦 Loading models...');
      const data = await aiService.getModels(key);

      // Get recommended models first
      const recommended = data.recommended_for_development || [];
      if (recommended.length > 0) {
        setSelectedModel(recommended[0].id);
      }

      setModels(data);
      setStatus('✓ Models loaded!');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus(`✗ Failed to load models: ${error.message}`);
    }
  };

  const handleSendPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setStatus('⚠️ Please enter a prompt');
      return;
    }

    if (!selectedModel) {
      setStatus('⚠️ Please select a model');
      return;
    }

    // Add user message
    const userMessage = {
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setMessages([...messages, userMessage]);

    setLoading(true);
    setPrompt('');
    setStatus('🤖 AI is analyzing your request...');

    try {
      const response = await aiService.sendPrompt(prompt, selectedModel, autoApplyChanges);

      // Add AI response
      const aiMessage = {
        type: 'ai',
        content: response.ai_response,
        changes: response.changes_found || [],
        applied: response.changes_applied || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.changes_applied && response.changes_applied.length > 0) {
        const successCount = response.changes_applied.filter(c => c.status === 'success').length;
        setStatus(`✓ Applied ${successCount} change(s)!`);
        
        // Switch to changes tab to show results
        setTabActive('changes');
      } else if (response.changes_found && response.changes_found.length > 0) {
        setStatus('ℹ️ Changes detected but not applied (auto-apply disabled)');
      } else {
        setStatus('ℹ️ No code changes needed');
      }

      setTimeout(() => setStatus(''), 5000);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setStatus(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Component render
  if (!isKeyValid) {
    return (
      <div className="ai-agent-container">
        <div className="ai-setup">
          <h2>🤖 AI Agent Setup</h2>
          <p>Enter your OpenRouter API key to get started</p>

          <div className="setup-form">
            <input
              type="password"
              placeholder="Enter your OpenRouter API key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetApiKey()}
              className="api-key-input"
            />
            <button onClick={handleSetApiKey} className="btn-primary">
              Validate & Connect
            </button>
          </div>

          <p className="help-text">
            📚 Don't have an API key?{' '}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
              Get one free at OpenRouter
            </a>
          </p>

          {status && <div className="status-message">{status}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-agent-container">
      <div className="ai-header">
        <h1>🤖 AI Code Agent</h1>
        <button
          className="btn-secondary"
          onClick={() => {
            setApiKey('');
            setIsKeyValid(false);
            localStorage.removeItem('openrouter_api_key');
          }}
        >
          Disconnect
        </button>
      </div>

      <div className="ai-controls">
        <div className="model-selector">
          <label>AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
          >
            <optgroup label="⭐ Recommended (Free)">
              {models.recommended_for_development?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.best_for}
                </option>
              ))}
            </optgroup>
            <optgroup label="Free Models">
              {models.free_models?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Paid Models">
              {models.paid_models?.map((model) => (
                <option key={model.id} value={model.id}>
                  💳 {model.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={autoApplyChanges}
            onChange={(e) => setAutoApplyChanges(e.target.checked)}
          />
          Auto-apply changes
        </label>
      </div>

      <div className="ai-tabs">
        <button
          className={`tab-btn ${tabActive === 'chat' ? 'active' : ''}`}
          onClick={() => setTabActive('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab-btn ${tabActive === 'changes' ? 'active' : ''}`}
          onClick={() => setTabActive('changes')}
        >
          📝 Changes {messages.some(m => m.applied?.length) && '✓'}
        </button>
        <button
          className={`tab-btn ${tabActive === 'info' ? 'active' : ''}`}
          onClick={() => setTabActive('info')}
        >
          ℹ️ Info
        </button>
      </div>

      {tabActive === 'chat' && (
        <div className="ai-chat-panel">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>👋 Start by describing what you want to change</p>
                <p className="example">Example: "Change the admin dashboard background to dark red"</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message message-${msg.type}`}>
                  <div className="message-header">
                    <span className="message-role">
                      {msg.type === 'user' ? '👤 You' : msg.type === 'error' ? '❌ Error' : '🤖 AI'}
                    </span>
                    <span className="message-time">
                      {msg.timestamp?.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">
                    {msg.type === 'ai' && msg.applied?.length > 0 && (
                      <div className="applied-changes">
                        <strong>✓ Applied changes:</strong>
                        <ul>
                          {msg.applied.map((change, i) => (
                            <li key={i} className={`change-${change.status}`}>
                              {change.file}: {change.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendPrompt} className="prompt-form">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like me to change? Use natural language..."
              className="prompt-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={loading || !prompt.trim()}
            >
              {loading ? '⏳ Thinking...' : '→ Send'}
            </button>
          </form>
        </div>
      )}

      {tabActive === 'changes' && (
        <div className="ai-changes-panel">
          {messages.filter(m => m.type === 'ai' && m.applied?.length > 0).length === 0 ? (
            <div className="empty-state">
              <p>No changes applied yet</p>
              <p>Ask the AI to modify something and changes will appear here</p>
            </div>
          ) : (
            <div className="changes-list">
              {messages.map((msg, idx) => {
                if (msg.type !== 'ai' || !msg.applied?.length) return null;
                return (
                  <div key={idx} className="change-group">
                    <h3>Applied Changes</h3>
                    {msg.applied.map((change, i) => (
                      <div key={i} className={`change-item change-${change.status}`}>
                        <strong>{change.file}</strong>
                        <p>{change.message}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tabActive === 'info' && (
        <div className="ai-info-panel">
          <h3>About AI Agent</h3>
          <p>
            This AI agent analyzes your code and makes changes based on your requests.
          </p>

          <h4>How it works:</h4>
          <ol>
            <li>You describe what you want changed in natural language</li>
            <li>The AI analyzes your project structure</li>
            <li>It generates the necessary code changes</li>
            <li>Changes are automatically applied to your files</li>
            <li>Changes are committed to git</li>
          </ol>

          <h4>✨ Recommended Free Models:</h4>
          <ul className="model-list">
            {models.recommended_for_development?.map((model) => (
              <li key={model.id}>
                <strong>{model.name}</strong>
                <p>{model.description}</p>
                <small>{model.best_for}</small>
              </li>
            ))}
          </ul>

          {status && <div className="status-message">{status}</div>}
        </div>
      )}

      {status && <div className="status-bar">{status}</div>}
    </div>
  );
};

export default AIAgent;
