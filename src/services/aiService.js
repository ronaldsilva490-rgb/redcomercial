/**
 * AI Agent Service
 * Handles communication with OpenRouter-powered AI agent
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';

class AIService {
  constructor() {
    this.apiKey = localStorage.getItem('openrouter_api_key') || '';
    this.models = [];
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('openrouter_api_key', key);
  }

  getApiKey() {
    return this.apiKey;
  }

  async validateApiKey(apiKey) {
    try {
      const response = await fetch(`${API_BASE}/api/superadmin/ai-agent/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (!response.ok) throw new Error('Validation failed');
      return (await response.json()).valid;
    } catch (error) {
      console.error('API Key validation error:', error);
      return false;
    }
  }

  async getModels(apiKey = this.apiKey) {
    try {
      const response = await fetch(`${API_BASE}/api/superadmin/ai-agent/models`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey || this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch models');

      const data = await response.json();
      this.models = data;
      return data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  async sendPrompt(prompt, model, applyChanges = true) {
    try {
      if (!this.apiKey) {
        throw new Error('API key not set');
      }

      const response = await fetch(`${API_BASE}/api/superadmin/ai-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          api_key: this.apiKey,
          apply_changes: applyChanges
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API error');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending prompt:', error);
      throw error;
    }
  }
}

export default new AIService();
