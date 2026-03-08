/**
 * COMPONENTES REUTILIZÁVEIS
 * Componentes que devem ser usados em todas as páginas para manter consistência
 */

import { X, ChevronDown, Search } from 'lucide-react'
import { DESIGN_TOKENS } from '../styles/designSystem'

/**
 * PAGE HEADER COMPONENT
 * Usado em todas as páginas para mostrar título + descrição + actions
 */
export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: DESIGN_TOKENS.SPACING.XXL,
      flexWrap: 'wrap',
      gap: DESIGN_TOKENS.SPACING.LG,
    }}>
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.SPACING.MD,
          marginBottom: DESIGN_TOKENS.SPACING.SM
        }}>
          {Icon && <Icon size={28} color={DESIGN_TOKENS.CORES.PRIMARY} />}
          <h1 style={{
            ...DESIGN_TOKENS.TYPOGRAPHY.H1,
            color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
            margin: 0
          }}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p style={{
            ...DESIGN_TOKENS.TYPOGRAPHY.BODY_SMALL,
            color: DESIGN_TOKENS.CORES.TEXT_TERTIARY,
            margin: 0
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{
          display: 'flex',
          gap: DESIGN_TOKENS.SPACING.MD,
          flexWrap: 'wrap',
          minWidth: 200,
          justifyContent: 'flex-end'
        }}>
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * CARD COMPONENT
 * Componente base para exibir informações
 */
export function Card({ children, onClick, interactive = false, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: DESIGN_TOKENS.SPACING.LG,
        background: DESIGN_TOKENS.CORES.BG_TERTIARY,
        border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
        borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
        transition: `all ${DESIGN_TOKENS.TRANSITIONS.NORMAL}`,
        cursor: interactive ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.background = DESIGN_TOKENS.CORES.BG_HOVER
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.background = DESIGN_TOKENS.CORES.BG_TERTIARY
          e.currentTarget.style.borderColor = DESIGN_TOKENS.CORES.BORDER
        }
      }}
    >
      {children}
    </div>
  )
}

/**
 * METRIC CARD COMPONENT
 * Para exibir números e métricas
 */
export function MetricCard({ icon: Icon, label, value, unit = '', trend = null, color = '#3b82f6' }) {
  const rgb = color.slice(1).match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')
  
  return (
    <Card style={{
      background: `rgba(${rgb}, 0.1)`,
      border: `1px solid rgba(${rgb}, 0.2)`,
      textAlign: 'center'
    }}>
      {Icon && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: DESIGN_TOKENS.SPACING.MD,
          opacity: 0.7
        }}>
          <Icon size={24} color={color} />
        </div>
      )}
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1,
        marginBottom: DESIGN_TOKENS.SPACING.SM
      }}>
        {value} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{unit}</span>
      </div>
      <div style={{
        ...DESIGN_TOKENS.TYPOGRAPHY.BODY_SMALL,
        color: DESIGN_TOKENS.CORES.TEXT_TERTIARY
      }}>
        {label}
      </div>
      {trend && (
        <div style={{
          marginTop: DESIGN_TOKENS.SPACING.MD,
          fontSize: 12,
          color: trend.positive ? DESIGN_TOKENS.CORES.SUCCESS : DESIGN_TOKENS.CORES.ERROR
        }}>
          {trend.positive ? '↑' : '↓'} {trend.value}%
        </div>
      )}
    </Card>
  )
}

