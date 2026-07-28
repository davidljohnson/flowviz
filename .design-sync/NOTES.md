# design-sync notes — FlowViz

Repo-specific gotchas for syncing this design system to claude.ai/design.
Read this before re-running the sync.

## Shape

- FlowViz is an **application, not a published component library**: no `main`/
  `module`/`exports` in `package.json`, no barrel, and `dist/` is a Vite *app*
  build (index.html + assets) that the converter cannot use as an entry.
- Consequently the converter needs `--entry`. Without one it looks for
  `node_modules/flowviz/package.json`, which npm never creates for a repo's own
  package, and dies with `ENOENT`.
- `.design-sync/entry.ts` is that entry — a generated barrel of real re-exports.
  It is produced by **`.design-sync/gen-entry.mjs`**, which parses the component
  sources for named and default value exports. Re-run it after adding or
  removing a shared component, then rebuild:
  ```
  node .design-sync/gen-entry.mjs
  ```
  It also writes `.design-sync/.componentSrcMap.json`, which is merged into
  `config.json` as `componentSrcMap`. Because there is no shipped `.d.ts` tree,
  that map is the **only** source of the component list — the converter's
  `exportedNames()` scan returns zero here, which is expected, not a fault.

## Fixes that must stay in place

### Deep `@mui/icons-material` imports resolve to objects, not components

`package.json` declares `"type": "module"`, so esbuild applies Node's
ESM-importing-CommonJS interop to every source file. A default import of a
CommonJS `@mui/icons-material/<Icon>` then yields the *module object* instead of
the component, and React fails with:

```
Element type is invalid: expected a string ... but got: object
```

This is not cosmetic — it silently broke `NoteBadge`, `ConfidenceChip`,
`SearchInputWithClear`, and every node type whose type token is a stock icon
(tool, malware, asset, infrastructure, url, vulnerability). Only `ActionNode`
looked fine, because its sword glyph is built locally with `createSvgIcon`.
Vite never hits this: it pre-bundles the package with bundler-style interop.

Fix: `cfg.tsconfig` points at **`.design-sync/tsconfig.bundle.json`**, which maps
`@mui/icons-material/*` onto the package's own ESM build. There are ~50 distinct
deep icon imports under `src/`, so mapping beats patching call sites. Verify
after any rebuild:

```
grep -o "node_modules/@mui/icons-material/[A-Za-z0-9]*\.js" ds-bundle/_ds_bundle.js | sort -u | wc -l   # must be 0
```

**Trap:** the converter strips `//` as a line comment before parsing any
tsconfig. A `"//"` documentation key — or a comment body merely *containing* a
double slash — corrupts the JSON, `paths` silently becomes undefined, and the
mapping stops applying with no error. Keep that file free of the sequence.

### ReactFlow's stylesheet has to ship

`cfg.cssEntry` points at `node_modules/reactflow/dist/style.css`. It is the only
static stylesheet FlowViz has — everything else is emotion at runtime — and the
app loads it from
`src/features/flow-analysis/components/StreamingFlowVisualization.tsx`. Without
it `<Handle>` elements lose their absolute positioning and all four collapse
onto one edge of the node instead of sitting on its four sides.

### Node components need ReactFlow's provider

`NodeHandles` renders ReactFlow `<Handle>`s, which read ReactFlow's zustand
store and throw `[React Flow]: Seems like you have not used zustand provider as
an ancestor` outside it. `cfg.provider` therefore nests
`ReactFlowProvider` inside `ThemeModeProvider`. `ReactFlowProvider` is
re-exported from `entry.ts` purely so `cfg.provider` can name it — the field
only accepts bundle exports.

## Preview conventions

- **`.design-sync/preview-lib/theme.tsx`** carries the shared framing. It seeds
  `localStorage.theme_mode = 'dark'` at module scope, because
  `ThemeModeProvider` otherwise falls back to `prefers-color-scheme` and
  headless Chromium reports light — cards would render in the light palette,
  which is not what FlowViz looks like in use.
- Every cell on a card mounts its own provider but they share one
  `<html data-theme>`, so a card cannot show dark beside light by attribute.
  `Surface`/`BothModes` apply `themeCssVars(mode)` to the cell's own subtree
  instead. `themeCssVars` is re-exported from `entry.ts` for this.
