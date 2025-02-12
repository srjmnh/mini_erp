import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Rating,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Stack,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon
} from '@mui/icons-material';
import { ReviewTemplate, ReviewResponse, RATING_LABELS } from '../types';

interface ReviewFormProps {
  template: ReviewTemplate;
  employeeData: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatar?: string;
  };
  onSave: (responses: ReviewResponse[], isDraft: boolean) => void;
  initialResponses?: ReviewResponse[];
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  template,
  employeeData,
  onSave,
  initialResponses = []
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [responses, setResponses] = useState<ReviewResponse[]>(initialResponses);
  const [overallComments, setOverallComments] = useState('');

  const handleResponse = (criteriaId: string, value: any, type: 'rating' | 'text' | 'multiChoice') => {
    const newResponses = [...responses];
    const existingIndex = newResponses.findIndex(r => r.criteriaId === criteriaId);
    
    const response: ReviewResponse = {
      criteriaId,
      ...(type === 'rating' && { rating: value }),
      ...(type === 'text' && { textResponse: value }),
      ...(type === 'multiChoice' && { selectedOptions: [value] })
    };

    if (existingIndex >= 0) {
      newResponses[existingIndex] = response;
    } else {
      newResponses.push(response);
    }

    setResponses(newResponses);
  };

  const getResponseForCriteria = (criteriaId: string) => {
    return responses.find(r => r.criteriaId === criteriaId);
  };

  const calculateProgress = () => {
    const totalCriteria = template.categories.reduce(
      (sum, category) => sum + category.criteria.length,
      0
    );
    return (responses.length / totalCriteria) * 100;
  };

  const isStepComplete = (stepIndex: number) => {
    const category = template.categories[stepIndex];
    return category.criteria.every(criterion => {
      const response = getResponseForCriteria(criterion.id);
      return criterion.required ? response !== undefined : true;
    });
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, template.categories.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const currentCategory = template.categories[activeStep];

  return (
    <Box>
      {/* Header with employee info and progress */}
      <Card sx={{ mb: 4, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5">{employeeData.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {employeeData.position} • {employeeData.department}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                Review Progress
              </Typography>
              <Typography variant="h6">{Math.round(calculateProgress())}%</Typography>
            </Box>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress()} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Stepper */}
      <Stepper 
        activeStep={activeStep} 
        sx={{ mb: 4 }}
        alternativeLabel
      >
        {template.categories.map((category, index) => (
          <Step key={category.id} completed={isStepComplete(index)}>
            <StepLabel>{category.name}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Current category content */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {currentCategory.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {currentCategory.description}
        </Typography>
        <Divider sx={{ my: 3 }} />

        <Stack spacing={4}>
          {currentCategory.criteria.map((criterion) => (
            <Box key={criterion.id}>
              <Typography variant="subtitle1" gutterBottom>
                {criterion.question}
                {criterion.required && (
                  <Typography component="span" color="error.main">
                    *
                  </Typography>
                )}
              </Typography>

              {criterion.type === 'rating' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Rating
                    value={getResponseForCriteria(criterion.id)?.rating || 0}
                    onChange={(_, value) => handleResponse(criterion.id, value, 'rating')}
                    max={5}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {getResponseForCriteria(criterion.id)?.rating 
                      ? RATING_LABELS[getResponseForCriteria(criterion.id)?.rating as keyof typeof RATING_LABELS]
                      : 'Select rating'}
                  </Typography>
                </Box>
              )}

              {criterion.type === 'text' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={getResponseForCriteria(criterion.id)?.textResponse || ''}
                  onChange={(e) => handleResponse(criterion.id, e.target.value, 'text')}
                  placeholder="Enter your response..."
                />
              )}

              {criterion.type === 'multiChoice' && criterion.options && (
                <RadioGroup
                  value={getResponseForCriteria(criterion.id)?.selectedOptions?.[0] || ''}
                  onChange={(e) => handleResponse(criterion.id, e.target.value, 'multiChoice')}
                >
                  {criterion.options.map((option) => (
                    <FormControlLabel
                      key={option}
                      value={option}
                      control={<Radio />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
              )}
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Overall comments */}
      {activeStep === template.categories.length - 1 && (
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Overall Comments
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            placeholder="Add any overall comments or feedback..."
          />
        </Paper>
      )}

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<PrevIcon />}
          disabled={activeStep === 0}
        >
          Previous
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => onSave(responses, true)}
          >
            Save Draft
          </Button>
          {activeStep === template.categories.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={() => onSave(responses, false)}
              disabled={!template.categories.every((_, index) => isStepComplete(index))}
            >
              Submit Review
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
              disabled={!isStepComplete(activeStep)}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
