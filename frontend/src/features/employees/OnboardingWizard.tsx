import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tooltip,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  category?: string;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  onSave: (steps: OnboardingStep[]) => void;
}

export default function OnboardingWizard({ steps: initialSteps, onSave }: OnboardingWizardProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>(initialSteps);
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const handleStepToggle = async (stepId: string) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    setSteps(updatedSteps);
    await onSave(updatedSteps);
  };

  const handleAddStep = () => {
    setEditingStep({
      id: Date.now().toString(),
      title: '',
      description: '',
      completed: false,
    });
    setIsDialogOpen(true);
  };

  const handleEditStep = (step: OnboardingStep) => {
    setEditingStep(step);
    setIsDialogOpen(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    const updatedSteps = steps.filter(step => step.id !== stepId);
    setSteps(updatedSteps);
    await onSave(updatedSteps);
  };

  const handleSaveStep = async () => {
    if (!editingStep) return;

    const updatedSteps = editingStep.id
      ? steps.map(step => (step.id === editingStep.id ? editingStep : step))
      : [...steps, editingStep];

    setSteps(updatedSteps);
    await onSave(updatedSteps);
    setIsDialogOpen(false);
    setEditingStep(null);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSteps(items);
    await onSave(items);
  };

  const getProgressPercentage = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  return (
    <Box>
      {/* Progress Header */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Onboarding Progress</Typography>
          <Chip 
            label={`${getProgressPercentage()}%`}
            sx={{ 
              bgcolor: alpha('#fff', 0.2),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
        <Box sx={{ 
          height: 10, 
          bgcolor: alpha('#fff', 0.1), 
          borderRadius: 5,
          overflow: 'hidden',
        }}>
          <Box sx={{ 
            width: `${getProgressPercentage()}%`, 
            height: '100%',
            bgcolor: 'white',
            transition: 'width 0.3s ease-in-out',
          }} />
        </Box>
      </Paper>

      {/* Steps List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="onboarding-steps">
          {(provided) => (
            <List
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {steps.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&:last-child': { borderBottom: 'none' },
                        bgcolor: step.completed ? alpha(theme.palette.success.main, 0.05) : 'inherit',
                      }}
                    >
                      <ListItemIcon {...provided.dragHandleProps}>
                        <DragIcon sx={{ color: theme.palette.text.secondary }} />
                      </ListItemIcon>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={step.completed}
                          onChange={() => handleStepToggle(step.id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {step.title}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {step.description}
                            </Typography>
                            {(step.dueDate || step.assignedTo || step.category) && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                {step.category && (
                                  <Chip
                                    size="small"
                                    label={step.category}
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                  />
                                )}
                                {step.assignedTo && (
                                  <Chip
                                    size="small"
                                    label={step.assignedTo}
                                    sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}
                                  />
                                )}
                                {step.dueDate && (
                                  <Chip
                                    size="small"
                                    label={new Date(step.dueDate).toLocaleDateString()}
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit step">
                          <IconButton edge="end" onClick={() => handleEditStep(step)} sx={{ mr: 1 }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete step">
                          <IconButton edge="end" onClick={() => handleDeleteStep(step.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Step Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddStep}
          sx={{ borderRadius: 2 }}
        >
          Add Onboarding Step
        </Button>
      </Box>

      {/* Edit/Add Step Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          {editingStep?.id ? 'Edit Step' : 'Add New Step'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editingStep?.title || ''}
              onChange={(e) => setEditingStep(prev => prev ? { ...prev, title: e.target.value } : null)}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editingStep?.description || ''}
              onChange={(e) => setEditingStep(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
            <TextField
              label="Category"
              fullWidth
              value={editingStep?.category || ''}
              onChange={(e) => setEditingStep(prev => prev ? { ...prev, category: e.target.value } : null)}
              placeholder="e.g., Documentation, Training, Setup"
            />
            <TextField
              label="Assigned To"
              fullWidth
              value={editingStep?.assignedTo || ''}
              onChange={(e) => setEditingStep(prev => prev ? { ...prev, assignedTo: e.target.value } : null)}
              placeholder="e.g., HR Manager, IT Team"
            />
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={editingStep?.dueDate || ''}
              onChange={(e) => setEditingStep(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={handleSaveStep}
            disabled={!editingStep?.title}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
