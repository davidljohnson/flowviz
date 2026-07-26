import { createTheme, type Theme } from '@mui/material';
import { themePalettes, type ThemeMode } from './flowviz-theme';

/**
 * The MUI theme for one mode.
 *
 * Unlike component styling, this can't use the `var(--fv-*)` tokens: MUI runs
 * `lighten`/`darken`/`alpha` over palette entries when it augments the theme,
 * and those need real colors. So the raw palette is read directly here, and
 * the theme object is rebuilt when the mode changes.
 */
export const createMuiTheme = (mode: ThemeMode): Theme => {
  const { colors } = themePalettes[mode];

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
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
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
