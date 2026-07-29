import { type ComponentType, type ReactNode } from 'react';
import {
  Typography,
  Box,
  ListSubheader,
  Chip,
} from '@mui/material';
import {
  EnhancedDialog,
  EnhancedDialogContent,
} from '../../../shared/components/EnhancedDialog';
import {
  DropdownSelect,
  DropdownMenuItem,
  dropdownMenuStylesDark
} from '../../../shared/components/Dropdown';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import {
  EDGE_SHAPE_OPTIONS,
  EDGE_STYLE_OPTIONS,
  toEdgeColorName,
} from '../../../shared/components/edgeAppearance';
import EdgeColorSwatches from '../../../shared/components/EdgeColorSwatches';
import { useProviderConfig, isModelAvailable } from '../hooks/useProviderConfig';
import { createScrollbarStyle, flowVizTheme, themePalettes, type ThemeMode } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';

/**
 * The canvas a theme paints, as a swatch — the same argument the edge glyphs
 * make, that a control should show its choice rather than name it.
 *
 * Each fill is read from the palette it belongs to rather than the active one,
 * so Dark shows the dark canvas even while you are looking at the light theme.
 * The border is `currentColor`, which is what keeps a light swatch visible on
 * the light dialog and a dark one visible on the dark dialog without either
 * needing to know which theme is up; it also brightens with the active segment.
 *
 * Sized in `em` like the edge glyphs, since SegmentedControl passes its icon
 * slot nothing but a font size.
 */
const themeGlyph = (fill: string) => {
  const Glyph = ({ sx }: { sx?: object }) => (
    <Box
      component="svg"
      viewBox="0 0 12 12"
      aria-hidden
      sx={{ width: '1em', height: '1em', flexShrink: 0, ...sx }}
    >
      <Box
        component="rect"
        x={1}
        y={1}
        width={10}
        height={10}
        rx={3}
        sx={{ fill, stroke: 'currentColor', strokeOpacity: 0.45, strokeWidth: 1.5 }}
      />
    </Box>
  );
  return Glyph;
};

const DarkGlyph = themeGlyph(themePalettes.dark.colors.background.primary);
const LightGlyph = themeGlyph(themePalettes.light.colors.background.primary);

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: DarkGlyph },
  { value: 'light', label: 'Light', icon: LightGlyph },
] as const satisfies readonly { value: ThemeMode; label: string; icon: ComponentType<{ sx?: object }> }[];

/**
 * A settings row: name on the left, control right-aligned.
 *
 * This replaced label-above-full-width-control, which spent two vertical slots
 * per setting and — because every control stretched — gave a binary Solid/Dashed
 * choice the same visual weight as the model picker. Controls now hug their
 * content, so a row's width tracks how much choice it actually offers.
 *
 * `minHeight` rather than padding alone: the segmented controls and the select
 * differ by a few px in height, and without a floor the rows lose their rhythm.
 */
