import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Chip,
  Stack,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  ThumbUp as AcknowledgeIcon,
  Assessment as ReviewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PerformanceReview, ReviewTemplate, RATING_LABELS } from '../types';
import { PREDEFINED_TEMPLATES } from '../data/templates';

interface EmployeeReviewViewProps {
  userId: string;
}

export function EmployeeReviewView({ userId }: EmployeeReviewViewProps): JSX.Element {
  const theme = useTheme();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [templates, setTemplates] = useState<{ [key: string]: ReviewTemplate }>({});
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let reviewsUnsubscribe: (() => void) | undefined;
    let unsubscribeUser: (() => void) | undefined;

    async function fetchData() {
      if (!userId) {
        console.log('No userId provided');
        return;
      }

      console.log('Attempting to fetch employee with userId:', userId);

      // Get the user's email from Firestore
      const userRef = doc(db, 'users', userId);
      unsubscribeUser = onSnapshot(userRef, async (userDoc) => {
        if (!userDoc.exists()) {
          console.error('User document not found for userId:', userId);
          console.log('Available data in userDoc:', userDoc);
          return;
        }

        console.log('Found user document:', userDoc.data());

        const employeeData = userDoc.data();
        const employeeEmail = employeeData.email?.toLowerCase();

        if (!employeeEmail) {
          console.error('No email found in user data:', employeeData);
          return;
        }

        console.log('Fetching reviews for employee:', {
          userId,
          email: employeeEmail
        });

        // Listen for reviews where the user is the employee (by email)
        const reviewsQuery = query(
          collection(db, 'performanceReviews'),
          where('employeeEmail', '==', employeeEmail),
          where('status', 'in', ['completed', 'acknowledged']),
          orderBy('createdAt', 'desc')
        );

        console.log('Executing reviews query with email:', employeeEmail);
        
        reviewsUnsubscribe = onSnapshot(reviewsQuery, async (snapshot) => {
          console.log('Got review snapshot:', {
            count: snapshot.docs.length,
            reviews: snapshot.docs.map(doc => ({
              id: doc.id,
              employeeEmail: doc.data().employeeEmail,
              status: doc.data().status,
              createdAt: doc.data().createdAt?.toDate?.()
            }))
          });

          const reviewData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              completedAt: data.completedAt,
              createdAt: data.createdAt
            };
          }) as PerformanceReview[];

          // Fetch templates for these reviews
          const templateIds = [...new Set(reviewData.map(r => r.templateId))];
          const templateData: { [key: string]: ReviewTemplate } = {};
          
          // First add predefined templates
          PREDEFINED_TEMPLATES.forEach(template => {
            templateData[template.id] = template;
          });

          // Then fetch custom templates
          for (const templateId of templateIds) {
            if (!templateData[templateId]) { // Skip if it's already a predefined template
              const templateDoc = doc(db, 'reviewTemplates', templateId);
              const templateSnap = await getDoc(templateDoc);
              if (templateSnap.exists()) {
                templateData[templateId] = templateSnap.data() as ReviewTemplate;
              }
            }
          }

          setTemplates(templateData);
          setReviews(reviewData);
          setLoading(false);
        });
      });
    }

    fetchData();

    return () => {
      if (reviewsUnsubscribe) reviewsUnsubscribe();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [userId]);

  const handleAcknowledge = async (reviewId: string) => {
    try {
      await updateDoc(doc(db, 'performanceReviews', reviewId), {
        status: 'acknowledged',
        acknowledgedAt: new Date()
      });
    } catch (error) {
      console.error('Error acknowledging review:', error);
    }
  };

  const handleDownload = async (review: PerformanceReview) => {
    try {
      // Get the template
      const template = templates[review.templateId];
      if (!template) {
        throw new Error('Review template not found');
      }

      // Flatten all questions from categories
      const questions = template.categories?.flatMap(category => 
        category.criteria.map(criterion => ({
          id: criterion.id,
          text: criterion.question,
          type: criterion.type
        }))
      ) || [];

      // Create the content
      const content = [
        `Performance Review`,
        `\nEmployee: ${review.employeeName || review.employeeEmail}`,
        `Reviewer: ${review.reviewerName || 'Unknown'}`,
        `Date: ${review.completedAt?.toDate?.() ? 
          format(review.completedAt.toDate(), 'MMMM d, yyyy') :
          review.createdAt?.toDate?.() ?
          format(review.createdAt.toDate(), 'MMMM d, yyyy') :
          'Date not available'}`,
        '\nReview Details:'
      ];

      // Add questions and responses
      questions.forEach((question, index) => {
        const response = review.responses?.find(r => r.questionId === question.id);
        content.push(
          `\n${index + 1}. ${question.text}`,
          `Answer: ${response?.answer || 'Not answered'}${response?.rating ? `\nRating: ${response.rating}/5` : ''}`
        );
      });

      // Add overall rating and comments
      if (review.overallRating) {
        content.push(`\n\nOverall Rating: ${review.overallRating.toFixed(1)}/5`);
      }
      if (review.comments) {
        content.push(`\n\nAdditional Comments:\n${review.comments}`);
      }

      // Add status
      content.push(`\n\nStatus: ${review.status.charAt(0).toUpperCase() + review.status.slice(1)}`);

      // Join all content
      const finalContent = content.join('\n');

      // Create a Blob
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Performance_Review_${format(new Date(), 'yyyy-MM-dd')}.txt`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Error downloading review:', error);
      // You might want to show a snackbar or alert here
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {reviews.map((review) => (
          <Card
            key={review.id}
            sx={{
              borderRadius: 2,
              boxShadow: theme.shadows[2],
              '&:hover': {
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {templates[review.templateId]?.name || 'Performance Review'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed on {format(
                      review.completedAt?.toDate?.() ? review.completedAt.toDate() :
                      review.createdAt?.toDate?.() ? review.createdAt.toDate() :
                      new Date(), 
                      'MMMM d, yyyy'
                    )}
                  </Typography>
                </Box>
                <Chip
                  label={review.status === 'acknowledged' ? 'Acknowledged' : 'Pending Acknowledgment'}
                  color={review.status === 'acknowledged' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>

              {review.overallRating && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Overall Rating
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating value={review.overallRating} readOnly precision={0.5} />
                    <Typography variant="body2" color="text.secondary">
                      {RATING_LABELS[Math.round(review.overallRating) as keyof typeof RATING_LABELS]}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ReviewIcon />}
                  onClick={() => setSelectedReview(review)}
                >
                  View Details
                </Button>
                {review.status !== 'acknowledged' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AcknowledgeIcon />}
                    onClick={() => handleAcknowledge(review.id)}
                  >
                    Acknowledge Review
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(review)}
                >
                  Download PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Review Details Dialog */}
      <Dialog
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedReview && (
          <>
            <DialogTitle>
              <Typography variant="h6">
                {templates[selectedReview.templateId]?.name || 'Performance Review'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedReview.completedAt?.toDate?.() ? 
                  format(selectedReview.completedAt.toDate(), 'MMMM d, yyyy') :
                  selectedReview.createdAt?.toDate?.() ?
                  format(selectedReview.createdAt.toDate(), 'MMMM d, yyyy') :
                  'Date not available'}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Employee: {selectedReview.employeeName || selectedReview.employeeEmail}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Reviewer: {selectedReview.reviewerName || 'Unknown'}
                </Typography>
              </Box>

              <Stack spacing={3}>
                {(() => {
                  const template = templates[selectedReview.templateId];
                  if (!template) return null;

                  // Flatten all questions from categories
                  const questions = template.categories?.flatMap(category => 
                    category.criteria.map(criterion => ({
                      id: criterion.id,
                      text: criterion.question,
                      type: criterion.type
                    }))
                  ) || [];

                  return questions.map((question, index) => {
                    const response = selectedReview.responses?.find(r => r.questionId === question.id);
                    return (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {index + 1}. {question.text}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, ml: 2 }}>
                          {response?.answer || 'Not answered'}
                        </Typography>
                        {response?.rating && (
                          <Box sx={{ mt: 1, ml: 2, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                              Rating:
                            </Typography>
                            <Rating value={response.rating} readOnly size="small" />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              ({response.rating}/5)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  });
                })()
                }
              </Stack>

              {selectedReview.overallRating && (
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ mr: 1 }}>
                    Overall Rating:
                  </Typography>
                  <Rating value={selectedReview.overallRating} readOnly size="medium" />
                  <Typography variant="subtitle1" sx={{ ml: 1 }}>
                    ({selectedReview.overallRating.toFixed(1)}/5)
                  </Typography>
                </Box>
              )}

              {selectedReview.comments && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Additional Comments:</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedReview.comments}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedReview(null)}>Close</Button>
              {selectedReview.status !== 'acknowledged' && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AcknowledgeIcon />}
                  onClick={() => {
                    handleAcknowledge(selectedReview.id);
                    setSelectedReview(null);
                  }}
                >
                  Acknowledge
                </Button>
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(selectedReview)}
              >
                Download
              </Button>

            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
