import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ReviewTemplate, ReviewCategory, ReviewCriteria } from '../types';

interface CustomTemplateBuilderProps {
  onSave: (template: ReviewTemplate) => void;
  initialTemplate?: ReviewTemplate;
}

export const CustomTemplateBuilder: React.FC<CustomTemplateBuilderProps> = ({
  onSave,
  initialTemplate
}) => {
  const theme = useTheme();
  const [template, setTemplate] = useState<Partial<ReviewTemplate>>(
    initialTemplate || {
      name: '',
      description: '',
      type: 'custom',
      categories: [],
      createdAt: new Date(),
    }
  );

  const handleAddCategory = () => {
    setTemplate(prev => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        {
          id: Date.now().toString(),
          name: '',
          description: '',
          criteria: []
        }
      ]
    }));
  };

  const handleAddCriteria = (categoryIndex: number) => {
    const newCategories = [...(template.categories || [])];
    newCategories[categoryIndex].criteria.push({
      id: Date.now().toString(),
      question: '',
      type: 'rating',
      required: true
    });
    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleCategoryChange = (index: number, field: keyof ReviewCategory, value: any) => {
    const newCategories = [...(template.categories || [])];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleCriteriaChange = (
    categoryIndex: number,
    criteriaIndex: number,
    field: keyof ReviewCriteria,
    value: any
  ) => {
    const newCategories = [...(template.categories || [])];
    newCategories[categoryIndex].criteria[criteriaIndex] = {
      ...newCategories[categoryIndex].criteria[criteriaIndex],
      [field]: value
    };
    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleDeleteCategory = (index: number) => {
    const newCategories = [...(template.categories || [])];
    newCategories.splice(index, 1);
    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleDeleteCriteria = (categoryIndex: number, criteriaIndex: number) => {
    const newCategories = [...(template.categories || [])];
    newCategories[categoryIndex].criteria.splice(criteriaIndex, 1);
    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newCategories = [...(template.categories || [])];
    const [removed] = newCategories.splice(result.source.index, 1);
    newCategories.splice(result.destination.index, 0, removed);

    setTemplate(prev => ({ ...prev, categories: newCategories }));
  };

  const handleSave = () => {
    if (template.name && template.description && template.categories?.length) {
      onSave(template as ReviewTemplate);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create Custom Template
        </Typography>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Template Name"
            value={template.name}
            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <TextField
            fullWidth
            label="Template Description"
            value={template.description}
            onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={2}
            required
          />
        </Stack>
      </Paper>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <Box {...provided.droppableProps} ref={provided.innerRef}>
              {template.categories?.map((category, categoryIndex) => (
                <Draggable
                  key={category.id}
                  draggableId={category.id}
                  index={categoryIndex}
                >
                  {(provided) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{ p: 3, mb: 3, backgroundColor: alpha(theme.palette.background.paper, 0.7) }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <IconButton {...provided.dragHandleProps} size="small">
                          <DragIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
                          Category {categoryIndex + 1}
                        </Typography>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteCategory(categoryIndex)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Category Name"
                          value={category.name}
                          onChange={(e) =>
                            handleCategoryChange(categoryIndex, 'name', e.target.value)
                          }
                        />
                        <TextField
                          fullWidth
                          label="Category Description"
                          value={category.description}
                          onChange={(e) =>
                            handleCategoryChange(categoryIndex, 'description', e.target.value)
                          }
                          multiline
                          rows={2}
                        />

                        <Divider />

                        {/* Criteria */}
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            Criteria
                          </Typography>
                          <Stack spacing={3}>
                            {category.criteria.map((criterion, criteriaIndex) => (
                              <Box
                                key={criterion.id}
                                sx={{
                                  p: 2,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                  <TextField
                                    fullWidth
                                    label="Question"
                                    value={criterion.question}
                                    onChange={(e) =>
                                      handleCriteriaChange(
                                        categoryIndex,
                                        criteriaIndex,
                                        'question',
                                        e.target.value
                                      )
                                    }
                                    multiline
                                  />
                                  <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                      value={criterion.type}
                                      label="Type"
                                      onChange={(e) =>
                                        handleCriteriaChange(
                                          categoryIndex,
                                          criteriaIndex,
                                          'type',
                                          e.target.value
                                        )
                                      }
                                    >
                                      <MenuItem value="rating">Rating</MenuItem>
                                      <MenuItem value="text">Text</MenuItem>
                                      <MenuItem value="multiChoice">Multiple Choice</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton
                                    color="error"
                                    onClick={() =>
                                      handleDeleteCriteria(categoryIndex, criteriaIndex)
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                                <Box sx={{ mt: 2 }}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={criterion.required}
                                        onChange={(e) =>
                                          handleCriteriaChange(
                                            categoryIndex,
                                            criteriaIndex,
                                            'required',
                                            e.target.checked
                                          )
                                        }
                                      />
                                    }
                                    label="Required"
                                  />
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                          <Button
                            startIcon={<AddIcon />}
                            onClick={() => handleAddCriteria(categoryIndex)}
                            sx={{ mt: 2 }}
                          >
                            Add Criteria
                          </Button>
                        </Box>
                      </Stack>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          Add Category
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!template.name || !template.description || !template.categories?.length}
        >
          Save Template
        </Button>
      </Box>
    </Box>
  );
};
