import {
    Error as ErrorIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { Alert, AlertProps, Chip, Typography } from '@mui/material';
import React from 'react';
import { createStatusStyle, flowVizTheme } from '../../theme/flowviz-theme';

// Main Alert Component
interface FlowAlertProps extends Omit<AlertProps, 'severity'> {
  status: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children?: React.ReactNode;
}

export const FlowAlert: React.FC<FlowAlertProps> = ({
  status,
  title,
  children,
  sx = {},
  ...props
}) => {
  const statusStyle = createStatusStyle(status);
  
  const iconMap = {
    success: SuccessIcon,
    error: ErrorIcon,
    warning: WarningIcon,
    info: InfoIcon,
  };
  
  const IconComponent = iconMap[status];
  
  return (
    <Alert
      icon={<IconComponent />}
      sx={{
        ...statusStyle,
        '& .MuiAlert-icon': {
          color: flowVizTheme.colors.status[status].accent,
        },
        '& .MuiAlert-message': {
          color: flowVizTheme.colors.status[status].text,
        },
        ...sx,
      }}
      {...props}
    >
      {title && (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            mb: children ? 0.5 : 0,
            color: flowVizTheme.colors.status[status].text,
          }}
        >
          {title}
        </Typography>
      )}
      {children && (
        <Typography
          variant="body2"
          sx={{
            color: flowVizTheme.colors.status[status].text,
            opacity: 0.9,
          }}
        >
          {children}
        </Typography>
      )}
    </Alert>
  );
};

// Toast Notification Component
// Status Chip Component
interface StatusChipProps {
  status: 'success' | 'error' | 'warning' | 'info';
  label: string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const StatusChip = React.forwardRef<HTMLDivElement, StatusChipProps>((props, ref) => {
  const {
    status,
    label,
    size = 'small',
    variant = 'filled',
    ...other
  } = props;
  
  const statusColors = flowVizTheme.colors.status[status];
  
  return (
    <Chip
      ref={ref}
      label={label.toUpperCase()}
      size={size}
      {...other}
      sx={{
        backgroundColor: variant === 'filled' ? statusColors.bg : 'transparent',
        color: statusColors.text,
        border: `1px solid ${statusColors.border}`,
        borderRadius: flowVizTheme.borderRadius.sm,
        // On the scale and the shared caps tracking; was 0.7/0.75rem at 0.05em.
        ...(size === 'small' ? flowVizTheme.type.xs : flowVizTheme.type.sm),
        ...flowVizTheme.uppercase,
        fontWeight: 700,
        height: size === 'small' ? '20px' : '24px',
        transition: `background-color ${flowVizTheme.motion.fast}`,
        '&:hover': {
          backgroundColor: variant === 'filled'
            ? statusColors.bg.replace('0.1)', '0.15)')
            : statusColors.bg,
        },
        '& .MuiChip-label': {
          padding: size === 'small' ? '0 6px' : '0 8px',
        },
      }}
    />
  );
});

StatusChip.displayName = 'StatusChip';

// Confidence Chip (specialized status chip)
// Loading Alert Component
// Export all components
export default {
  FlowAlert,
  StatusChip
};