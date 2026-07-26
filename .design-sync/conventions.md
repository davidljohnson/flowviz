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

Three are not colours and are used differently:

- `--fv-overlay-rgb` — an rgb **triple** (white on dark, slate on light). Write
  `rgba(var(--fv-overlay-rgb), 0.08)` wherever you'd have hardcoded a
  translucent white.
- `--fv-glass-rgb` — same shape, for tinting translucent panels.
- `--fv-shadow-alpha` — a multiplier; light mode needs weaker shadows. Write
  `rgba(0, 0, 0, calc(0.4 * var(--fv-shadow-alpha)))`.

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

Text uses the `Typography` family (`SectionHeader`, `SubsectionHeader`,
`CaptionText`, `SmallText`, `TinyText`, `LinkText`) rather than raw `<h*>`/`<p>`
— there is no separate type scale to apply by hand.
