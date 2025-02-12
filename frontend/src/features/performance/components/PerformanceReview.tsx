import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  CircularProgress,
  Rating,
  Paper
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { TemplateSelection } from './TemplateSelection';
import { ReviewForm } from './ReviewForm';
import { CustomTemplateBuilder } from './CustomTemplateBuilder';
import { ReviewHistory } from './ReviewHistory';
import { EmployeeSelectionDialog } from './EmployeeSelectionDialog';
import { PREDEFINED_TEMPLATES } from '../data/templates';
import { ReviewTemplate, PerformanceReview as IPerformanceReview, ReviewResponse } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`performance-tabpanel-${index}`}
      aria-labelledby={`performance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const PerformanceReview: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState<ReviewTemplate[]>(PREDEFINED_TEMPLATES);
  const [reviews, setReviews] = useState<IPerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReviewTemplate | null>(null);
  const [isCustomTemplateMode, setIsCustomTemplateMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [viewingReview, setViewingReview] = useState<IPerformanceReview | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch the manager's department ID
    const fetchDepartmentId = async () => {
      try {
        console.log('Fetching department ID for user:', user.uid, user.email);
        // First try to find by email
        const emailQuery = query(
          collection(db, 'employees'),
          where('email', '==', user.email)
        );
        const emailSnapshot = await getDocs(emailQuery);
        console.log('Email query results:', emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (!emailSnapshot.empty) {
          const employeeDoc = emailSnapshot.docs[0];
          const data = employeeDoc.data();
          console.log('Found employee by email:', data);
          if (data.departmentId) {
            setDepartmentId(data.departmentId);
            console.log('Department ID set to:', data.departmentId);
          } else {
            console.error('No departmentId found in employee document');
          }
        } else {
          // If no employee found by email, check user's role
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'HR0' || userData.role === 'admin') {
              setDepartmentId('all');
              console.log('User is HR/admin, setting departmentId to "all"');
            } else {
              console.error('No employee found by email and user is not HR/admin');
            }
          } else {
            console.error('Neither employee nor user document exists');
          }
        }
      } catch (error) {
        console.error('Error fetching department ID:', error);
      }
    };

    fetchDepartmentId();

    // Listen for custom templates
    const templatesQuery = query(
      collection(db, 'reviewTemplates'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      const customTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewTemplate[];
      
      setTemplates([...PREDEFINED_TEMPLATES, ...customTemplates]);
    });

    // Listen for reviews - both received and given
    const fetchReviews = async () => {
      try {
        if (!user?.email) {
          console.error('No user email available');
          return;
        }

        // Log current user details
        console.log('%c Current User Details:', 'color: #4CAF50; font-weight: bold', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });

        // First check if user has an employee record
        const employeeQuery = query(
          collection(db, 'employees'),
          where('email', '==', user.email.toLowerCase())
        );
        const employeeSnapshot = await getDocs(employeeQuery);
        console.log('%c Employee Record:', 'color: #2196F3; font-weight: bold', {
          found: !employeeSnapshot.empty,
          data: employeeSnapshot.empty ? null : employeeSnapshot.docs[0].data()
        });

        // Get reviews given by user (as reviewer)
        const givenReviewsQuery = query(
          collection(db, 'performanceReviews'),
          where('reviewerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        // Try both email formats for received reviews
        const receivedReviewsQuery1 = query(
          collection(db, 'performanceReviews'),
          where('employeeEmail', '==', user.email.toLowerCase()),
          orderBy('createdAt', 'desc')
        );

        const receivedReviewsQuery2 = query(
          collection(db, 'performanceReviews'),
          where('employeeEmail', '==', user.email),
          orderBy('createdAt', 'desc')
        );

        console.log('%c Querying Reviews:', 'color: #FF9800; font-weight: bold', {
          asReviewer: { reviewerId: user.uid },
          asEmployee: { 
            emailLower: user.email.toLowerCase(),
            emailOriginal: user.email
          }
        });

        const [givenSnapshot, receivedSnapshot1, receivedSnapshot2] = await Promise.all([
          getDocs(givenReviewsQuery),
          getDocs(receivedReviewsQuery1),
          getDocs(receivedReviewsQuery2)
        ]);

        console.log('%c Review Counts:', 'color: #9C27B0; font-weight: bold', {
          given: givenSnapshot.docs.length,
          receivedLowerCase: receivedSnapshot1.docs.length,
          receivedOriginal: receivedSnapshot2.docs.length
        });

        // Process given reviews
        const givenReviews = givenSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('%c Given Review:', 'color: #FF5722', {
            id: doc.id,
            employeeEmail: data.employeeEmail,
            employeeName: data.employeeName,
            status: data.status,
            createdAt: data.createdAt?.toDate?.(),
            templateName: data.templateName
          });
          return {
            id: doc.id,
            ...data,
            reviewType: 'given'
          };
        });

        // Combine both sets of received reviews
        const receivedDocs = [...receivedSnapshot1.docs, ...receivedSnapshot2.docs];
        const uniqueReceivedReviews = new Map();
        
        // Process received reviews and remove duplicates
        receivedDocs.forEach(doc => {
          const data = doc.data();
          if (!uniqueReceivedReviews.has(doc.id)) {
            console.log('%c Received Review:', 'color: #673AB7', {
              id: doc.id,
              reviewerName: data.reviewerName,
              status: data.status,
              createdAt: data.createdAt?.toDate?.(),
              templateName: data.templateName
            });
            uniqueReceivedReviews.set(doc.id, {
              id: doc.id,
              ...data,
              reviewType: 'received'
            });
          }
        });

        // Combine and sort reviews
        const allReviews = [...givenReviews, ...Array.from(uniqueReceivedReviews.values())]
          .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

        console.log('%c Final Reviews:', 'color: #E91E63; font-weight: bold', 
          allReviews.map(review => ({
            id: review.id,
            type: review.reviewType,
            employeeEmail: review.employeeEmail,
            reviewerId: review.reviewerId,
            status: review.status,
            templateName: review.templateName
          }))
        );

        setReviews(allReviews as IPerformanceReview[]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        showSnackbar('Error loading reviews', 'error');
        setLoading(false);
      }
    };

    fetchReviews();

    // Set up an interval to refresh reviews periodically
    const refreshInterval = setInterval(fetchReviews, 30000); // Refresh every 30 seconds

    return () => {
      unsubscribeTemplates();
      clearInterval(refreshInterval);
    };
  }, [user?.uid, user?.email]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTemplateSelect = (template: ReviewTemplate) => {
    setSelectedTemplate(template);
    setIsEmployeeDialogOpen(true);
  };

  const handleCreateCustomTemplate = () => {
    setIsCustomTemplateMode(true);
  };

  const handleSaveCustomTemplate = async (template: ReviewTemplate) => {
    try {
      const templateData = {
        ...template,
        createdBy: user?.uid,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'reviewTemplates'), templateData);
      setIsCustomTemplateMode(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleSaveReview = async (responses: ReviewResponse[], isDraft: boolean) => {
    if (!selectedTemplate || !selectedEmployee || !user?.uid) {
      console.error('Missing required data:', { selectedTemplate, selectedEmployee, userId: user?.uid });
      showSnackbar('Missing required data for review', 'error');
      return;
    }

    try {
      // Calculate overall rating first
      let overallRating: number | null = null;
      if (!isDraft) {
        const ratingResponses = responses.filter(r => typeof r.rating === 'number');
        if (ratingResponses.length > 0) {
          overallRating = ratingResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingResponses.length;
        }
      }

      const reviewData = {
        employeeId: selectedEmployee.id,
        reviewerId: user.uid,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        status: isDraft ? 'draft' : 'completed',
        responses,
        createdAt: new Date(),
        updatedAt: new Date(),
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        employeeEmail: selectedEmployee.email,
        reviewerName: user.displayName || user.email,
        ...(isDraft ? {} : { completedAt: new Date() }),
        ...(overallRating !== null ? { overallRating } : {})
      };

      console.log('Saving review data:', reviewData);
      await addDoc(collection(db, 'performanceReviews'), reviewData);
      showSnackbar(`Review ${isDraft ? 'saved as draft' : 'submitted'} successfully`, 'success');
      
      // Reset form state
      setSelectedTemplate(null);
      setSelectedEmployee(null);
      setActiveTab(0); // Go back to review history
    } catch (error) {
      console.error('Error saving review:', error);
      showSnackbar(
        'Error saving review: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'error'
      );
    }
  };

  const handleViewReview = async (review: IPerformanceReview) => {
    try {
      // First check if it's a predefined template
      let template = PREDEFINED_TEMPLATES.find(t => t.id === review.templateId);
      
      // If not found in predefined templates, check Firestore
      if (!template) {
        const templateDoc = await getDoc(doc(db, 'reviewTemplates', review.templateId));
        if (!templateDoc.exists()) {
          throw new Error('Review template not found');
        }
        template = templateDoc.data() as ReviewTemplate;
      }
      setSelectedTemplate(template);
      setViewingReview(review);
      setViewMode(true);
      setActiveTab(1); // Switch to review form tab
    } catch (error) {
      console.error('Error viewing review:', error);
      showSnackbar('Error loading review details', 'error');
    }
  };

  const handleDownloadReview = async (review: IPerformanceReview) => {
    try {
      // First check if it's a predefined template
      let template = PREDEFINED_TEMPLATES.find(t => t.id === review.templateId);
      
      // If not found in predefined templates, check Firestore
      if (!template) {
        const templateDoc = await getDoc(doc(db, 'reviewTemplates', review.templateId));
        if (!templateDoc.exists()) {
          throw new Error('Review template not found');
        }
        template = templateDoc.data() as ReviewTemplate;
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
        `Reviewer: ${review.reviewerName || review.reviewerEmail || 'Unknown'}`,
        `Date: ${review.completedAt?.toDate?.().toLocaleDateString() || review.createdAt?.toDate?.().toLocaleDateString()}`,
        '\nReview Details:'
      ];

      // Add questions and responses
      if (questions.length > 0) {
        questions.forEach((question, index) => {
          const response = review.responses?.find(r => r.questionId === question.id);
          content.push(
            `\n${index + 1}. ${question.text}`,
            `Answer: ${response?.answer || 'Not answered'}${response?.rating ? `\nRating: ${response.rating}/5` : ''}`
          );
        });
      } else if (review.responses?.length > 0) {
        // Fallback if template structure is different
        review.responses.forEach((response, i) => {
          content.push(
            `\n${i + 1}. ${response.questionText || 'Question'}`,
            `Answer: ${response.answer || 'Not answered'}${response.rating ? `\nRating: ${response.rating}/5` : ''}`
          );
        });
      }

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
      const blob = new Blob([finalContent], { type: 'text/plain' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Performance_Review_${review.employeeName || 'Employee'}_${new Date().toISOString().split('T')[0]}.txt`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Error downloading review:', error);
      showSnackbar('Error downloading review', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Review History" />
          <Tab label="Start Review" />
          <Tab label="Templates" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <ReviewHistory
          reviews={reviews}
          onViewReview={handleViewReview}
          onDownloadReview={handleDownloadReview}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {viewMode && viewingReview ? (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Review Details</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setViewMode(false);
                  setViewingReview(null);
                  setSelectedTemplate(null);
                  setActiveTab(0);
                }}
              >
                Back to List
              </Button>
            </Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Employee: {viewingReview.employeeName || viewingReview.employeeEmail}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Reviewer: {viewingReview.reviewerName || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date: {viewingReview.completedAt?.toDate?.().toLocaleDateString() || viewingReview.createdAt?.toDate?.().toLocaleDateString()}
              </Typography>
              <Box sx={{ mt: 3 }}>
                {(() => {
                  // Flatten all questions from categories
                  const questions = selectedTemplate?.categories?.flatMap(category => 
                    category.criteria.map(criterion => ({
                      id: criterion.id,
                      text: criterion.question,
                      type: criterion.type
                    }))
                  ) || [];

                  return questions.map((question, index) => {
                    const response = viewingReview.responses?.find(r => r.questionId === question.id);
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
              </Box>
              {viewingReview.overallRating && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1">
                    Overall Rating: {viewingReview.overallRating.toFixed(1)}/5
                  </Typography>
                </Box>
              )}
              {viewingReview.comments && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Additional Comments:</Typography>
                  <Typography variant="body2">{viewingReview.comments}</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        ) : selectedTemplate && selectedEmployee ? (
          <ReviewForm
            template={selectedTemplate}
            employeeData={selectedEmployee}
            onSave={handleSaveReview}
          />
        ) : (
          <TemplateSelection
            templates={templates}
            onSelectTemplate={handleTemplateSelect}
            onCreateCustomTemplate={handleCreateCustomTemplate}
          />
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {isCustomTemplateMode ? (
          <CustomTemplateBuilder onSave={handleSaveCustomTemplate} />
        ) : (
          <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">Review Templates</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCustomTemplate}
              >
                Create Custom Template
              </Button>
            </Box>
            <TemplateSelection
              templates={templates}
              onSelectTemplate={handleTemplateSelect}
              onCreateCustomTemplate={handleCreateCustomTemplate}
            />
          </Box>
        )}
      </TabPanel>

      <EmployeeSelectionDialog
        open={isEmployeeDialogOpen}
        onClose={() => setIsEmployeeDialogOpen(false)}
        onSelectEmployee={(employee) => {
          setSelectedEmployee(employee);
          setIsEmployeeDialogOpen(false);
        }}
        departmentId={departmentId}
      />
    </Box>
  );
};
