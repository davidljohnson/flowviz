import { createTheme, type Theme } from '@mui/material';
import { themePalettes, typeScale, flowVizTheme, type ThemeMode } from './flowviz-theme';

/**
 * The MUI theme for one mode.
 *
 * Unlike component styling, this can't use the `var(--fv-*)` tokens: MUI runs
 * `lighten`/`darken`/`alpha` over palette entries when it augments the theme,
 * and those need real colors. So the raw palette is read directly here, and
 * the theme object is rebuilt when the mode changes.
 */
export const createMuiTheme = (mode: ThemeMode): Theme => {
  const { colors, shadows } = themePalettes[mode];

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent.blue,
      },
      secondary: {
        main: colors.accent.orange,
      },
      background: {
        default: colors.background.primary,
        paper: colors.background.secondary,
      },
      text: {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
      },
      success: {
        main: colors.accent.green,
      },
      error: {
        main: colors.accent.red,
      },
      warning: {
        main: colors.accent.orange,
      },
      info: {
        main: colors.accent.blue,
      },
    },
    // MUI ships Material's own type ramp — body2 at 14px, h6 at 20px, h4 at
    // 34px — none of which is on this system's scale. Since `variant="body2"`
    // and `variant="caption"` are used ~22 times between them, the variants are
    // mapped onto `typeScale` so a MUI Typography and a FlowViz one agree.
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      h4: { ...typeScale['2xl'], fontWeight: 600 },
      h5: { ...typeScale.xl, fontWeight: 600 },
      h6: { ...typeScale.xl, fontWeight: 600 },
      subtitle1: { ...typeScale.lg, fontWeight: 600 },
      subtitle2: { ...typeScale.lg, fontWeight: 600 },
      body1: { ...typeScale.lg },
      body2: { ...typeScale.md },
      caption: { ...typeScale.sm },
      overline: { ...typeScale.xs, ...flowVizTheme.uppercase },
      button: { ...typeScale.md, fontWeight: 500, textTransform: 'none' },
    },

    // Bare MUI components inherit the standard radius rather than Material's 4.
    // Safe only because every `borderRadius: <number>` in an sx prop was
    // converted to a token first — sx multiplies numbers by this value.
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // Inter is drawn for antialiased rendering. Without this the browser
            // uses subpixel smoothing, which thickens the strokes on a dark UI and
            // makes every weight read a step heavier than intended — the main
            // reason the labels looked off before. Grayscale smoothing renders it
            // at its true weight, the way it's shown on the Inter/Linear specimens.
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
        },
      },
      /**
       * MUI's dark palette paints every Paper with an elevation-based
       * `backgroundImage` gradient that lightens as elevation rises. This
       * system expresses elevation with an explicit four-step background
       * ladder, so the overlay just fights it and makes menus and dialogs
       * drift off their tokens.
       */
      MuiPaper: {
        styleOverrides: {
          // Only the gradient is removed — `palette.background.paper` already
          // supplies the fill, so setting a colour here would override any
          // surface that deliberately picks a different step of the ladder.
          root: { backgroundImage: 'none' },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.menu.dialog,
            border: `1px solid ${colors.surface.border.default}`,
            borderRadius: flowVizTheme.borderRadius.lg,
            boxShadow: shadows.md,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.menu.dialog,
            border: `1px solid ${colors.surface.border.default}`,
            borderRadius: flowVizTheme.borderRadius.lg,
            boxShadow: shadows.md,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.menu.dialog,
            border: `1px solid ${colors.surface.border.default}`,
            borderRadius: flowVizTheme.borderRadius.xl,
            boxShadow: shadows.lg,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: flowVizTheme.borderRadius.md,
            color: colors.text.secondary,
            transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}`,
            '&:hover': { backgroundColor: colors.surface.hover, color: colors.text.primary },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: flowVizTheme.borderRadius.sm },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: colors.surface.border.subtle },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: flowVizTheme.borderRadius.md },
          notchedOutline: { borderColor: colors.surface.border.default },
        },
      },
      MuiTooltip: {
        defaultProps: {
          // Tooltips sit on rows of adjacent icon buttons (inspector headers, the
          // app bar). With MUI's defaults, sweeping across such a
          // row fires each one in turn, and because the outgoing tooltip's exit
          // transition outlives the next one's entrance, two poppers are briefly
          // on screen at once — read as a dark patch flashing under the buttons.
          //
          // A real intent-to-read pause is longer than a sweep, so hold entry
          // long enough to tell them apart, and drop the interactive hover-bridge
          // that kept a dismissed tooltip alive.
          enterDelay: 400,
          enterNextDelay: 400,
          disableInteractive: true,
        },
      },
    },
  });
};
