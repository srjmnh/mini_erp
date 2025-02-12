import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  useTheme,
  alpha,
  Chip
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { ReviewTemplate } from '../types';
import { format } from 'date-fns';

interface TemplateSelectionProps {
  templates: ReviewTemplate[];
  onSelectTemplate: (template: ReviewTemplate) => void;
  onCreateCustomTemplate: () => void;
}

export const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  templates,
  onSelectTemplate,
  onCreateCustomTemplate
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Select Review Template
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreateCustomTemplate}
        >
          Create Custom Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                  cursor: 'pointer'
                }
              }}
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.type === 'predefined' ? 'Predefined' : 'Custom'}
                    size="small"
                    color={template.type === 'predefined' ? 'primary' : 'secondary'}
                    sx={{
                      backgroundColor: template.type === 'predefined' 
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.secondary.main, 0.1),
                      color: template.type === 'predefined'
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main
                    }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {template.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {template.categories.length} Categories
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {format(new Date(template.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
