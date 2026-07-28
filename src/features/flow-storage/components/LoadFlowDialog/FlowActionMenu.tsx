import React from 'react';
import {
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  FileDownload as FileDownloadIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { ActionMenu } from '../../../../shared/components/Dropdown';

interface FlowActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const FlowActionMenu: React.FC<FlowActionMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const menuItems = [
    {
      id: 'edit',
      text: 'Edit details',
      icon: <EditIcon sx={{ fontSize: '18px' }} />,
      onClick: onEdit,
    },
    {
      id: 'duplicate',
      text: 'Duplicate',
      icon: <FileCopyIcon sx={{ fontSize: '18px' }} />,
      onClick: onDuplicate,
    },
    {
      id: 'export',
      text: 'Export',
      icon: <FileDownloadIcon sx={{ fontSize: '18px' }} />,
      onClick: onExport,
    },
    {
      id: 'delete',
      text: 'Delete',
      icon: <DeleteIcon sx={{ fontSize: '18px' }} />,
      onClick: onDelete,
      variant: 'danger' as const,
    },
  ];

  return (
    <ActionMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      items={menuItems}
      variant="default"
    />
  );
};

export default FlowActionMenu;