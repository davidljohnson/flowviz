import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  Tooltip,
  IconButton,
} from '@mui/material';
import { FlowAlert } from '../../../shared/components/Alert';
import {
  EnhancedDialog,
  EnhancedDialogContent,
  SecondaryButton
} from '../../../shared/components/EnhancedDialog';
import { ActionMenu } from '../../../shared/components/Dropdown';
import { createScrollbarStyle, flowVizTheme } from '../../../shared/theme/flowviz-theme';
import {
  Upload as UploadIcon,
  GetApp as ExportIcon,
  MoreVert as MoreVertIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { SavedFlow } from '../types/SavedFlow';
import { flowStorage } from '../services';
import {
  FlowListItem,
  SearchAndFilters,
  FlowActionMenu,
  EditFlowDialog,
  DeleteFlowDialog,
} from './LoadFlowDialog/index';

interface LoadFlowDialogProps {
  open: boolean;
  /** Drives the warning above the list: loading replaces the canvas outright,
   *  and a row click now does that in one step, so the stakes have to be
   *  visible before the click rather than implied by a second one. */
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onLoad: (flow: SavedFlow) => void;
}

const LoadFlowDialog: React.FC<LoadFlowDialogProps> = ({
  open,
  hasUnsavedChanges,
  onClose,
  onLoad
}) => {
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuFlowId, setMenuFlowId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [libraryMenuAnchor, setLibraryMenuAnchor] = useState<null | HTMLElement>(null);
  
  const [deletingFlow, setDeletingFlow] = useState<SavedFlow | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<SavedFlow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /** Whether anything is saved at all — distinct from whether the current
   *  search matches anything, which is a different empty state. */
  const hasFlows = flows.length > 0;

  // Load flows when dialog opens
  useEffect(() => {
    if (open) {
      loadFlows();
    } else {
      // Reset state when closing
      setSearchTerm('');
      setError(null);
    }
  }, [open]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const loadedFlows = await flowStorage.listFlows();
      setFlows(loadedFlows);
    } catch (err) {
      setError('Could not read your saved analyses');
      console.error('Error loading flows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort flows
  const filteredFlows = useMemo(() => {
    const filtered = flows.filter(flow => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        flow.title.toLowerCase().includes(q) ||
        flow.metadata.description?.toLowerCase().includes(q) ||
        flow.metadata.tags.some(tag => tag.toLowerCase().includes(q)) ||
        flow.sourceUrl?.toLowerCase().includes(q)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date':
        default:
          return new Date(b.metadata.updatedAt).getTime() - 
                 new Date(a.metadata.updatedAt).getTime();
      }
    });
    
    return filtered;
  }, [flows, searchTerm, sortBy]);

  /** A row IS the action — there is no select-then-confirm step. */
  const handleLoad = async (id: string) => {
    try {
      const flow = await flowStorage.loadFlow(id);
      if (flow) {
        onLoad(flow);
        onClose();
      }
    } catch (err) {
      setError('Could not open that analysis');
      console.error('Error loading flow:', err);
    }
  };

  /** Held as the whole flow, not just an id, so the confirmation can name it
   *  and still name it correctly after the list underneath has reloaded. */
  const confirmDelete = async () => {
    if (!deletingFlow) return;
    const { id } = deletingFlow;
    setDeletingFlow(null);
    try {
      await flowStorage.deleteFlow(id);
      await loadFlows();
    } catch (err) {
      setError('Could not delete that analysis');
      console.error('Error deleting flow:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await flowStorage.duplicateFlow(id);
      await loadFlows();
    } catch (err) {
      setError('Could not duplicate that analysis');
      console.error('Error duplicating flow:', err);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const flow = await flowStorage.loadFlow(id);
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
      setError('Could not export that analysis');
      console.error('Error exporting flow:', err);
    }
  };

  const handleExportAll = async () => {
    try {
      const allFlows = await Promise.all(flows.map(flow => flowStorage.loadFlow(flow.id)));
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
      setError('Could not export your analyses');
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
              await flowStorage.saveFlow(flowData);
              importedCount++;
            } catch (err) {
              console.error('Error importing flow:', err);
            }
          }
        } else if (data.id && data.title && data.nodes && data.edges) {
          // Single flow format
          try {
            await flowStorage.saveFlow(data);
            importedCount++;
          } catch (err) {
            console.error('Error importing flow:', err);
          }
        }
      }
      
      if (importedCount > 0) {
        await loadFlows();
          setError(null);
      } else {
        setError('No analyses found in that file');
      }
    } catch (err) {
      setError('Could not import that file — check the format');
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
      // Details only. `editingFlow` came from the list, which carries no graph,
      // so saving it whole would write empty nodes and edges over the flow.
      await flowStorage.updateFlowDetails(editingFlow.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      await loadFlows();
      setEditDialogOpen(false);
      setEditingFlow(null);
    } catch (err) {
      setError('Could not save those details');
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
        title="Load analysis"
        maxWidth="md"
        fullWidth
        size="large"
        // Import and Export all are utilities that act on the whole library,
        // not steps in loading one thing, so they sit in the header instead of
        // competing with the list. Nothing is offered here when there is
        // nothing saved — the empty state carries Import itself.
        headerActions={
          hasFlows ? (
            <Tooltip title="Import or export analyses">
              <IconButton
                size="small"
                aria-label="Library actions"
                onClick={(e) => setLibraryMenuAnchor(e.currentTarget)}
                sx={{
                  color: flowVizTheme.colors.text.tertiary,
                  '&:hover': {
                    color: flowVizTheme.colors.text.primary,
                    backgroundColor: flowVizTheme.colors.surface.hover,
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
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
          
          {/* Loading replaces the canvas, and a row click now does it in one
              step. Said plainly, once, above the list — the same way the
              analyse dialog states it — rather than gated behind a second
              click that only ever looked like a formality. */}
          {hasFlows && hasUnsavedChanges && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                mb: 2,
                color: flowVizTheme.colors.status.warning.text,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: '0.95rem', mt: '2px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                Opening an analysis replaces the canvas. You have unsaved changes —
                they will be lost.
              </Typography>
            </Box>
          )}

          {/* Search only exists to act on a list, so it waits for one. */}
          {hasFlows && (
            <SearchAndFilters
              searchTerm={searchTerm}
              sortBy={sortBy}
              onSearchChange={setSearchTerm}
              onSortChange={setSortBy}
            />
          )}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: flowVizTheme.colors.text.secondary }}>
                Loading…
              </Typography>
            </Box>
          ) : !hasFlows ? (
            /* Nothing saved yet. Says what the list would hold and how one gets
               there, and carries the only action that applies — which is why
               Import drops out of the footer in this state. */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1,
                py: 4,
                px: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: flowVizTheme.colors.text.primary,
                }}
              >
                No saved analyses
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  maxWidth: 400,
                  color: flowVizTheme.colors.text.tertiary,
                }}
              >
                Analyses are saved in this browser. Save the canvas from the app bar,
                or import a file you exported earlier.
              </Typography>
              <SecondaryButton
                onClick={handleImport}
                disabled={importing}
                startIcon={<UploadIcon />}
                sx={{ mt: 1.5 }}
              >
                Import a file
              </SecondaryButton>
            </Box>
          ) : filteredFlows.length === 0 ? (
            /* Searched and found nothing — a different problem from having
               nothing, and one with an obvious way out. */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1,
                py: 5,
              }}
            >
              <Typography sx={{ fontSize: '0.9rem', color: flowVizTheme.colors.text.secondary }}>
                Nothing matches “{searchTerm}”
              </Typography>
              <SecondaryButton onClick={() => setSearchTerm('')} sx={{ mt: 0.5 }}>
                Clear search
              </SecondaryButton>
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
                  onClick={() => handleLoad(flow.id)}
                  onMenuClick={(event) => handleMenuOpen(event, flow.id)}
                  formatDate={formatDate}
                />
              ))}
            </List>
          )}
        </EnhancedDialogContent>

        {/* No footer. Load was the only primary action and a row performs it
            now; Import and Export all moved to the header; and a lone Cancel
            beside the header's own close button is the same button twice. */}
      </EnhancedDialog>

      <ActionMenu
        anchorEl={libraryMenuAnchor}
        open={Boolean(libraryMenuAnchor)}
        onClose={() => setLibraryMenuAnchor(null)}
        items={[
          {
            id: 'import',
            text: 'Import from a file',
            icon: <UploadIcon sx={{ fontSize: '18px' }} />,
            onClick: handleImport,
          },
          {
            id: 'export-all',
            text: 'Export all analyses',
            icon: <ExportIcon sx={{ fontSize: '18px' }} />,
            onClick: handleExportAll,
          },
        ]}
      />
      
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
          const flow = flows.find(f => f.id === menuFlowId);
          if (flow) setDeletingFlow(flow);
          handleMenuClose();
        }}
      />

      <DeleteFlowDialog
        title={deletingFlow?.title ?? null}
        onClose={() => setDeletingFlow(null)}
        onConfirm={confirmDelete}
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