import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import logger from './services/frontendLogger.js'

// Inicializa logging global
logger.captureGlobalErrors()
logger.captureConsole()
logger.info('App iniciado')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