/**
 * BUTTON COMPONENT
 * Botão padrão com variantes
 */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  ...props
}) {
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${DESIGN_TOKENS.CORES.PRIMARY} 0%, ${DESIGN_TOKENS.CORES.PRIMARY_DARK} 100%)`,
      color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
      border: 'none',
    },
    secondary: {
      background: DESIGN_TOKENS.CORES.BG_TERTIARY,
      color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
      border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
    },
    danger: {
      background: `rgba(239, 68, 68, 0.1)`,
      color: DESIGN_TOKENS.CORES.ERROR,
      border: `1px solid rgba(239, 68, 68, 0.3)`,
    },
  }

  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '10px 16px', fontSize: 13 },
    lg: { padding: '12px 20px', fontSize: 14 },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variants[variant],
        ...sizes[size],
        border: variants[variant].border,
        borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: `all ${DESIGN_TOKENS.TRANSITIONS.FAST}`,
        fontWeight: 600,
        fontFamily: DESIGN_TOKENS.TYPOGRAPHY.FONT_FAMILY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DESIGN_TOKENS.SPACING.SM,
        opacity: disabled || loading ? 0.6 : 1,
        ...props.style
      }}
    >
      {loading && <div style={{
        width: 14, height: 14, border: '2px solid currentColor',
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />}
      {Icon && !loading && <Icon size={16} />}
      {children}
    </button>
  )
}

/**
 * INPUT COMPONENT
 * Input padrão
 */
export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled,
  icon: Icon,
  ...props
}) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          ...DESIGN_TOKENS.TYPOGRAPHY.LABEL,
          color: DESIGN_TOKENS.CORES.TEXT_TERTIARY,
          marginBottom: DESIGN_TOKENS.SPACING.SM
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: `${DESIGN_TOKENS.SPACING.MD}px ${Icon ? '40px' : DESIGN_TOKENS.SPACING.LG}px`,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${error ? DESIGN_TOKENS.CORES.ERROR : DESIGN_TOKENS.CORES.BORDER}`,
            borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
            color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
            fontSize: DESIGN_TOKENS.TYPOGRAPHY.BODY.fontSize,
            outline: 'none',
            transition: `all ${DESIGN_TOKENS.TRANSITIONS.FAST}`,
            fontFamily: DESIGN_TOKENS.TYPOGRAPHY.FONT_FAMILY,
            opacity: disabled ? 0.5 : 1,
          }}
          {...props}
        />
        {Icon && (
          <Icon
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none'
            }}
            size={18}
          />
        )}
      </div>
      {error && (
        <p style={{
          ...DESIGN_TOKENS.TYPOGRAPHY.CAPTION,
          color: DESIGN_TOKENS.CORES.ERROR,
          marginTop: DESIGN_TOKENS.SPACING.SM,
          margin: 0
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * SEARCH BAR COMPONENT
 */
export function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      icon={Search}
    />
  )
}

/**
 * TABLE COMPONENT
 * Tabela responsiva
 */
export function Table({ headers, rows, onRowClick }) {
  return (
    <div style={{
      background: DESIGN_TOKENS.CORES.BG_TERTIARY,
      border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
      borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
      overflow: 'hidden'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
      }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DESIGN_TOKENS.CORES.BORDER}` }}>
            {headers.map((header, idx) => (
              <th
                key={idx}
                style={{
                  padding: DESIGN_TOKENS.SPACING.MD,
                  textAlign: 'left',
                  ...DESIGN_TOKENS.TYPOGRAPHY.LABEL,
                  color: DESIGN_TOKENS.CORES.TEXT_TERTIARY
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ridx) => (
            <tr
              key={ridx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: `background ${DESIGN_TOKENS.TRANSITIONS.FAST}`
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.background = DESIGN_TOKENS.CORES.BG_HOVER
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.background = 'transparent'
              }}
            >
              {row.map((cell, cidx) => (
                <td
                  key={cidx}
                  style={{
                    padding: DESIGN_TOKENS.SPACING.MD,
                    ...DESIGN_TOKENS.TYPOGRAPHY.BODY_SMALL,
                    color: DESIGN_TOKENS.CORES.TEXT_SECONDARY
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * BADGE COMPONENT
 */
export function Badge({ label, variant = 'info', icon: Icon }) {
  const variants = {
    info: { background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    success: { background: 'rgba(34, 197, 94, 0.2)', color: DESIGN_TOKENS.CORES.SUCCESS },
    warning: { background: 'rgba(245, 158, 11, 0.2)', color: DESIGN_TOKENS.CORES.WARNING },
    error: { background: 'rgba(239, 68, 68, 0.2)', color: DESIGN_TOKENS.CORES.ERROR },
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: DESIGN_TOKENS.BORDER_RADIUS.MD,
      ...DESIGN_TOKENS.TYPOGRAPHY.CAPTION,
      fontWeight: 600,
      ...variants[variant]
    }}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  )
}

/**
 * MODAL COMPONENT
 */
export function Modal({ title, onClose, children, actions }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease'
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999,
          background: DESIGN_TOKENS.CORES.BG_SECONDARY,
          border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
          borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
          padding: DESIGN_TOKENS.SPACING.LG,
          maxWidth: '90vw',
          width: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'slideUp 0.3s ease'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: DESIGN_TOKENS.SPACING.LG,
          paddingBottom: DESIGN_TOKENS.SPACING.MD,
          borderBottom: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`
        }}>
          <h2 style={{
            ...DESIGN_TOKENS.TYPOGRAPHY.H3,
            margin: 0
          }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: DESIGN_TOKENS.CORES.TEXT_TERTIARY,
              cursor: 'pointer',
              padding: 0
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: DESIGN_TOKENS.SPACING.LG }}>
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div style={{
            display: 'flex',
            gap: DESIGN_TOKENS.SPACING.MD,
            borderTop: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
            paddingTop: DESIGN_TOKENS.SPACING.LG
          }}>
            {actions}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, -45%); opacity: 0; }
          to { transform: translate(-50%, -50%); opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default {
  PageHeader,
  Card,
  MetricCard,
  Button,
  Input,
  SearchBar,
  Table,
  Badge,
  Modal,
}
