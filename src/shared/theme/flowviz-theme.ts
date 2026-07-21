export const flowVizTheme = {
  // Core color palette
  colors: {
    // Background system
    background: {
      primary: '#0d1117',           // Main dark background
      secondary: '#161b22',         // Elevated surfaces
      glass: 'rgba(13, 17, 23, 0.95)', // Glassmorphism background
      glassLight: 'rgba(20, 25, 35, 0.92)', // Lighter glass variant
    },

    // Menu/Dropdown system
    menu: {
      appBar: 'rgba(13, 17, 23, 0.95)',     // Dark dropdown for AppBar
      dialog: 'rgba(20, 25, 35, 0.92)',     // Lighter dropdown for dialogs
    },

    // Surface states
    surface: {
      // Interactive states
      rest: 'rgba(255, 255, 255, 0.03)',
      hover: 'rgba(255, 255, 255, 0.08)',  
      active: 'rgba(255, 255, 255, 0.15)',
      focus: 'rgba(255, 255, 255, 0.1)',
      
      // Borders - monochrome only
      border: {
        subtle: 'rgba(255, 255, 255, 0.05)',
        default: 'rgba(255, 255, 255, 0.1)',
        emphasis: 'rgba(255, 255, 255, 0.2)',
        focus: 'rgba(255, 255, 255, 0.5)',  // Monochrome focus instead of blue
      }
    },

    // Text hierarchy
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',   // High contrast
      secondary: 'rgba(255, 255, 255, 0.7)',  // Standard text
      tertiary: 'rgba(255, 255, 255, 0.5)',   // Subtle text
      disabled: 'rgba(255, 255, 255, 0.3)',   // Disabled state
    },

    // Status colors
    status: {
      success: {
        bg: 'rgba(76, 175, 80, 0.1)',
        text: 'rgba(76, 175, 80, 0.9)',
        border: 'rgba(76, 175, 80, 0.2)',
        accent: '#4caf50'
      },
      error: {
        bg: 'rgba(244, 67, 54, 0.1)',
        text: 'rgba(244, 67, 54, 0.9)', 
        border: 'rgba(244, 67, 54, 0.2)',
        accent: '#f44336'
      },
      warning: {
        bg: 'rgba(255, 193, 7, 0.1)',
        text: 'rgba(255, 193, 7, 0.9)',
        border: 'rgba(255, 193, 7, 0.2)', 
        accent: '#ff9800'
      },
      info: {
        bg: 'rgba(33, 150, 243, 0.1)',
        text: 'rgba(33, 150, 243, 0.9)',
        border: 'rgba(33, 150, 243, 0.2)',
        accent: '#2196f3'
      }
    },

    // Accent colors for nodes and highlights
    accent: {
      blue: '#3b82f6',      // Primary blue
      purple: '#8b5cf6',    // Purple accents
      green: '#10b981',     // Success green  
      orange: '#f59e0b',    // Warning orange
      red: '#ef4444',       // Error red
    }
  },

  // Layout tokens
  spacing: {
    xs: 4,
    sm: 8,  
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  borderRadius: {
    sm: 6,    // Small elements (chips, etc)
    md: 8,    // Standard (buttons, inputs)
    lg: 12,   // Cards and elevated surfaces
    xl: 16,   // Dialogs and major containers
    xxl: 20,  // Hero elements
  },

  // Effects - blur and shadow
  effects: {
    blur: {
      light: 'blur(10px)',
      standard: 'blur(12px)', 
      heavy: 'blur(20px)',
    },
    shadows: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
      md: '0 4px 16px rgba(0, 0, 0, 0.2)',
      lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
      glow: '0 0 20px rgba(59, 130, 246, 0.3)',
    }
  },

  // Animation
  motion: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
} as const;

export const createGlassStyle = (opacity = 0.95) => ({
  background: `rgba(13, 17, 23, ${opacity})`,
  border: '1px solid rgba(255, 255, 255, 0.1)', 
  borderRadius: flowVizTheme.borderRadius.lg,
  backdropFilter: flowVizTheme.effects.blur.heavy,
  boxShadow: flowVizTheme.effects.shadows.md,
});


export const createStatusStyle = (status: 'success' | 'error' | 'warning' | 'info') => ({
  backgroundColor: flowVizTheme.colors.status[status].bg,
  color: flowVizTheme.colors.status[status].text,
  border: `1px solid ${flowVizTheme.colors.status[status].border}`,
  borderRadius: flowVizTheme.borderRadius.md,
  backdropFilter: flowVizTheme.effects.blur.light,
});

// Scrollbar styling utility
export const createScrollbarStyle = (width = '6px') => ({
  '&::-webkit-scrollbar': {
    width,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.15)',
    },
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: 'rgba(255, 255, 255, 0.2)',
  },
  // For Firefox
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
});