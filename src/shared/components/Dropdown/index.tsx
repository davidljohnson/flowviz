import {
    FormControl,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    MenuItemProps,
    MenuProps,
    Select,
    SelectProps,
    styled,
} from '@mui/material';
import React from 'react';
import { flowVizTheme } from '../../theme/flowviz-theme';

// ============= Base Styling Configuration =============

// Menu styling for dropdown menus
export const dropdownMenuStyles: Partial<MenuProps> = {
  PaperProps: {
    sx: {
      background: flowVizTheme.colors.menu.dialog,
      border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
      borderRadius: flowVizTheme.borderRadius.md,
      boxShadow: flowVizTheme.effects.shadows.md,
      minWidth: '180px',
    }
  },
  MenuListProps: {
    sx: {
      padding: `${flowVizTheme.spacing.sm - 2}px`,
    }
  }
};

// Darker menu variant for app bars
export const dropdownMenuStylesDark: Partial<MenuProps> = {
  PaperProps: {
    sx: {
      background: flowVizTheme.colors.menu.appBar,
      border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
      borderRadius: flowVizTheme.borderRadius.md,
      boxShadow: flowVizTheme.effects.shadows.md,
      minWidth: '180px',
    }
  },
  MenuListProps: {
    sx: {
      padding: `${flowVizTheme.spacing.sm - 2}px`,
    }
  }
};

// ============= Dropdown Menu Item Component =============

export const DropdownMenuItem = styled(MenuItem)({
  borderRadius: flowVizTheme.borderRadius.sm,
  marginBottom: `${flowVizTheme.spacing.xs / 2}px`,
  padding: `${flowVizTheme.spacing.sm + 2}px ${flowVizTheme.spacing.sm + 6}px`,
  color: flowVizTheme.colors.text.primary,
  fontSize: '14px',
  fontWeight: 500,
  transition: flowVizTheme.motion.fast,
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.surface.hover,
    color: flowVizTheme.colors.text.primary,
  },
  
  '&.Mui-selected': {
    backgroundColor: flowVizTheme.colors.surface.active,
    
    '&:hover': {
      backgroundColor: flowVizTheme.colors.surface.active,
    }
  },
  
  '&:last-child': {
    marginBottom: 0,
  }
});

// Danger variant for destructive actions
export const DropdownMenuItemDanger = styled(DropdownMenuItem)({
  color: flowVizTheme.colors.status.error.text,
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.status.error.bg,
    color: flowVizTheme.colors.status.error.accent,
  },
});

// ============= Dropdown Menu Component =============

// `variant` is omitted as well as the slot props: MUI's Menu already has one
// ('menu' | 'selectedMenu') and this component redefines it as a theme choice,
// so the two were structurally incompatible. It isn't forwarded to Menu below.
interface DropdownMenuProps extends Omit<MenuProps, 'PaperProps' | 'MenuListProps' | 'variant'> {
  variant?: 'default' | 'dark';
  minWidth?: number | string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  variant = 'default',
  minWidth,
  children,
  ...props
}) => {
  const styles = variant === 'dark' ? dropdownMenuStylesDark : dropdownMenuStyles;
  
  const customStyles = minWidth ? {
    ...styles,
    PaperProps: {
      ...styles.PaperProps,
      sx: {
        ...styles.PaperProps?.sx,
        minWidth,
      }
    }
  } : styles;
  
  return (
    <Menu {...customStyles} {...props}>
      {children}
    </Menu>
  );
};

// ============= Dropdown Select Component =============

export const DropdownSelect = styled(Select)<SelectProps>({
  color: flowVizTheme.colors.text.primary,
  backgroundColor: flowVizTheme.colors.background.panel,
  borderRadius: flowVizTheme.borderRadius.md,
  fontSize: '14px',
  fontWeight: 500,
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.default,
    transition: flowVizTheme.motion.fast,
  },
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.background.raised,
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: flowVizTheme.colors.surface.border.emphasis,
    }
  },
  
  '&.Mui-focused': {
    backgroundColor: flowVizTheme.colors.background.raised,
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: flowVizTheme.colors.surface.border.focus,
      borderWidth: 1,
    }
  },
  
  '& .MuiSelect-icon': {
    color: flowVizTheme.colors.text.secondary,
    transition: flowVizTheme.motion.fast,
  },
  
  '&:hover .MuiSelect-icon': {
    color: flowVizTheme.colors.text.primary,
  },
});

// ============= Menu Item with Icon Component =============

interface DropdownMenuItemWithIconProps extends MenuItemProps {
  icon: React.ReactNode;
  text: string;
  variant?: 'default' | 'danger';
}

export const DropdownMenuItemWithIcon: React.FC<DropdownMenuItemWithIconProps> = ({
  icon,
  text,
  variant = 'default',
  ...props
}) => {
  const Component = variant === 'danger' ? DropdownMenuItemDanger : DropdownMenuItem;
  
  return (
    <Component {...props}>
      <ListItemIcon 
        sx={{ 
          minWidth: '36px',
          color: variant === 'danger' 
            ? flowVizTheme.colors.status.error.text
            : flowVizTheme.colors.text.secondary,
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText 
        primary={text}
        primaryTypographyProps={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'inherit',
        }}
      />
    </Component>
  );
};

// ============= Dropdown Form Control =============

export const DropdownFormControl = styled(FormControl)({
  '& .MuiInputLabel-root': {
    color: flowVizTheme.colors.text.secondary,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    
    '&.Mui-focused': {
      color: flowVizTheme.colors.text.primary,
    },
    
    '&.MuiInputLabel-shrink': {
      backgroundColor: 'transparent',
      padding: `0 ${flowVizTheme.spacing.xs}px`,
    },
  },
});

// ============= Compact Dropdown Select =============
// ============= Action Menu Component =============

interface ActionMenuItem {
  id: string;
  text: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  variant?: 'default' | 'dark';
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  anchorEl,
  open,
  onClose,
  items,
  variant = 'default',
}) => {
  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <DropdownMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      variant={variant}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {items.map((item) => (
        <DropdownMenuItemWithIcon
          key={item.id}
          icon={item.icon}
          text={item.text}
          variant={item.variant}
          onClick={() => handleItemClick(item.onClick)}
        />
      ))}
    </DropdownMenu>
  );
};

// ============= Export all components =============

export default {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemDanger,
  DropdownMenuItemWithIcon,
  DropdownSelect,
  DropdownFormControl,
  ActionMenu,
  dropdownMenuStyles,
  dropdownMenuStylesDark,
};