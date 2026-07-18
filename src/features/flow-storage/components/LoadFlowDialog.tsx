import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  Tooltip,
} from '@mui/material';
import { FlowAlert } from '../../../shared/components/Alert';
import { 
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton 
} from '../../../shared/components/EnhancedDialog';
import { createScrollbarStyle } from '../../../shared/theme/flowviz-theme';
import {
  Upload as UploadIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { SavedFlow, StorageStats } from '../types/SavedFlow';
import { LocalStorageService, StorageError } from '../services';
import {
  FlowListItem,
  SearchAndFilters,
  StorageStatsComponent,
  FlowActionMenu,
  EditFlowDialog,
} from './LoadFlowDialog/index';

interface LoadFlowDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (flow: SavedFlow) => void;
}

const LoadFlowDialog: React.FC<LoadFlowDialogProps> = ({
  open,
  onClose,
  onLoad
}) => {
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'nodes'>('date');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuFlowId, setMenuFlowId] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [importing, setImporting] = useState(false);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<SavedFlow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const storageService = new LocalStorageService();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load flows when dialog opens
  useEffect(() => {
    if (open) {
      loadFlows();
      loadStats();
    } else {
      // Reset state when closing
      setSelectedFlow(null);
      setSearchTerm('');
      setSelectedTags([]);
      setError(null);
    }
  }, [open]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const loadedFlows = await storageService.listFlows();
      setFlows(loadedFlows);
    } catch (err) {
      setError('Failed to load saved flows');
      console.error('Error loading flows:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const storageStats = await storageService.getStorageStats();
      setStats(storageStats);
    } catch (err) {
      console.error('Error loading storage stats:', err);
    }
  };

  // Get all unique tags from flows
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    flows.forEach(flow => flow.metadata.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [flows]);

  // Filter and sort flows
  const filteredFlows = useMemo(() => {
    const filtered = flows.filter(flow => {
      const matchesSearch = !searchTerm || 
        flow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.metadata.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        flow.sourceUrl?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => flow.metadata.tags.includes(tag));
      
      return matchesSearch && matchesTags;
    });
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'nodes':
          return b.metadata.nodeCount - a.metadata.nodeCount;
        case 'date':
        default:
          return new Date(b.metadata.updatedAt).getTime() - 
                 new Date(a.metadata.updatedAt).getTime();
      }
    });
    
    return filtered;
  }, [flows, searchTerm, selectedTags, sortBy]);

  const handleLoad = async () => {
    if (selectedFlow) {
      try {
        const flow = await storageService.loadFlow(selectedFlow);
        if (flow) {
          onLoad(flow);
          onClose();
        }
      } catch (err) {
        setError('Failed to load the selected flow');
        console.error('Error loading flow:', err);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this flow? This action cannot be undone.')) {
      try {
        await storageService.deleteFlow(id);
        await loadFlows();
        await loadStats();
        if (selectedFlow === id) {
          setSelectedFlow(null);
        }
      } catch (err) {
        setError('Failed to delete flow');
        console.error('Error deleting flow:', err);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await storageService.duplicateFlow(id);
      await loadFlows();
      await loadStats();
    } catch (err) {
      setError('Failed to duplicate flow');
      console.error('Error duplicating flow:', err);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const flow = await storageService.loadFlow(id);
      if (flow) {
        const blob = new Blob([JSON.stringify(flow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flow.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export flow');
      console.error('Error exporting flow:', err);
    }
  };

  const handleExportAll = async () => {
    try {
      const allFlows = await Promise.all(flows.map(flow => storageService.loadFlow(flow.id)));
      const validFlows = allFlows.filter(Boolean);
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        flows: validFlows
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowviz_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export flows');
      console.error('Error exporting all flows:', err);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    let importedCount = 0;

    try {
      for (const file of files) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.flows && Array.isArray(data.flows)) {
          // Batch import format
          for (const flowData of data.flows) {
            try {
              await storageService.saveFlow(flowData);
              importedCount++;
            } catch (err) {
              console.error('Error importing flow:', err);
            }
          }
        } else if (data.id && data.title && data.nodes && data.edges) {
          // Single flow format
          try {
            await storageService.saveFlow(data);
            importedCount++;
          } catch (err) {
            console.error('Error importing flow:', err);
          }
        }
      }
      
      if (importedCount > 0) {
        await loadFlows();
        await loadStats();
        setError(null);
      } else {
        setError('No valid flows found in the selected files');
      }
    } catch (err) {
      setError('Failed to import flows. Please check the file format.');
      console.error('Error importing flows:', err);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flowId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuFlowId(flowId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuFlowId(null);
  };

  const handleEdit = () => {
    const flow = flows.find(f => f.id === menuFlowId);
    if (flow) {
      setEditingFlow(flow);
      setEditTitle(flow.title);
      setEditDescription(flow.metadata.description || '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSaveEdit = async () => {
    if (!editingFlow || !editTitle.trim()) return;

    try {
      const updatedFlow = {
        ...editingFlow,
        title: editTitle.trim(),
        metadata: {
          ...editingFlow.metadata,
          description: editDescription.trim(),
          updatedAt: new Date().toISOString()
        }
      };

      await storageService.saveFlow(updatedFlow);
      await loadFlows();
      setEditDialogOpen(false);
      setEditingFlow(null);
    } catch (err) {
      setError('Failed to update flow');
      console.error('Error updating flow:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingFlow(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,.flowviz"
        multiple
        style={{ display: 'none' }}
      />
      
      <EnhancedDialog 
        open={open} 
        onClose={onClose}
        title="Load Analysis"
        maxWidth="md"
        fullWidth
        size="large"
      >
        <EnhancedDialogContent>
          {error && (
            <FlowAlert
              status="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </FlowAlert>
          )}
          
          <StorageStatsComponent
            stats={stats}
            formatFileSize={formatFileSize}
          />
          
          <SearchAndFilters
            searchTerm={searchTerm}
            sortBy={sortBy}
            onSearchChange={setSearchTerm}
            onSortChange={setSortBy}
          />
          
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Loading flows...
              </Typography>
            </Box>
          ) : filteredFlows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {flows.length === 0 ? 'No saved flows found' : 'No flows match the current filters'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ 
              maxHeight: '400px', 
              overflow: 'auto',
              ...createScrollbarStyle(),
            }}>
              {filteredFlows.map((flow) => (
                <FlowListItem
                  key={flow.id}
                  flow={flow}
                  isSelected={selectedFlow === flow.id}
                  onClick={() => setSelectedFlow(flow.id)}
                  onMenuClick={(event) => handleMenuOpen(event, flow.id)}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                />
              ))}
            </List>
          )}
        </EnhancedDialogContent>
        
        <EnhancedDialogActions>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Import flows from JSON files">
              <SecondaryButton 
                onClick={handleImport}
                disabled={importing}
                startIcon={<UploadIcon />}
              >
                Import
              </SecondaryButton>
            </Tooltip>
            
            {flows.length > 0 && (
              <Tooltip title="Export all flows as JSON">
                <SecondaryButton 
                  onClick={handleExportAll}
                  startIcon={<ExportIcon />}
                >
                  Export All
                </SecondaryButton>
              </Tooltip>
            )}
          </Box>
          
          <Box sx={{ flex: 1 }} />
          
          <SecondaryButton onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton 
            onClick={handleLoad}
            disabled={!selectedFlow}
          >
            Load Flow
          </PrimaryButton>
        </EnhancedDialogActions>
      </EnhancedDialog>
      
      <FlowActionMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onEdit={handleEdit}
        onDuplicate={() => {
          if (menuFlowId) handleDuplicate(menuFlowId);
          handleMenuClose();
        }}
        onExport={() => {
          if (menuFlowId) handleExport(menuFlowId);
          handleMenuClose();
        }}
        onDelete={() => {
          if (menuFlowId) handleDelete(menuFlowId);
          handleMenuClose();
        }}
      />
      
      <EditFlowDialog
        open={editDialogOpen}
        title={editTitle}
        description={editDescription}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onKeyPress={handleEditKeyPress}
      />
    </>
  );
};

export default LoadFlowDialog;