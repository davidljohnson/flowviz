import { useEffect, useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuItemDanger, GlassMorphButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** As with ActionMenu, the popper needs a mounted element to anchor against. */
const Anchored = ({
  variant,
  children,
}: {
  variant?: 'default' | 'dark';
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => setAnchor(ref.current), []);

  return (
    <div style={{ height: 210 }}>
      <div ref={ref} style={{ display: 'inline-block' }}>
        <GlassMorphButton>Export</GlassMorphButton>
      </div>
      <DropdownMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => {}} variant={variant} minWidth={200}>
        {children}
      </DropdownMenu>
    </div>
  );
};

export const Default = () => (
  <Surface width={320}>
    <Anchored>
      <DropdownMenuItem>Export as PNG</DropdownMenuItem>
      <DropdownMenuItem>Export as STIX 2.1</DropdownMenuItem>
      <DropdownMenuItem>Export as Attack Flow (.afb)</DropdownMenuItem>
    </Anchored>
  </Surface>
);

/** With a destructive item, which gets its own colour. */
export const WithDangerItem = () => (
  <Surface width={320}>
    <Anchored>
      <DropdownMenuItem>Rename flow</DropdownMenuItem>
      <DropdownMenuItem>Duplicate flow</DropdownMenuItem>
      <DropdownMenuItemDanger>Delete flow</DropdownMenuItemDanger>
    </Anchored>
  </Surface>
);

/** The `dark` variant, for menus that open over the app bar. */
export const DarkVariant = () => (
  <Surface width={320}>
    <Anchored variant="dark">
      <DropdownMenuItem>Export as PNG</DropdownMenuItem>
      <DropdownMenuItem>Export as STIX 2.1</DropdownMenuItem>
    </Anchored>
  </Surface>
);
