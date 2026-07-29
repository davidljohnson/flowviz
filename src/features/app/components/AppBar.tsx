import { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Box,
  Divider,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import CodeIcon from '@mui/icons-material/Code';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { ActionMenu } from '../../../shared/components/Dropdown';
import { ToolbarIconButton, ToolbarButton } from '../../../shared/components/Button';
import { FlowIcon } from '../../../shared/components/Typography';
import FlowMark from '../../../shared/components/icons/FlowMark';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { shortcut, shortcutHint } from '../../../shared/utils/shortcuts';

interface AppBarProps {
  exportFunction: ((format: 'png' | 'json' | 'afb' | 'flowviz') => void) | null;
  /**
   * False when the canvas is empty — there would be nothing to put in a file.
   * Gates Export as well as Save: an empty canvas exports an empty PNG and a
   * STIX bundle with no objects in it, which is the same defect the Save guard
   * was added for. Was `canSave`, which named one of the two buttons reading it.
   */
  canvasHasContent: boolean;
  onNewSearch: () => void;
  onDownloadClick: (format: 'png' | 'json' | 'afb' | 'flowviz') => void;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onSettingsClick: () => void;
  onOpenCommandPalette: () => void;
}

export default function AppBar({
  exportFunction,
  canvasHasContent,
  onNewSearch,
  onDownloadClick,
  onSaveClick,
  onLoadClick,
  onSettingsClick,
  onOpenCommandPalette,
}: AppBarProps) {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

  const canExport = Boolean(exportFunction) && canvasHasContent;

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownloadClick = (format: 'png' | 'json' | 'afb' | 'flowviz') => {
    onDownloadClick(format);
    handleDownloadMenuClose();
  };

  return (
    <MuiAppBar 
      position="static" 
      elevation={0}
      sx={{
        // The ladder step that exists for this surface. What stood here was a
        // `backgroundColor` immediately cancelled by a `background` shorthand
        // below it — the bar computed to transparent — and the gradient that
        // replaced it did nothing on dark either, because `--fv-panel-rgb` is
        // the same #08090a as `background.primary`, so it faded the colour into
        // itself. On light it ran the ladder backwards, fading toward white.
        // One opaque token and the hairline border carry the elevation now.
        backgroundColor: flowVizTheme.colors.menu.appBar,
        // MuiAppBar defaults to primary.contrastText (white), which is invisible
        // on a light bar. Anything inheriting from the toolbar wants the
        // theme's own ink instead.
        color: flowVizTheme.colors.text.primary,
        borderBottom: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
      }}
    >
      {/* 52, down from 64. A 64px bar over a 28px control row is mostly air,
          and this is a dense tool whose type tops out at 18px. `minHeight` has
          to be set at every breakpoint or MUI's own responsive Toolbar rules
          put 64 back on anything wider than a phone. */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minHeight: 52,
          '@media (min-width: 600px)': { minHeight: 52 },
        }}
      >
        {/* Left Side - Brand */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flex: '1 1 0',
          justifyContent: 'flex-start'
        }}>
          {/* The wordmark used to shimmer while streaming. StreamingProgressBar
              already reports that state, directly under this bar, as the 2px
              indeterminate line the convention calls for — so the animation was
              a second indicator for one condition, and it put the motion on the
              one element in the product that should never move. */}
          <Typography
            variant="h6"
            sx={{
              // Drawn in the overlay ink, so it inverts with the theme: silver
              // on dark, graphite on light.
              background: 'linear-gradient(135deg, rgba(var(--fv-overlay-rgb), 1) 0%, rgba(var(--fv-overlay-rgb), 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            FlowViz
          </Typography>
        </Box>

        {/* Centre — the command palette's only visible affordance.
            ⌘K was the best thing in the product and nothing on screen said it
            existed, which meant it was found by people who already expected it.
            Styled as a field rather than a button on purpose: it should read as
            somewhere to type, and it must not compete with Analyze, which is
            the row's one emphasised control. The magnifier is honest here — it
            really does search. Hidden on narrow viewports, where the bar has no
            room to spare and ⌘K still works. */}
        <Box
          component="button"
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open the command palette"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            width: 260,
            height: flowVizTheme.controlSize,
            px: 1.25,
            cursor: 'pointer',
            font: 'inherit',
            ...flowVizTheme.type.md,
            color: flowVizTheme.colors.text.tertiary,
            backgroundColor: flowVizTheme.colors.surface.recessed,
            border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
            borderRadius: flowVizTheme.borderRadius.md,
            transition: `background-color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}`,
            '&:hover': {
              color: flowVizTheme.colors.text.secondary,
              borderColor: flowVizTheme.colors.surface.border.default,
            },
          }}
        >
          <FlowIcon size="tiny">
            <SearchIcon />
          </FlowIcon>
          <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
            Search commands…
          </Box>
          <Box
            component="kbd"
            sx={{
              ...flowVizTheme.type.xs,
              fontFamily: 'inherit',
              color: flowVizTheme.colors.text.disabled,
              border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
              borderRadius: flowVizTheme.borderRadius.xs,
              px: 0.5,
              py: '1px',
            }}
          >
            {shortcut('K')}
          </Box>
        </Box>

        {/* Right Side - Action Buttons.
            Everything here is ghost except Analyze, which is the bar's primary
            verb and the only button carrying a fill and a border. Five buttons
            drawn identically gave the row no hierarchy at all — Analyze and
            Settings, the most and least important things on the bar, were
            indistinguishable. The gap is tighter than it was because ghost
            buttons no longer have borders holding them apart. */}
        <Box sx={{
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
          flex: '1 1 0',
          justifyContent: 'flex-end'
        }}>
          {/* Labelled, and the only filled control in the row. It was a
              magnifying glass, which named the wrong thing — this opens an
              analyse dialog, it does not search anything — and asked you to
              infer the bar's primary verb from a picture. A document was the
              next attempt, and named the input; FlowMark names the outcome,
              which is the thing anyone presses this for. Not a wand or a
              sparkle: the wand is spoken for by "Clean up layout" and the
              sparkle by the assistant. */}
          <Tooltip title="Analyze a report" placement="bottom">
            <ToolbarButton onClick={onNewSearch}>
              <FlowIcon size="tiny">
                <FlowMark />
              </FlowIcon>
              Analyze
            </ToolbarButton>
          </Tooltip>

          {/* Disabled rather than unmounted. Rendering it conditionally meant
              the row shifted left by a button as soon as the canvas mounted,
              and it answered "not available yet" differently from Save directly
              beside it. It reads the same emptiness test as Save, too — the
              export function is installed when the canvas mounts, so keying off
              that alone would have left Export live on an empty canvas next to
              a Save button that had already turned itself off. */}
          <Tooltip
            title={canExport ? `Export options ${shortcutHint('E')}` : 'Nothing on the canvas to export yet'}
            placement="bottom"
          >
            <span>
              <ToolbarIconButton
                onClick={handleDownloadMenuOpen}
                size="small"
                disabled={!canExport}
                aria-label="Export options"
              >
                <FlowIcon size="tiny">
                  <DownloadIcon />
                </FlowIcon>
              </ToolbarIconButton>
            </span>
          </Tooltip>

          {/* Off with an empty canvas: saving one produced a stored analysis
              containing nothing, and the dialog's own guard only catches it
              after you have opened a dialog whose primary action is already
              dead. The span is load-bearing — a disabled button emits no
              pointer events, so a Tooltip wrapped straight around it never
              fires, which is exactly the state whose reason needs explaining. */}
          <Tooltip
            title={canvasHasContent ? `Save analysis ${shortcutHint('S')}` : 'Nothing on the canvas to save yet'}
            placement="bottom"
          >
            <span>
              <ToolbarIconButton
                onClick={onSaveClick}
                size="small"
                disabled={!canvasHasContent}
                aria-label="Save analysis"
              >
                <FlowIcon size="tiny">
                  <SaveIcon />
                </FlowIcon>
              </ToolbarIconButton>
            </span>
          </Tooltip>

          <Tooltip title={`Load analysis ${shortcutHint('O')}`} placement="bottom">
            <ToolbarIconButton
              onClick={onLoadClick}
              size="small"
              aria-label="Load analysis"
            >
              <FlowIcon size="tiny">
                <FolderOpenIcon />
              </FlowIcon>
            </ToolbarIconButton>
          </Tooltip>

          {/* Settings configures the app; everything left of it acts on the
              flow. The rule is what separates the two. */}
          <Divider
            orientation="vertical"
            flexItem
            sx={{ height: 20, alignSelf: 'center', mx: 0.5 }}
          />

          <Tooltip title={`Settings ${shortcutHint(',')}`} placement="bottom">
            <ToolbarIconButton
              onClick={onSettingsClick}
              size="small"
              aria-label="Settings"
            >
              <FlowIcon size="tiny">
                <SettingsIcon />
              </FlowIcon>
            </ToolbarIconButton>
          </Tooltip>
        </Box>

        {/* Download Menu */}
        <ActionMenu
          anchorEl={downloadMenuAnchor}
          open={Boolean(downloadMenuAnchor)}
          onClose={handleDownloadMenuClose}
          variant="dark"
          items={[
            {
              id: 'png',
              text: 'Export as PNG',
              icon: <ImageIcon fontSize="small" />,
              onClick: () => handleDownloadClick('png'),
            },
            {
              id: 'json',
              text: 'Export as STIX Bundle',
              icon: <CodeIcon fontSize="small" />,
              onClick: () => handleDownloadClick('json'),
            },
            {
              id: 'afb',
              text: 'Export as AFB',
              icon: <TextFieldsIcon fontSize="small" />,
              onClick: () => handleDownloadClick('afb'),
            },
            {
              id: 'flowviz',
              text: 'Export as FlowViz',
              icon: <AccountTreeIcon fontSize="small" />,
              onClick: () => handleDownloadClick('flowviz'),
            },
          ]}
        />
      </Toolbar>
    </MuiAppBar>
  );
}