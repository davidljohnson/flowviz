import { type ReactNode } from 'react';
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
import { useProviderConfig, isModelAvailable } from '../hooks/useProviderConfig';
import { createScrollbarStyle, flowVizTheme, type ThemeMode } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const satisfies readonly { value: ThemeMode; label: string }[];

/**
 * A bit of edge drawn as a glyph, so the choice shows the thing rather than
 * naming it.
 *
 * Each family varies exactly one property and holds the rest fixed, which is
 * what keeps them readable at 14px and keeps the two rows from being confused
 * for one another:
 *   shape — three different routings, same stroke, all corner to corner.
 *   style — same neutral horizontal, different stroke. Deliberately NOT the
 *           diagonal: reusing shape's straight run would draw the same glyph in
 *           two rows to mean two different things.
 *
 * Sized in `em` so it inherits the segment's `fontSize` like an icon font would;
 * SegmentedControl passes the icon slot nothing but a font size.
 */
const edgeGlyph = (path: string, dash?: string) => {
  const Glyph = ({ sx }: { sx?: object }) => (
    <Box
      component="svg"
      viewBox="0 0 16 10"
      fill="none"
      aria-hidden
      sx={{ width: '1.6em', height: '1em', flexShrink: 0, ...sx }}
    >
      <Box
        component="path"
        d={path}
        sx={{
          stroke: 'currentColor',
          strokeWidth: 1.5,
          // Round caps soften the shape glyphs' ends and corners, but they'd
          // ruin a dashed one: a cap adds strokeWidth/2 to each end of every
          // dash, so `3 3` would paint as 4.5 on / 1.5 off and read very nearly
          // solid at this size. Butt caps keep the 1:1 rhythm the real edges
          // draw with (`5 5`, in StreamingFlowVisualization).
          strokeLinecap: dash ? 'butt' : 'round',
          strokeLinejoin: 'round',
          ...(dash && { strokeDasharray: dash }),
        }}
      />
    </Box>
  );
  return Glyph;
};

const CurvedGlyph = edgeGlyph('M1 8 C 6 8, 10 2, 15 2');
const StraightGlyph = edgeGlyph('M1 8 L15 2');
const SteppedGlyph = edgeGlyph('M1 8 H8 V2 H15');

const SolidGlyph = edgeGlyph('M1 5 H15');
const DashedGlyph = edgeGlyph('M1 5 H15', '3 3');

const EDGE_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid', icon: SolidGlyph },
  { value: 'dashed', label: 'Dashed', icon: DashedGlyph },
] as const;

const EDGE_SHAPE_OPTIONS = [
  { value: 'smooth', label: 'Curved', icon: CurvedGlyph },
  { value: 'straight', label: 'Straight', icon: StraightGlyph },
  { value: 'step', label: 'Stepped', icon: SteppedGlyph },
] as const;

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
  } = useProviderConfig();

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
                    color: 'rgba(var(--fv-overlay-rgb), 0.45)',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
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
                        color: 'rgba(var(--fv-overlay-rgb), 0.9)',
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
                            color: 'rgba(var(--fv-overlay-rgb), 0.7)',
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
          </SettingRow>

          <Box sx={rowGroupDividerSx} />

          {/* The edge inspector offers these same three choices per edge. The
              options match it so the defaults here read as the thing they set —
              but it lays them out as labelled fields, because it is a narrow
              panel with room for nothing else. */}
          <SettingRow label="Edge color">
            <SegmentedControl
              aria-label="Edge color"
              options={[
                { value: 'default', label: 'Default' },
                // Stored as 'white' since that's what it has always been
                // written as; on a light canvas it renders as graphite.
                { value: 'white', label: 'Mono' },
                { value: 'blue', label: 'Blue' },
              ]}
              value={edgeColor}
              onChange={onEdgeColorChange}
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

          <SettingRow label="Edge shape">
            <SegmentedControl
              aria-label="Edge shape"
              options={EDGE_SHAPE_OPTIONS}
              value={edgeCurve}
              onChange={onEdgeCurveChange}
            />
          </SettingRow>

        </Box>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
}