- `Surface` is `display: inline-block` so it hugs its content; as a block it
  stretches to the capture viewport.
- MUI's `CssBaseline` (rendered by `ThemeModeProvider`) repaints the card body
  with the app's canvas colour, overriding the harness's white. That is why the
  cards read as full dark surfaces — intended, not a leak.

## Known render warns

Warns triaged as legitimate. A warn **not** in this list is new — look at it.

- `[RENDER_BLANK] NodeHandles` — the connection dots are `opacity: 0` at rest by
  design (the canvas fades them in on node hover), so the card is genuinely
  near-empty. Nothing to fix.
- `EnhancedSlider` **Disabled** looks almost identical to its rest state — the
  component applies no strong disabled treatment. A real (minor) gap in the
  design system, not a preview fault.
- Overlays (`EnhancedDialog`, `ActionMenu`, `DropdownMenu`) are pinned to
  `cardMode: 'single'` with explicit viewports in `cfg.overrides`; they portal
  over the whole card, so a grid card would show one export covering the rest.

## Gotchas when iterating

- **`package-build.mjs` wipes `ds-bundle/` — including
  `_screenshots/review/`.** Scoped `package-capture.mjs` runs only regenerate
  the components you name, so a full rebuild mid-review leaves you with sheets
  for nothing else. Grades survive (they live in `.design-sync/.cache/review/`,
  outside the bundle), but re-read anything you still need to grade.
- Menus and dialogs need a **mounted** anchor element. The preview pattern is a
  `useRef` on the trigger plus a `useState` set in `useEffect`, so the popper
  opens against a real node rather than the page corner.

## Environment

- npm blocks `esbuild`'s postinstall under its `allowScripts` policy. After
  `npm i` in `.ds-sync/`, run `npm install-scripts approve esbuild && npm rebuild
  esbuild` or the converter cannot bundle.
- Playwright lives in `.ds-sync/node_modules`; run ad-hoc probe scripts with
  `NODE_PATH=.ds-sync/node_modules` from the repo root.
- Serve the review page through a tracked background task. A bare `&` dies with
  the shell and the page silently returns blank screenshots.

## The dead-component audit

`node .design-sync/dead-scan.mjs` classifies every component in
`componentSrcMap` as used elsewhere, used only inside its own module, or
unreferenced. Run it before authoring previews — 30 of the original 77
components had **no references anywhere**, and nine of them had rich preview
cards written for them before anyone checked.

The three-way split matters. A naive "is this name used outside its own file"
scan reported 35 dead and was wrong by five: `ActionMenu` renders
`DropdownMenu`, `NodeHeader` renders `TypeToken`, and so on. Components used
only by a sibling in the same module look dead but are not.

`GlassMorphButton` was a later straggler — it fell out of use once
`CompactButton` (a `styled(GlassMorphButton)`) went — and has since been
deleted too. **The consequence is worth knowing:** the system has no
general-purpose text button any more. What remains is icon-only
(`ToolbarIconButton`), the hero CTA (`HeroSubmitButton`), and the dialog-scoped
pair (`PrimaryButton`, `SecondaryButton`) which live in the `EnhancedDialog`
module. A feature needing a plain button either reaches for the dialog pair out
of context or adds a new one.

The scan now reports **zero unreferenced components**.

## Re-sync risks

- **`gen-entry.mjs` is a regex parser, not a compiler.** It handles
  `export const/function/class`, `export { X as Y }`, and default exports named
  after their file. Exotic re-export forms would be missed silently — the
  component count in its output is the thing to sanity-check (76 at last sync).
- **The icon ESM mapping is pinned to MUI v5's layout** (`@mui/icons-material/esm/`).
  A major MUI upgrade that drops or moves `esm/` will silently reintroduce the
  object-not-component bug. The grep above is the canary.
- **`ThemeModeProvider` writes to `localStorage` and `document.documentElement`.**
  Previews depend on that side effect for their mode; a refactor to a
  prop-driven provider would need `cfg.provider.props` instead.
- The bundle inlines 46 npm packages, React and ReactDOM excepted (they come
  from `_vendor/`). Bundle size is ~2.6 MB.
- Node components are previewed outside a real ReactFlow canvas, so edges,
  selection outlines driven by canvas state, and hover-reveal handles are not
  exercised by any card.
