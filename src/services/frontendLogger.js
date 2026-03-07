/**
 * frontendLogger.js — Logger do lado cliente
 * Captura:
 *   - Erros JS não capturados
 *   - Logs de console (console.log, console.error, etc)
 *   - Requisições da API
 *   - Performance metrics
 */

import api from './api'

class FrontendLogger {
  constructor() {
    this.queue = []
    this.MAX_QUEUE = 50
    this.BATCH_TIMEOUT = 5000 // Envia a cada 5s
    this.enabled = true
    
    // Auto-envio em background
    this.startBatchTimer()
  }

  /**
   * Log com nível e serviço
   */
  log(level = 'info', service = 'frontend', message = '', details = null) {
    if (!this.enabled || !message) return

    const logEntry = {
      level: level.toLowerCase(),
      service: service.toLowerCase(),
      message: message.toString(),
      details: details || {},
      timestamp: new Date().toISOString(),
    }

    this.queue.push(logEntry)

    // Envia imediatamente se é erro crítico
    if (level === 'error' && this.queue.length >= 5) {
      this.flush()
    }

    // Se atingiu limite, envia
    if (this.queue.length >= this.MAX_QUEUE) {
      this.flush()
    }
  }

  error(message, details = null) {
    this.log('error', 'frontend', message, details)
  }

  warning(message, details = null) {
    this.log('warning', 'frontend', message, details)
  }

  info(message, details = null) {
    this.log('info', 'frontend', message, details)
  }

  debug(message, details = null) {
    this.log('debug', 'frontend', message, details)
  }

  /**
   * Envia logs acumulados para o backend
   */
  async flush() {
    if (this.queue.length === 0) return

    const toSend = [...this.queue]
    this.queue = []

    try {
      // Tenta enviar batch
      const response = await api.post('/api/superadmin/logs/batch', toSend, {
        timeout: 5000,
      })
      
      if (!response.data?.ok) {
        console.warn('[Logger] Falha ao enviar batch:', response.data)
        // Re-insere na fila se falhar
        this.queue.unshift(...toSend)
      }
    } catch (error) {
      console.warn('[Logger] Erro ao enviar logs:', error.message)
      // Re-insere na fila se falhar
      this.queue.unshift(...toSend.slice(0, this.MAX_QUEUE / 2))
    }
  }

  /**
   * Timer que envia logs periodicamente
   */
  startBatchTimer() {
    setInterval(() => this.flush(), this.BATCH_TIMEOUT)
  }

  /**
   * Captura erros globais de JS
   */
  captureGlobalErrors() {
    // Erros não capturados
    window.addEventListener('error', (event) => {
      this.error('Uncaught JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.slice(0, 500),
      })
    })

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack?.slice(0, 500),
      })
    })
  }

  /**
   * Redireciona console.log, console.error, etc para o logger
   */
  captureConsole() {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args) => {
      originalLog.apply(console, args)
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
      // Não loga todos os logs para não poluir
      if (msg.includes('[ERROR]') || msg.includes('[WARN]')) {
        this.debug(msg)
      }
    }

    console.error = (...args) => {
      originalError.apply(console, args)
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
      this.error(msg)
    }

    console.warn = (...args) => {
      originalWarn.apply(console, args)
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
      this.warning(msg)
    }
  }

  /**
   * Log de requisição HTTP (chama automaticamente via interceptor)
   */
  logRequest(method, url, status, duration) {
    const message = `${method} ${url} → ${status} (${duration}ms)`
    
    // Determina nível
    let level = 'debug'
    if (status >= 500) level = 'error'
    else if (status >= 400) level = 'warning'
    else if (status >= 200) level = 'info'

    this.log(level, 'frontend', message, {
      method,
      url: url.replace(/\/api\//, ''),
      status,
      duration_ms: duration,
    })
  }

  /**
   * Log de performance
   */
  logPerformance(metric, value) {
    this.log('debug', 'frontend', `Performance: ${metric}`, {
      metric,
      value: Math.round(value),
      unit: 'ms',
    })
  }

  disable() {
    this.enabled = false
    this.flush()
  }

  enable() {
    this.enabled = true
  }
}

// Singleton global
const logger = new FrontendLogger()

export default logger
