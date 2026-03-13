import React from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, maxWidth = 500 }) {
  if (!open) return null

  return (
    <div 
      style={{
        position: 'fixed', 
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 20
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg)',
          borderRadius: 16,
          width: '100%', 
          maxWidth: maxWidth,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex', 
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            {title}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="btn-icon"
            style={{ margin: '-8px -8px -8px 0' }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  )
}