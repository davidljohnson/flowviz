# Building with FlowViz

FlowViz is the design system of a cybersecurity tool that turns threat-intel
articles into MITRE ATT&CK attack-flow diagrams. It is **dark-first**: the dark
palette is the product's identity, and light is a fully-authored alternate.

## Wrapping — required

Every FlowViz component must render inside `ThemeModeProvider`. It is not
optional styling sugar: it emits the entire `--fv-*` custom-property set through
emotion's `GlobalStyles`, installs the MUI theme, and sets `data-theme` on
`<html>`. Outside it, components render unstyled and most token references
resolve to nothing.

```jsx
import { ThemeModeProvider, ReactFlowProvider, ActionNode, FlowAlert } from 'flowviz';

<ThemeModeProvider>
  <ReactFlowProvider>       {/* only needed if you render node components */}
    <FlowAlert status="warning" title="Partial extraction">
      The article was truncated; later sections were not analyzed.
    </FlowAlert>
  </ReactFlowProvider>
</ThemeModeProvider>
```

`ReactFlowProvider` is required for anything that renders connection handles —
`ActionNode`, `ToolNode`, `MalwareNode`, `GenericNode`, `OperatorNode`,
`NodeFactory`, `NodeCard`, `NodeHandles`. Without it they throw
"Seems like you have not used zustand provider as an ancestor".

`ThemeModeProvider` picks its mode from `localStorage.theme_mode`, then
`prefers-color-scheme`, defaulting to dark. Seed that key to pin a mode.

## The styling idiom: CSS custom properties

**There are no utility classes and no class vocabulary to learn.** Component
styling is emotion `sx` props on MUI primitives; your own layout glue should use
the `--fv-*` custom properties directly. They are the same values the components
use, and they swap wholesale when the theme flips — so a hardcoded hex will
break in the other mode while a token will not.

The families, with real names:

| Family | Examples |
|---|---|
| Page/panel | `--fv-background-primary`, `--fv-background-secondary`, `--fv-menu-app-bar` |
| Surface states | `--fv-surface-rest`, `--fv-surface-hover`, `--fv-surface-active`, `--fv-surface-recessed` |
| Borders | `--fv-surface-border-subtle`, `--fv-surface-border-default`, `--fv-surface-border-emphasis` |
| Text | `--fv-text-primary`, `--fv-text-secondary`, `--fv-text-tertiary`, `--fv-text-disabled` |
| Status | `--fv-status-{success,error,warning,info}-{bg,text,border,accent}` |
| Accents | `--fv-accent-{blue,purple,green,orange,red}` |
| Node cards | `--fv-node-surface`, `--fv-node-border`, `--fv-node-pill` |
| Shadows | `--fv-shadow-{sm,md,lg,glow}` |
| Scrollbar | `--fv-scrollbar-thumb` |
| Focus | `--fv-focus-ring` |
| Type | `--fv-text-{xs,sm,md,lg,xl,2xl}-{size,leading,tracking}` |

Corner radii come from `flowVizTheme.borderRadius`, and they are **strings with
units** (`'4px'`, `'6px'`, `'8px'`, `'12px'`, `'16px'`, plus `full` for pills and
`circle` for discs). Use them as-is — never pass a bare number to MUI's `sx` for
`borderRadius`, which multiplies it by `theme.shape.borderRadius` and silently
renders four times too round.

Three are not colours and are used differently:

- `--fv-overlay-rgb` — an rgb **triple** (white on dark, slate on light). Write
  `rgba(var(--fv-overlay-rgb), 0.08)` wherever you'd have hardcoded a
  translucent white.
- `--fv-panel-rgb` — same shape, for the few surfaces that still tint at an
  alpha. Panels themselves are opaque; there is no backdrop blur in this system.
  Depth comes from the background ladder (`primary` → `menu-app-bar` →
  `panel` → `raised`) plus a hairline border, and shadows are reserved for
  things that genuinely float.
- `--fv-shadow-alpha` — a multiplier; light mode needs weaker shadows. Write
  `rgba(0, 0, 0, calc(0.4 * var(--fv-shadow-alpha)))`.

## Focus

Keyboard focus is handled globally by `ThemeModeProvider` — a 2px
`--fv-focus-ring` outline at 2px offset, on `:focus-visible` only, so it shows
for keyboard and not for mouse press. **Do not add per-component focus styling
and never set `outline: none`**; the whole point is that one rule covers every
control, which is how it was missed before.

## Where the truth lives

- `_ds/<folder>/styles.css` and its `@import` closure — the shipped fonts (Inter
  400/500/600/700) and ReactFlow's stylesheet. Node handles lose their
  positioning without the latter.
- `components/<group>/<Name>/<Name>.d.ts` — the real prop contract.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.

Read the `.d.ts` before assuming a prop exists. Several components take a
`status` or `confidence` enum rather than a colour, and passing a colour
silently does nothing.

## An idiomatic composition

Library components for the controls; tokens for your own layout.

```jsx
<div style={{
  background: 'var(--fv-background-secondary)',
  border: '1px solid var(--fv-surface-border-default)',
  borderRadius: 12,
  boxShadow: 'var(--fv-shadow-md)',
  padding: 20,
  display: 'grid',
  gap: 12,
}}>
  <SectionHeader>Initial access</SectionHeader>
  <CaptionText>Techniques extracted from the reporting article.</CaptionText>

  <div style={{ display: 'flex', gap: 8 }}>
    <StatusChip status="success" label="verified" />
    <ConfidenceChip confidence="high" />
  </div>

  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
    <DialogButtonCancel>Cancel</DialogButtonCancel>
    <DialogButtonPrimary>Save changes</DialogButtonPrimary>
  </div>
</div>
```

## Type

Six steps, and they are the only sizes the UI uses:

| Step | Size | Use |
|---|---|---|
| `xs` | 11px | micro labels, chips, the node type row |
| `sm` | 12px | captions, helper text |
| `md` | 13px | default UI text |
| `lg` | 14px | emphasis, field labels, subsection headers |
| `xl` | 16px | section headers |
| `2xl` | 18px | dialog and page titles |

Tracking tightens as size grows (`+0.02em` at `xs` down to `-0.02em` at `2xl`)
and is baked into each step — take the whole step, don't pick sizes à la carte:

```css
font-size:      var(--fv-text-lg-size);
line-height:    var(--fv-text-lg-leading);
letter-spacing: var(--fv-text-lg-tracking);
```

MUI's own variants are mapped onto the same steps in the theme, so
`<Typography variant="body2">` is 13px and `variant="caption"` is 12px — a MUI
Typography and a FlowViz one agree rather than diverging.

Prefer the `Typography` components (`SectionHeader`, `SubsectionHeader`,
`CaptionText`, `SmallText`, `TinyText`, `LinkText`) over raw `<h*>`/`<p>` —
they already carry the right step. Reach for the variables only for your own
layout text. Uppercase runs need `letter-spacing: 0.06em` on top of their step;
caps set too tight otherwise.