function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        minHeight: 40,
        py: 0.75,
      }}
    >
      <Typography
        component="span"
        sx={{
          ...flowVizTheme.type.md,
          color: flowVizTheme.colors.text.secondary,
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** Groups rows without naming them — three section headings for five settings
 *  was more scaffolding than the content carries. */
const rowGroupDividerSx = {
  my: 1,
  borderTop: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
};

interface SettingsDialogProps {
  open: boolean;
  edgeColor: string;
  edgeStyle: string;
  edgeCurve: string;
  /** No `selectedProvider` counterpart: the provider is derived from whichever
   *  model is picked, so the dialog only ever writes it. */
  selectedModel: string;
  onClose: () => void;
  onEdgeColorChange: (color: string) => void;
  onEdgeStyleChange: (style: string) => void;
  onEdgeCurveChange: (curve: string) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

export default function SettingsDialog({
  open,
  edgeColor,
  edgeStyle,
  edgeCurve,
  selectedModel,
  onClose,
  onEdgeColorChange,
  onEdgeStyleChange,
  onEdgeCurveChange,
  onProviderChange,
  onModelChange,
}: SettingsDialogProps) {
  // Get provider configuration. `defaultModel` is the same fallback App.tsx
  // repairs to, so what this shows for an unavailable model is what gets stored.
  const {
    providers,
    selectedModel: defaultModel,
    setSelectedProvider: setProviderConfigProvider,
    isLoading,
    error,
  } = useProviderConfig();

  /**
   * What to say when there is nothing to choose from.
   *
   * `isLoading` and `error` were both already computed by the hook and both
   * thrown away here, so four different situations rendered as the same empty
   * box: still fetching, request failed, backend up but no API key configured,
   * and working. A select with no options and no explanation is a control you
   * have to debug from the outside — the way this was found was by noticing the
   * menu was blank and going to look for the server by hand.
   *
   * The failure message names no port. The frontend reaches the API through
   * Vite's proxy and has no idea what is on the other end; PORT is configurable,
   * so asserting 3001 would be a guess that reads as fact.
   */
  const modelPlaceholder =
    isLoading ? 'Loading models…'
    : error ? "Can't reach the server — is the backend running?"
    : providers.length === 0 ? 'No providers configured — add an API key to .env'
    : null;

  // Every setting applies — and persists — the moment it's picked. There is no
  // Save button and so no local mirror of the props: the theme already worked
  // this way, on the grounds that choosing one blind and then hunting for Save
  // is a worse way to choose a theme than simply seeing it, and that argument
  // was never specific to the theme.
  const { mode, setMode } = useThemeMode();

  return (
    <EnhancedDialog
      open={open}
      onClose={onClose}
      title="Settings"
      maxWidth="sm"
      fullWidth
      size="medium"
    >
      <EnhancedDialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>

          <SettingRow label="Theme">
            <SegmentedControl
              aria-label="Theme"
              options={THEME_OPTIONS}
              value={mode}
              onChange={setMode}
            />
          </SettingRow>

          <SettingRow label="Model">
            {modelPlaceholder ? (
              <Typography
                component="span"
                // Announced rather than silent: the row it replaces is the one
                // people open this dialog to use.
                role="status"
                sx={{
                  ...flowVizTheme.type.sm,
                  textAlign: 'right',
                  color: error
                    ? flowVizTheme.colors.status.error.text
                    : flowVizTheme.colors.text.tertiary,
                }}
              >
                {modelPlaceholder}
              </Typography>
            ) : (
            <DropdownSelect
              size="small"
              aria-label="Model"
              sx={{ minWidth: 220 }}
              value={
                // Fall back to a real option when the stored model isn't one
                // any configured provider offers, so the select doesn't sit
                // blank on a value it can't show. App.tsx repairs the stored
                // value to this same default, so the two agree.
                isModelAvailable(providers, selectedModel) ? selectedModel : defaultModel
              }
              onChange={(e) => {
                const model = e.target.value as string;
                onModelChange(model);

                // The provider follows from the model, since the menu is
                // grouped by provider and the two must not disagree.
                const provider = providers.find(p => p.models.includes(model));
                if (provider) {
                  onProviderChange(provider.id);
                  setProviderConfigProvider(provider.id);
                }
              }}
              MenuProps={{
                ...dropdownMenuStylesDark,
                PaperProps: {
                  ...dropdownMenuStylesDark.PaperProps,
                  sx: {
                    ...(dropdownMenuStylesDark.PaperProps?.sx as object),
                    maxHeight: '400px',
                    overflow: 'auto',
                    ...createScrollbarStyle('6px'),
                  } as any,
                },
                MenuListProps: {
                  ...dropdownMenuStylesDark.MenuListProps,
                  sx: {
                    ...(dropdownMenuStylesDark.MenuListProps?.sx as object),
                    py: 0.5,
                  },
                },
              }}
            >
              {providers.map((provider, providerIndex) => [
                <ListSubheader
                  key={`header-${provider.id}`}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: flowVizTheme.colors.menu.appBar,
                    // Was overlay ink at a flat 0.45, which is the same alpha in
                    // both themes and measured 2.94:1 on white — under the 4.5
                    // floor for a label this small. text.tertiary is the tuned
                    // step for exactly this: quiet, but still readable.
                    color: flowVizTheme.colors.text.tertiary,
                    fontWeight: 600,
                    // A group divider in the menu, so caps — on the scale and
                    // the shared tracking; was 0.7rem at 0.1em.
                    ...flowVizTheme.type.xs,
                    ...flowVizTheme.uppercase,
                    lineHeight: '32px',
                    py: 0.5,
                    px: 2,
                    mt: providerIndex > 0 ? 2 : 0.5,
                    mb: 0.5,
                    pointerEvents: 'none',
                  }}
                >
                  {provider.displayName}
                </ListSubheader>,
                ...provider.models.map((model) => {
                  // Check if this is a reasoning/thinking model
                  const isThinkingModel = model.startsWith('o1') || model.startsWith('o3');

                  return (
                    <DropdownMenuItem
                      key={model}
                      value={model}
                      sx={{
                        px: 2,
                        py: 1,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        // No `color` — DropdownMenuItem already sets
                        // text.primary, and the 0.9 that stood here was an
                        // untuned near-miss of it.
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        '&:hover': {
                          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
                          '&:hover': {
                            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
                          },
                        },
                      }}
                    >
                      <span>{model}</span>
                      {isThinkingModel && (
                        <Chip
                          label="Thinking"
                          size="small"
                          sx={{
                            height: '18px',
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            letterSpacing: '0.03em',
                            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
                            color: flowVizTheme.colors.text.secondary,
                            border: '1px solid rgba(var(--fv-overlay-rgb), 0.2)',
                            '& .MuiChip-label': {
                              px: 1,
                              py: 0,
                            },
                          }}
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })
              ])}
            </DropdownSelect>
            )}
          </SettingRow>

          <Box sx={rowGroupDividerSx} />

          {/* The edge inspector offers these same three choices per edge, and
              draws them with the same glyphs and swatches. It lays them out as
              labelled fields rather than rows, because it is a narrow panel
              with room for nothing else. */}
          <SettingRow label="Edge shape">
            <SegmentedControl
              aria-label="Edge shape"
              options={EDGE_SHAPE_OPTIONS}
              value={edgeCurve}
              onChange={onEdgeCurveChange}
            />
          </SettingRow>

          <SettingRow label="Edge style">
            <SegmentedControl
              aria-label="Edge style"
              options={EDGE_STYLE_OPTIONS}
              value={edgeStyle}
              onChange={onEdgeStyleChange}
            />
          </SettingRow>

          <SettingRow label="Edge colour">
            <EdgeColorSwatches
              aria-label="Edge colour"
              mode={mode}
              value={toEdgeColorName(edgeColor)}
              onChange={(color) => onEdgeColorChange(color.name)}
            />
          </SettingRow>

        </Box>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
}