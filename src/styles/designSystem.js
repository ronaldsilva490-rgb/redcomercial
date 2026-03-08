/**
 * GUIA DE DESIGN E PADRÃO DE LAYOUTS
 * RED COMMERCIAL v5.0
 * 
 * Este arquivo define os padrões de design para todas as páginas do sistema.
 * Garante responsividade, consistência visual e melhor UX.
 */

export const DESIGN_TOKENS = {
  CORES: {
    PRIMARY: '#dc141e',      // RED
    PRIMARY_DARK: '#a00515',
    PRIMARY_LIGHT: '#ff4d4d',
    
    BG_PRIMARY: '#080808',
    BG_SECONDARY: '#1a1a1a',
    BG_TERTIARY: 'rgba(255,255,255,0.03)',
    BG_HOVER: 'rgba(255,255,255,0.05)',
    
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: 'rgba(255,255,255,0.7)',
    TEXT_TERTIARY: 'rgba(255,255,255,0.5)',
    TEXT_MUTED: 'rgba(255,255,255,0.3)',
    
    BORDER: 'rgba(255,255,255,0.07)',
    BORDER_LIGHT: 'rgba(255,255,255,0.03)',
    
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },

  TYPOGRAPHY: {
    FONT_FAMILY: "'Outfit', sans-serif",
    
    H1: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5 },
    H2: { fontSize: 24, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3 },
    H3: { fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
    H4: { fontSize: 16, fontWeight: 700, lineHeight: 1.4 },
    
    BODY_LARGE: { fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
    BODY: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
    BODY_SMALL: { fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
    
    LABEL: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
    CAPTION: { fontSize: 11, fontWeight: 400, lineHeight: 1.4 },
  },

  SPACING: {
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 24,
    XXL: 32,
    XXXL: 48,
  },

  BORDER_RADIUS: {
    SM: 6,
    MD: 8,
    LG: 12,
    XL: 16,
  },

  SHADOWS: {
    SM: '0 1px 2px rgba(0,0,0,0.05)',
    MD: '0 4px 6px rgba(0,0,0,0.1)',
    LG: '0 10px 15px rgba(0,0,0,0.1)',
    XL: '0 20px 25px rgba(0,0,0,0.1)',
  },

  TRANSITIONS: {
    FAST: '0.15s ease',
    NORMAL: '0.2s ease',
    SLOW: '0.3s ease',
  },
};

/**
 * COMPONENTES DE LAYOUT PADRÃO
 */

// 1. PAGE HEADER - Usado em todas as páginas
export const PageHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: DESIGN_TOKENS.SPACING.XXL,
  flexWrap: 'wrap',
  gap: DESIGN_TOKENS.SPACING.LG,
};

export const PageTitleStyle = {
  fontSize: DESIGN_TOKENS.TYPOGRAPHY.H1.fontSize,
  fontWeight: DESIGN_TOKENS.TYPOGRAPHY.H1.fontWeight,
  color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
  margin: 0,
  marginBottom: DESIGN_TOKENS.SPACING.SM,
};

export const PageSubtitleStyle = {
  fontSize: DESIGN_TOKENS.TYPOGRAPHY.BODY_SMALL.fontSize,
  color: DESIGN_TOKENS.CORES.TEXT_TERTIARY,
  margin: 0,
};

// 2. CARD - Componente reutilizável
export const CardStyle = {
  padding: DESIGN_TOKENS.SPACING.LG,
  background: DESIGN_TOKENS.CORES.BG_TERTIARY,
  border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
  borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
  backdropFilter: 'blur(12px)',
  transition: `all ${DESIGN_TOKENS.TRANSITIONS.NORMAL}`,
  '&:hover': {
    background: DESIGN_TOKENS.CORES.BG_HOVER,
    borderColor: 'rgba(255,255,255,0.1)',
  },
};

// 3. GRID RESPONSIVO
export const RESPONSIVE_GRID = {
  DESKTOP: 'repeat(auto-fit, minmax(280px, 1fr))',
  TABLET: 'repeat(auto-fit, minmax(240px, 1fr))',
  MOBILE: '1fr',
};

// 4. BUTTON VARIANTS
export const ButtonVariants = {
  PRIMARY: {
    background: `linear-gradient(135deg, ${DESIGN_TOKENS.CORES.PRIMARY} 0%, ${DESIGN_TOKENS.CORES.PRIMARY_DARK} 100%)`,
    color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
    border: 'none',
  },
  SECONDARY: {
    background: DESIGN_TOKENS.CORES.BG_TERTIARY,
    color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
    border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
  },
  DANGER: {
    background: `rgba(${239}, ${68}, ${68}, 0.1)`,
    color: DESIGN_TOKENS.CORES.ERROR,
    border: `1px solid ${DESIGN_TOKENS.CORES.ERROR}20`,
  },
};

// 5. INPUT STYLE
export const InputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: `${DESIGN_TOKENS.SPACING.MD}px ${DESIGN_TOKENS.SPACING.LG}px`,
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${DESIGN_TOKENS.CORES.BORDER}`,
  borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
  color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
  fontSize: DESIGN_TOKENS.TYPOGRAPHY.BODY.fontSize,
  outline: 'none',
  transition: `all ${DESIGN_TOKENS.TRANSITIONS.FAST}`,
  fontFamily: DESIGN_TOKENS.TYPOGRAPHY.FONT_FAMILY,
};

/**
 * BREAKPOINTS RESPONSIVOS
 */
export const BREAKPOINTS = {
  MOBILE: 480,      // Até 480px
  TABLET: 768,      // Até 768px
  DESKTOP: 1024,    // Até 1024px
  WIDE: 1440,       // 1440px ou mais
};

/**
 * HELPER FUNCTION - Aplicar espaçamento responsivo
 */
export const getResponsiveSpacing = (mobile, tablet, desktop) => {
  return (width) => {
    if (width <= BREAKPOINTS.MOBILE) return mobile;
    if (width <= BREAKPOINTS.TABLET) return tablet;
    return desktop;
  };
};

/**
 * PADRÃO DE PÁGINA
 * Todas as páginas devem seguir este padrão:
 * 
 * <div style={PageContainerStyle}>
 *   <div style={PageHeaderStyle}>
 *     <div>
 *       <h1 style={PageTitleStyle}>Título da Página</h1>
 *       <p style={PageSubtitleStyle}>Descrição breve</p>
 *     </div>
 *     <div>{action buttons}</div>
 *   </div>
 *
 *   <div style={{
 *     display: 'grid',
 *     gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
 *     gap: 16,
 *     marginBottom: 24
 *   }}>
 *     {content cards}
 *   </div>
 * </div>
 */

export const PageContainerStyle = {
  minHeight: '100vh',
  padding: `${DESIGN_TOKENS.SPACING.LG}px`,
  background: `linear-gradient(135deg, ${DESIGN_TOKENS.CORES.BG_PRIMARY} 0%, ${DESIGN_TOKENS.CORES.BG_SECONDARY} 100%)`,
  color: DESIGN_TOKENS.CORES.TEXT_PRIMARY,
  fontFamily: DESIGN_TOKENS.TYPOGRAPHY.FONT_FAMILY,
};

export const ContentGridStyle = {
  display: 'grid',
  gridTemplateColumns: RESPONSIVE_GRID.DESKTOP,
  gap: DESIGN_TOKENS.SPACING.LG,
  marginBottom: DESIGN_TOKENS.SPACING.XXL,
};

/**
 * ÍCONES RECOMENDADOS
 * Use lucide-react para todos os ícones:
 * import { IconName } from 'lucide-react'
 * 
 * Tamanhos padrão:
 * - Headers: 24px
 * - Buttons: 16px
 * - Cards: 20px
 * - Inline: 16px
 */

/**
 * MEDIA QUERIES CSS
 * Adicionar ao <style> ou CSS-in-JS:
 * 
 * @media (max-width: 768px) {
 *   gridTemplateColumns deve virar '1fr 1fr' ou '1fr'
 *   font-sizes reduzem em ~10%
 *   padding reduz em ~20%
 * }
 * 
 * @media (max-width: 480px) {
 *   gridTemplateColumns deve virar '1fr'
 *   font-sizes reduzem em ~20%
 *   padding reduz em ~30%
 *   gaps reduzem em ~25%
 * }
 */

export default {
  DESIGN_TOKENS,
  PageHeaderStyle,
  PageTitleStyle,
  PageSubtitleStyle,
  CardStyle,
  InputStyle,
  ButtonVariants,
  BREAKPOINTS,
  RESPONSIVE_GRID,
  PageContainerStyle,
  ContentGridStyle,
};
