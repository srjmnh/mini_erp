import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from 'notistack';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import BadgeIcon from '@mui/icons-material/Badge';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import { alpha } from '@mui/material/styles';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
} from '@mui/lab';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  Switch,
  FormControlLabel,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Chip,
  Tooltip,
  MenuItem,
  Link,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Card,
  CardContent,
  CardActions,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  FileUpload as FileUploadIcon,
  Folder as FolderIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  AttachFile as AttachFileIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarTodayIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { supabase } from '@/config/supabase';
import { db } from '@/config/firebase';
import CVAnalysis from './CVAnalysis';
import { analyzeCVWithAI, CVAnalysisResult } from '@/services/cvAnalysis'; // Fix import path for CV analysis

interface JobPosting {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  status: 'open' | 'closed';
  postedDate: string;
  deadline: string;
}

interface CandidateDocument {
  id: string;
  name: string;
  url: string;
  category: 'resume' | 'certificate' | 'id_proof' | 'offer_letter' | 'other';
  uploadDate: string;
}

interface Candidate {
  id: string;
  jobPostingId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  notes: string;
  appliedDate: string;
  documents?: CandidateDocument[];
}

const documentCategories = [
  { value: 'resume', label: 'Resume' },
  { value: 'certificate', label: 'Certificates' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'other', label: 'Other' }
];

interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  dateTime: string;
  type: 'technical' | 'hr' | 'culture';
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
  location?: string;
  meetingLink?: string;
  duration: number;
  participants: string[];
  addToCalendar: boolean; // in minutes
}

interface OnboardingTask {
  id: string;
  candidateId: string;
  title: string;
  description: string;
  category: 'documentation' | 'training' | 'setup' | 'introduction' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string;
  assignedTo?: string;
  completedBy?: string;
  completedAt?: string;
  documents?: {
    name: string;
    url: string;
    status: 'pending' | 'submitted' | 'verified' | 'rejected';
  }[];
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

const commonRequirements = [
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
  '2+ years experience',
  '5+ years experience',
  '10+ years experience',
  'Project Management',
  'Team Leadership',
  'Agile/Scrum',
  'Remote Work',
  'Travel Required',
  'Certification Required',
  'Language Proficiency',
  'Communication Skills',
  'Problem Solving',
];

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface DocumentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  document: CandidateDocument | null;
}

const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onClose,
  document
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!document) return;
      
      try {
        setLoading(true);
        // Get the file path by removing the Supabase URL prefix
        const filePath = document.url.replace(/^.*candidate-documents\//, '');
        
        const { data, error } = await supabase.storage
          .from('candidate-documents')
          .createSignedUrl(filePath, 60);

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        enqueueSnackbar('Error loading document preview', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (document) {
      getSignedUrl();
    }
  }, [document]);

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{document.name}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: '70vh', width: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loading ? (
            <CircularProgress />
          ) : signedUrl ? (
            document.url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${signedUrl}#view=FitH`}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            ) : (
              <img
                src={signedUrl}
                alt={document.name}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            )
          ) : (
            <Typography color="error">Failed to load document preview</Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  open,
  onClose,
  onUpload
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !category) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `candidate-documents/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      onUpload({
        name: file.name,
        url: publicUrl,
        category: category as CandidateDocument['category'],
        uploadDate: new Date().toISOString()
      });

      onClose();
      setFile(null);
      setCategory('');
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload Document</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Document Category</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="Document Category"
            >
              {documentCategories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <input
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            id="document-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="document-file">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              startIcon={<FileUploadIcon />}
            >
              {file ? file.name : 'Choose File'}
            </Button>
          </label>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleUpload}
          disabled={!file || !category || uploading}
          variant="contained"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RecruitmentPage: React.FC = () => {
  const { user, userRole } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  console.log('Current user:', user);
  const isHR = userRole === 'hr' || userRole === 'HR0';
  const [activeTab, setActiveTab] = useState(0);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  
  // Document management state
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CandidateDocument | null>(null);
  const [selectedCandidateForDoc, setSelectedCandidateForDoc] = useState<string | null>(null);
  
  // CV Analysis state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  // Add state for saved analyses
  const [savedAnalyses, setSavedAnalyses] = useState<{[key: string]: boolean}>({});

  const [interviewForm, setInterviewForm] = useState({
    candidateId: '',
    interviewerId: 'none', // Initialize with 'none' to match select default
    dateTime: '',
    type: 'technical' as const,
    status: 'scheduled' as const,
    feedback: '',
    location: '',
    meetingLink: '',
    duration: 60,
    participants: [] as string[],
    addToCalendar: true
  });

  const [taskForm, setTaskForm] = useState({
    candidateId: '',
    title: '',
    description: '',
    category: 'documentation' as const,
    status: 'pending' as const,
    dueDate: '',
    assignedTo: '',
    documents: [] as { name: string; url: string; status: 'pending' }[]
  });
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const { showSnackbar } = useSnackbar();

  // Form states for job posting
  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    description: '',
    requirements: [''],
    status: 'open' as const,
    deadline: ''
  });

  // Reset job form
  const resetJobForm = () => {
    setJobForm({
      title: '',
      department: '',
      description: '',
      requirements: [],
      customRequirement: '',
      status: 'open' as const,
      deadline: ''
    });
  };

  // Fetch user's department when dialog opens
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (isJobDialogOpen && !isHR && user?.email) {
        try {
          const employeesRef = collection(db, 'employees');
          const employeeQuery = query(employeesRef, where('email', '==', user.email));
          const employeeSnapshot = await getDocs(employeeQuery);

          if (!employeeSnapshot.empty) {
            const employeeData = employeeSnapshot.docs[0].data();
            console.log('Found employee department:', employeeData.department);
            setJobForm(prev => ({
              ...prev,
              department: employeeData.department
            }));
          }
        } catch (error) {
          console.error('Error fetching department:', error);
        }
      }
    };

    fetchUserDepartment();
  }, [isJobDialogOpen, isHR, user?.email]);

  useEffect(() => {
    fetchJobPostings();
    fetchCandidates();
    fetchInterviews();
    fetchOnboardingTasks();
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      const employeesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      console.log('Fetched employees:', employeesList);
      setEmployees(employeesList);
      return employeesList; // Return the list for immediate use
    } catch (error) {
      console.error('Error fetching employees:', error);
      enqueueSnackbar('Error fetching employees', 'error');
      return [];
    }
  };

  const fetchDepartments = async () => {
    try {
      const departmentsRef = collection(db, 'departments');
      const snapshot = await getDocs(departmentsRef);
      const departmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
      setDepartments(departmentsList);
    } catch (error) {
      console.error('Error fetching departments:', error);
      enqueueSnackbar('Error fetching departments', 'error');
    }
  };

  const fetchJobPostings = async () => {
    try {
      const jobsRef = collection(db, 'jobPostings');
      let jobQuery = query(jobsRef);
      
      // If not HR, only show department-specific postings
      if (!isHR && user?.email) {
        // First get the user's department from employees collection
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          jobQuery = query(jobsRef, where('department', '==', employeeData.department));
        }
      }
      const snapshot = await getDocs(jobQuery);
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobPosting[];
      setJobPostings(jobs);
    } catch (error) {
      console.error('Error fetching job postings:', error);
      enqueueSnackbar('Error fetching job postings', 'error');
    }
  };

  const fetchCandidates = async () => {
    try {
      const candidatesRef = collection(db, 'candidates');
      let candidatesQuery = query(candidatesRef);

      if (!isHR && user?.email) {
        // First get the user's department
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          
          // Get department-specific job postings
          const jobsRef = collection(db, 'jobPostings');
          const jobsQuery = query(jobsRef, where('department', '==', employeeData.department));
          const jobsSnapshot = await getDocs(jobsQuery);
          const departmentJobIds = jobsSnapshot.docs.map(doc => doc.id);
          
          if (departmentJobIds.length > 0) {
            candidatesQuery = query(candidatesRef, where('jobPostingId', 'in', departmentJobIds));
          } else {
            // If no jobs found for department, return empty result
            setCandidates([]);
            return;
          }
        }
      }
      const snapshot = await getDocs(candidatesQuery);
      
      // Fetch candidates with their documents
      const candidatesPromises = snapshot.docs.map(async (doc) => {
        const candidateData = doc.data();
        const documentsRef = collection(db, 'candidates', doc.id, 'documents');
        const documentsSnapshot = await getDocs(documentsRef);
        const documents = documentsSnapshot.docs.map(docDoc => ({
          id: docDoc.id,
          ...docDoc.data()
        }));

        return {
          id: doc.id,
          ...candidateData,
          documents: documents
        };
      });

      const candidates = await Promise.all(candidatesPromises) as Candidate[];
      setCandidates(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      enqueueSnackbar('Error fetching candidates', 'error');
    }
  };

  const fetchOnboardingTasks = async () => {
    try {
      const tasksRef = collection(db, 'onboardingTasks');
      let tasksQuery = query(tasksRef);

      if (!isHR && user?.email) {
        // First get the user's department
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          // Get candidates from department-specific jobs
          const jobsRef = collection(db, 'jobPostings');
          const jobsQuery = query(jobsRef, where('department', '==', employeeData.department));
          const jobsSnapshot = await getDocs(jobsQuery);
          const departmentJobIds = jobsSnapshot.docs.map(doc => doc.id);
          
          if (departmentJobIds.length > 0) {
            const candidatesRef = collection(db, 'candidates');
            const candidatesQuery = query(candidatesRef, where('jobPostingId', 'in', departmentJobIds));
            const candidatesSnapshot = await getDocs(candidatesQuery);
            const departmentCandidateIds = candidatesSnapshot.docs.map(doc => doc.id);
            
            if (departmentCandidateIds.length > 0) {
              // Get tasks for those candidates
              tasksQuery = query(tasksRef, where('candidateId', 'in', departmentCandidateIds));
            } else {
              setOnboardingTasks([]);
              return;
            }
          } else {
            setOnboardingTasks([]);
            return;
          }
        }
      }
      const snapshot = await getDocs(tasksQuery);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OnboardingTask[];
      setOnboardingTasks(tasks);
    } catch (error) {
      console.error('Error fetching onboarding tasks:', error);
      enqueueSnackbar('Error fetching onboarding tasks', 'error');
    }
  };

  const addEventToCalendar = async (interview: Interview) => {
    try {
      console.log('Starting calendar event creation for interview:', interview);
      const candidate = candidates.find(c => c.id === interview.candidateId);
      console.log('Found candidate:', candidate);
      
      // Make sure employees are loaded
      let currentEmployees = employees;
      if (currentEmployees.length === 0) {
        console.log('No employees loaded, fetching them now...');
        currentEmployees = await fetchEmployees();
      }
      console.log('Current employees:', currentEmployees);
      
      // Get interviewer's email from employees collection
      const interviewerEmployee = currentEmployees.find(e => e.id === interview.interviewerId);
      console.log('Found interviewer employee:', interviewerEmployee);
      if (!interviewerEmployee?.email) {
        console.error('Failed to find interviewer with ID:', interview.interviewerId);
        console.error('Available employees:', currentEmployees);
        throw new Error('Interviewer email not found');
      }

      // Get interviewer's user account
      const usersRef = collection(db, 'users');
      const interviewerQuery = query(usersRef, where('email', '==', interviewerEmployee.email));
      console.log('Searching for interviewer user with email:', interviewerEmployee.email);
      const interviewerSnapshot = await getDocs(interviewerQuery);
      if (interviewerSnapshot.empty) {
        throw new Error('Interviewer user account not found');
      }
      const interviewerUser = interviewerSnapshot.docs[0].data();
      const interviewerUid = interviewerSnapshot.docs[0].id;
      console.log('Found interviewer user:', { interviewerUid, interviewerUser });
      
      // Get participant UIDs and user info
      console.log('Processing participants:', interview.participants);
      const participantUids = await Promise.all(
        interview.participants.map(async (participantId) => {
          const participant = employees.find(e => e.id === participantId);
          console.log('Found participant employee:', participant);
          if (!participant?.email) {
            console.warn(`Participant ${participantId} email not found`);
            return null;
          }
          
          const participantQuery = query(usersRef, where('email', '==', participant.email));
          console.log('Searching for participant user with email:', participant.email);
          const participantSnapshot = await getDocs(participantQuery);
          if (participantSnapshot.empty) {
            console.warn(`Participant ${participant.email} user account not found`);
            return null;
          }
          const participantUser = participantSnapshot.docs[0].data();
          const participantInfo = {
            id: participantSnapshot.docs[0].id,
            name: participantUser.displayName || participantUser.email || participant.name,
            photoURL: participantUser.photoURL || null,
            status: 'pending'
          };
          console.log('Found participant user:', participantInfo);
          return participantInfo;
        })
      );
      
      const startTime = new Date(interview.dateTime);
      const endTime = new Date(startTime.getTime() + interview.duration * 60000);
      console.log('Event times:', { startTime, endTime });
      
      const calendarEvent = {
        title: `Interview: ${candidate?.name || 'Candidate'}`,
        description: `Interview Type: ${interview.type}\nLocation: ${interview.location || 'TBD'}\nMeeting Link: ${interview.meetingLink || 'N/A'}`,
        start: Timestamp.fromDate(startTime),
        end: Timestamp.fromDate(endTime),
        type: 'event',
        userId: interviewerUid,
        createdBy: {
          id: interviewerUid,
          name: interviewerUser.displayName || interviewerUser.email || interviewerEmployee.name,
          photoURL: interviewerUser.photoURL || null
        },
        attendees: [
          // Add interviewer
          {
            id: interviewerUid,
            name: interviewerUser.displayName || interviewerUser.email || interviewerEmployee.name,
            photoURL: interviewerUser.photoURL || null,
            status: 'accepted'
          },
          // Add other participants
          ...participantUids.filter(Boolean)
        ],
        isPublic: false,
        meetingLink: interview.meetingLink || null,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };
      console.log('Created calendar event object:', calendarEvent);

      // Add event to events collection
      const eventsRef = collection(db, 'events');
      const eventDoc = await addDoc(eventsRef, calendarEvent);
      console.log('Added event to events collection with ID:', eventDoc.id);

      // Send notifications to attendees
      console.log('Sending notifications to attendees:', participantUids.filter(Boolean));
      const notificationsRef = collection(db, 'notifications');
      const notificationPromises = participantUids
        .filter(Boolean)
        .map(attendee => {
          const notification = {
            userId: attendee.id,
            type: 'event_invitation',
            title: calendarEvent.title,
            message: `You have been invited to "${calendarEvent.title}" by ${calendarEvent.createdBy.name}`,
            createdAt: Timestamp.fromDate(new Date()),
            read: false,
            createdBy: calendarEvent.createdBy
          };
          console.log('Creating notification for attendee:', { attendee, notification });
          return addDoc(notificationsRef, notification);
        });
      const notificationResults = await Promise.all(notificationPromises);
      console.log('Created notifications with IDs:', notificationResults.map(doc => doc.id));

      enqueueSnackbar('Event added to calendar', 'success');
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      enqueueSnackbar('Error adding event to calendar', 'error');
    }
  };

  const handleInterviewFormSubmit = async () => {
    try {
      console.log('Starting interview form submission with:', interviewForm);
      
      // Validate required fields
      if (!interviewForm.candidateId || !interviewForm.dateTime) {
        console.warn('Missing required fields:', { 
          candidateId: interviewForm.candidateId, 
          dateTime: interviewForm.dateTime 
        });
        enqueueSnackbar('Please fill in all required fields', 'error');
        return;
      }
      
      // Validate interviewer is selected
      if (!interviewForm.interviewerId || interviewForm.interviewerId === 'none') {
        console.warn('Invalid interviewer:', interviewForm.interviewerId);
        enqueueSnackbar('Please select an interviewer', 'error');
        return;
      }
      
      // Validate interviewer exists in employees list
      const selectedInterviewer = employees.find(e => e.id === interviewForm.interviewerId);
      if (!selectedInterviewer) {
        console.error('Selected interviewer not found in employees list:', {
          interviewerId: interviewForm.interviewerId,
          availableEmployees: employees.map(e => ({ id: e.id, name: e.name }))
        });
        enqueueSnackbar('Selected interviewer not found', 'error');
        return;
      }
      console.log('Found interviewer:', selectedInterviewer);

      // Check department access for non-HR users
      if (!isHR && user?.email) {
        // Get user's department
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          
          // Get candidate's job posting
          const candidateRef = doc(db, 'candidates', interviewForm.candidateId);
          const candidateDoc = await getDoc(candidateRef);
          
          if (candidateDoc.exists()) {
            const candidateData = candidateDoc.data();
            const jobPostingRef = doc(db, 'jobPostings', candidateData.jobPostingId);
            const jobPostingDoc = await getDoc(jobPostingRef);
            
            if (jobPostingDoc.exists()) {
              const jobPostingData = jobPostingDoc.data();
              if (jobPostingData.department !== employeeData.department) {
                enqueueSnackbar('You can only manage interviews for your department', 'error');
                return;
              }
            }
          }
        }
      }
      if (selectedInterview) {
        console.log('Updating existing interview:', selectedInterview.id);
        const updatedInterview = {
          ...interviewForm,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'interviews', selectedInterview.id), updatedInterview);
        console.log('Updated interview in database');
        
        if (interviewForm.addToCalendar) {
          console.log('Adding calendar event for updated interview');
          await addEventToCalendar({ ...updatedInterview, id: selectedInterview.id });
        }
        enqueueSnackbar('Interview updated successfully', 'success');
      } else {
        console.log('Creating new interview');
        const newInterview = {
          ...interviewForm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: interviewForm.participants || []
        };
        console.log('New interview data:', newInterview);
        
        const docRef = await addDoc(collection(db, 'interviews'), newInterview);
        console.log('Created interview with ID:', docRef.id);
        
        if (interviewForm.addToCalendar) {
          console.log('Adding calendar event for new interview');
          await addEventToCalendar({ ...newInterview, id: docRef.id });
        }
        enqueueSnackbar('Interview scheduled successfully', 'success');
      }
      setIsInterviewDialogOpen(false);
      fetchInterviews();
    } catch (error) {
      console.error('Error saving interview:', error);
      enqueueSnackbar('Error saving interview', 'error');
    }
  };

  const handleTaskFormSubmit = async () => {
    try {
      // Check department access for non-HR users
      if (!isHR && user?.email) {
        // Get user's department
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          
          // Get candidate's job posting
          const candidateRef = doc(db, 'candidates', taskForm.candidateId);
          const candidateDoc = await getDoc(candidateRef);
          
          if (candidateDoc.exists()) {
            const candidateData = candidateDoc.data();
            const jobPostingRef = doc(db, 'jobPostings', candidateData.jobPostingId);
            const jobPostingDoc = await getDoc(jobPostingRef);
            
            if (jobPostingDoc.exists()) {
              const jobPostingData = jobPostingDoc.data();
              if (jobPostingData.department !== employeeData.department) {
                enqueueSnackbar('You can only manage tasks for your department', 'error');
                return;
              }
            }
          }
        }
      }

      if (selectedTask) {
        await updateDoc(doc(db, 'onboardingTasks', selectedTask.id), {
          ...taskForm,
          updatedAt: new Date().toISOString()
        });
        enqueueSnackbar('Task updated successfully', 'success');
      } else {
        await addDoc(collection(db, 'onboardingTasks'), {
          ...taskForm,
          createdAt: new Date().toISOString(),
        });
        enqueueSnackbar('Task created successfully', 'success');
      }
      setIsOnboardingDialogOpen(false);
      fetchOnboardingTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      enqueueSnackbar('Error saving task', 'error');
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await deleteDoc(doc(db, 'interviews', interviewId));
      enqueueSnackbar('Interview deleted successfully', 'success');
      fetchInterviews();
    } catch (error) {
      console.error('Error deleting interview:', error);
      enqueueSnackbar('Error deleting interview', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'onboardingTasks', taskId));
      enqueueSnackbar('Task deleted successfully', 'success');
      fetchOnboardingTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      enqueueSnackbar('Error deleting task', 'error');
    }
  };

  const fetchInterviews = async () => {
    try {
      const interviewsRef = collection(db, 'interviews');
      let interviewsQuery = query(interviewsRef);

      if (!isHR && user?.email) {
        // First get the user's department
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('email', '==', user.email));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          // Get candidates from department-specific jobs
          const jobsRef = collection(db, 'jobPostings');
          const jobsQuery = query(jobsRef, where('department', '==', employeeData.department));
          const jobsSnapshot = await getDocs(jobsQuery);
          const departmentJobIds = jobsSnapshot.docs.map(doc => doc.id);
          
          if (departmentJobIds.length > 0) {
            const candidatesRef = collection(db, 'candidates');
            const candidatesQuery = query(candidatesRef, where('jobPostingId', 'in', departmentJobIds));
            const candidatesSnapshot = await getDocs(candidatesQuery);
            const departmentCandidateIds = candidatesSnapshot.docs.map(doc => doc.id);
            
            if (departmentCandidateIds.length > 0) {
              // Get interviews for those candidates
              interviewsQuery = query(interviewsRef, where('candidateId', 'in', departmentCandidateIds));
            } else {
              setInterviews([]);
              return;
            }
          } else {
            setInterviews([]);
            return;
          }
        }
      }
      const snapshot = await getDocs(interviewsQuery);
      const interviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[];
      setInterviews(interviews);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      enqueueSnackbar('Error fetching interviews', 'error');
    }
  };

  const handleJobFormSubmit = async () => {
    try {
      if (selectedJob) {
        // Update existing job
        await updateDoc(doc(db, 'jobPostings', selectedJob.id), {
          ...jobForm,
          updatedAt: new Date().toISOString()
        });
        enqueueSnackbar('Job posting updated successfully', 'success');
      } else {
        // Create new job
        await addDoc(collection(db, 'jobPostings'), {
          ...jobForm,
          postedDate: new Date().toISOString(),
          status: 'open'
        });
        enqueueSnackbar('Job posting created successfully', 'success');
      }
      setIsJobDialogOpen(false);
      fetchJobPostings();
    } catch (error) {
      console.error('Error saving job posting:', error);
      enqueueSnackbar('Error saving job posting', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, 'jobPostings', jobId));
      enqueueSnackbar('Job posting deleted successfully', 'success');
      fetchJobPostings();
    } catch (error) {
      console.error('Error deleting job posting:', error);
      enqueueSnackbar('Error deleting job posting', 'error');
    }
  };

  // Candidate management states
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState<{
    jobPostingId: string;
    name: string;
    email: string;
    phone: string;
    resumeUrl: string;
    status: Candidate['status'];
    notes: string;
    documents?: CandidateDocument[];
  }>({
    jobPostingId: '',
    name: '',
    email: '',
    phone: '',
    resumeUrl: '',
    status: 'new' as const,
    notes: '',
  });

  const handleCandidateFormSubmit = async () => {
    try {
      if (selectedCandidate) {
        // Update existing candidate
        await updateDoc(doc(db, 'candidates', selectedCandidate.id), {
          ...candidateForm,
          updatedAt: new Date().toISOString()
        });
        enqueueSnackbar('Candidate updated successfully', 'success');
      } else {
        // Create new candidate
        await addDoc(collection(db, 'candidates'), {
          ...candidateForm,
          appliedDate: new Date().toISOString(),
        });
        enqueueSnackbar('Candidate added successfully', 'success');
      }
      setIsCandidateDialogOpen(false);
      fetchCandidates();
    } catch (error) {
      console.error('Error saving candidate:', error);
      enqueueSnackbar('Error saving candidate', 'error');
    }
  };

  const handleDeleteDocument = async (candidateId: string, documentId: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', candidateId, 'documents', documentId));
      enqueueSnackbar('Document deleted successfully', 'success');
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting document:', error);
      enqueueSnackbar('Error deleting document', 'error');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', candidateId));
      enqueueSnackbar('Candidate deleted successfully', 'success');
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      enqueueSnackbar('Error deleting candidate', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      new: 'info',
      screening: 'primary',
      interview: 'secondary',
      offer: 'warning',
      hired: 'success',
      rejected: 'error'
    };
    return statusColors[status] || 'default';
  };

  const handleAnalyzeCV = async (candidate: Candidate, jobPosting: JobPosting) => {
    console.log('Starting CV analysis for candidate:', candidate.id);
    
    if (!candidate.resumeUrl && !candidate.documents?.some(doc => doc.category === 'resume')) {
      enqueueSnackbar('No resume found for analysis', { variant: 'error' });
      return;
    }

    setAnalyzing(prev => ({ ...prev, [candidate.id]: true }));

    try {
      const resumeDoc = candidate.documents?.find(doc => doc.category === 'resume');
      const resumeUrl = resumeDoc?.url || candidate.resumeUrl;
      
      if (!resumeUrl) {
        throw new Error('No resume URL found');
      }

      console.log('Analyzing resume from URL:', resumeUrl);
      const result = await analyzeCVWithAI(resumeUrl, jobPosting.description);
      console.log('Analysis result:', result);
      
      setAnalysisResults(prev => ({ ...prev, [candidate.id]: result }));
      handleShowAnalysisDialog(candidate.id);
    } catch (error) {
      console.error('Error analyzing CV:', error);
      enqueueSnackbar('Error analyzing CV', { variant: 'error' });
    } finally {
      setAnalyzing(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  const handleShowAnalysisDialog = (candidateId: string) => {
    console.log('Opening analysis dialog for candidate:', candidateId);
    console.log('Current analysis results:', analysisResults[candidateId]);
    setSelectedAnalysisId(candidateId);
    setAnalysisDialogOpen(true);
  };

  const handleCloseAnalysisDialog = () => {
    console.log('Closing analysis dialog');
    setSelectedAnalysisId(null);
    setAnalysisDialogOpen(false);
  };

  const handleSaveAnalysis = async (candidateId: string, results: any) => {
    try {
      const analysisRef = collection(db, 'candidateAnalysis');
      await addDoc(analysisRef, {
        candidateId,
        results,
        timestamp: Timestamp.now(),
      });
      setSavedAnalyses(prev => ({ ...prev, [candidateId]: true }));
      enqueueSnackbar('Analysis saved successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error saving analysis:', error);
      enqueueSnackbar('Error saving analysis', { variant: 'error' });
    }
  };

  const handleReAnalyze = async (candidateId: string, jobPosting: JobPosting) => {
    handleCloseAnalysisDialog();
    await handleAnalyzeCV(candidates.find(c => c.id === candidateId)!, jobPosting);
  };

  const renderCandidates = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Candidates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedCandidate(null);
            setCandidateForm({
              jobPostingId: '',
              name: '',
              email: '',
              phone: '',
              resumeUrl: '',
              status: 'new',
              notes: '',
            });
            setIsCandidateDialogOpen(true);
          }}
        >
          Add Candidate
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {candidates.map((candidate) => (
          <Grid item xs={12} sm={6} md={4} key={candidate.id}>
            <Card sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease-in-out'
              }
            }}>
              <CardContent sx={{ flex: 1, p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 500 }}>
                      {candidate.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WorkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {candidate.jobPostingId ? jobPostings.find(j => j.id === candidate.jobPostingId)?.title : 'No Position'}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={candidate.status.toUpperCase()}
                    color={
                      candidate.status === 'hired'
                        ? 'success'
                        : candidate.status === 'rejected'
                        ? 'error'
                        : candidate.status === 'interview'
                        ? 'warning'
                        : 'primary'
                    }
                    size="small"
                    sx={{ 
                      borderRadius: 1,
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                    <Typography variant="body2">{candidate.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                    <Typography variant="body2">{candidate.phone}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                    <Typography variant="body2">
                      Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DescriptionIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        Documents:
                      </Typography>
                    </Box>
                    {candidate.documents?.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        {candidate.documents.map((doc) => (
                          <Tooltip key={doc.id} title={`${doc.name} (${doc.category})`}>
                            <IconButton
                              onClick={() => {
                                setSelectedDocument(doc);
                                setDocumentPreviewOpen(true);
                              }}
                            >
                              {doc.category === 'resume' && <DescriptionIcon sx={{ fontSize: 18 }} color="primary" />}
                              {doc.category === 'certificate' && <CardMembershipIcon sx={{ fontSize: 18 }} color="secondary" />}
                              {doc.category === 'id_proof' && <BadgeIcon sx={{ fontSize: 18 }} color="error" />}
                              {doc.category === 'offer_letter' && <WorkIcon sx={{ fontSize: 18 }} color="success" />}
                              {doc.category === 'other' && <AttachFileIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No documents
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setCandidateForm({
                      jobPostingId: candidate.jobPostingId,
                      name: candidate.name,
                      email: candidate.email,
                      phone: candidate.phone,
                      resumeUrl: candidate.resumeUrl,
                      status: candidate.status,
                      notes: candidate.notes,
                    });
                    setIsCandidateDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  variant="outlined"
                  onClick={() => handleDeleteCandidate(candidate.id)}
                >
                  Delete
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => {
                    if (analyzing[candidate.id]) return;
                    if (analysisResults[candidate.id]) {
                      handleShowAnalysisDialog(candidate.id);
                    } else {
                      handleAnalyzeCV(candidate, jobPostings.find(job => job.id === candidate.jobPostingId)!);
                    }
                  }}
                  disabled={analyzing[candidate.id]}
                  startIcon={analyzing[candidate.id] ? 
                    <CircularProgress size={20} /> : 
                    analysisResults[candidate.id] ? 
                      <VisibilityIcon /> : 
                      <PsychologyIcon />
                  }
                >
                  {analyzing[candidate.id] ? 'Analyzing...' : 
                   analysisResults[candidate.id] ? 'Show Results' : 'AI Analysis'
                  }
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Document Preview Dialog */}
      <Dialog 
        open={documentPreviewOpen} 
        onClose={() => setDocumentPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.name}
          <IconButton
            aria-label="close"
            onClick={() => setDocumentPreviewOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: '70vh', width: '100%', overflow: 'auto' }}>
            {selectedDocument?.url && (
              selectedDocument.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={selectedDocument.url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              )
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Candidate Dialog */}
      <Dialog open={isCandidateDialogOpen} onClose={() => setIsCandidateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCandidate ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>Basic Information</Typography>
            </Grid>

            {/* Document Upload Section */}
            {isCandidateDialogOpen && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, fontWeight: 500 }}>Documents</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                      {selectedCandidate?.documents?.map((doc) => (
                        <Tooltip key={doc.id} title={`${doc.name} (${doc.category})`}>
                          <IconButton
                            onClick={() => {
                              setSelectedDocument(doc);
                              setDocumentPreviewOpen(true);
                            }}
                          >
                            {doc.category === 'resume' && <DescriptionIcon color="primary" />}
                            {doc.category === 'certificate' && <CardMembershipIcon color="secondary" />}
                            {doc.category === 'id_proof' && <BadgeIcon color="error" />}
                            {doc.category === 'offer_letter' && <WorkIcon color="success" />}
                            {doc.category === 'other' && <AttachFileIcon />}
                          </IconButton>
                        </Tooltip>
                      ))}
                      {selectedCandidate ? (
                        <Button
                          variant="outlined"
                          startIcon={<CloudUploadIcon />}
                          onClick={() => setDocumentUploadOpen(true)}
                        >
                          Upload Document
                        </Button>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          You can upload documents after creating the candidate
                        </Typography>
                      )}
                    </Box>

                    {/* Document Upload Dialog */}
                    <Dialog 
                      open={documentUploadOpen} 
                      onClose={() => {
                        setDocumentUploadOpen(false);
                        setSelectedDocumentType('');
                      }}
                    >
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogContent>
                        <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
                          <FormControl fullWidth required>
                            <InputLabel>Document Type</InputLabel>
                            <Select
                              value={selectedDocumentType}
                              onChange={(e) => setSelectedDocumentType(e.target.value)}
                              label="Document Type"
                            >
                              <MenuItem value="resume">Resume</MenuItem>
                              <MenuItem value="certificate">Certificate</MenuItem>
                              <MenuItem value="id_proof">ID Proof</MenuItem>
                              <MenuItem value="offer_letter">Offer Letter</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                            style={{ display: 'none' }}
                            id="document-upload"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !selectedCandidate || !selectedDocumentType) {
                                enqueueSnackbar('Please select a document type', 'error');
                                return;
                              }

                              try {
                                const uploadResult = await uploadCandidateDocument(file, selectedCandidate.id);
                                
                                if (uploadResult.url) {
                                  await addDoc(collection(db, 'candidates', selectedCandidate.id, 'documents'), {
                                    name: file.name,
                                    url: uploadResult.url,
                                    category: selectedDocumentType,
                                    uploadDate: new Date().toISOString()
                                  });

                                  enqueueSnackbar('Document uploaded successfully', 'success');
                                  setDocumentUploadOpen(false);
                                  setSelectedDocumentType('');
                                  fetchCandidates();
                                }
                              } catch (error) {
                                console.error('Error uploading document:', error);
                                enqueueSnackbar('Error uploading document', 'error');
                              }
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={() => document.getElementById('document-upload')?.click()}
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                          >
                            Choose File
                          </Button>
                        </Stack>
                      </DialogContent>
                    </Dialog>

                    {/* Document Preview Dialog */}
                    <Dialog
                      open={documentPreviewOpen}
                      onClose={() => {
                        setDocumentPreviewOpen(false);
                        setSelectedDocument(null);
                      }}
                      maxWidth="md"
                      fullWidth
                    >
                      <DialogTitle>
                        {selectedDocument?.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {selectedDocument?.category} - Uploaded on {new Date(selectedDocument?.uploadDate || '').toLocaleDateString()}
                        </Typography>
                      </DialogTitle>
                      <DialogContent>
                        {selectedDocument?.url && (
                          selectedDocument.url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={selectedDocument.url}
                              style={{ width: '100%', height: '500px', border: 'none' }}
                              title="PDF Preview"
                            />
                          ) : (
                            <Box
                              component="img"
                              src={selectedDocument.url}
                              alt={selectedDocument.name}
                              sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '500px',
                                objectFit: 'contain'
                              }}
                            />
                          )
                        )}
                      </DialogContent>
                    </Dialog>
                  
                  </Box>
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Position"
                value={candidateForm.jobPostingId}
                onChange={(e) => setCandidateForm({ ...candidateForm, jobPostingId: e.target.value })}
              >
                {jobPostings.map((job) => (
                  <MenuItem key={job.id} value={job.id}>
                    {job.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resume URL"
                value={candidateForm.resumeUrl}
                onChange={(e) => setCandidateForm({ ...candidateForm, resumeUrl: e.target.value })}
                helperText="Enter the URL where the resume is stored"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={candidateForm.status}
                onChange={(e) => setCandidateForm({
                  ...candidateForm,
                  status: e.target.value as Candidate['status']
                })}
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="screening">Screening</MenuItem>
                <MenuItem value="interview">Interview</MenuItem>
                <MenuItem value="offer">Offer</MenuItem>
                <MenuItem value="hired">Hired</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCandidateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCandidateFormSubmit} variant="contained" color="primary">
            {selectedCandidate ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderJobPostings = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Job Postings</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedJob(null);
            resetJobForm();
            setIsJobDialogOpen(true);
          }}
          disabled={false} // Enable for all users since we have role-based access
        >
          Add Job Posting
        </Button>
      </Box>

      <Grid container spacing={2}>
        {jobPostings.map((job) => (
          <Grid item xs={12} md={6} key={job.id}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6">{job.title}</Typography>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedJob(job);
                      setJobForm({
                        title: job.title,
                        department: job.department,
                        description: job.description,
                        requirements: job.requirements,
                        customRequirement: '',
                        status: job.status,
                        deadline: job.deadline
                      });
                      setIsJobDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteJob(job.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {job.department}
              </Typography>
              <Typography variant="body2" paragraph>
                {job.description}
              </Typography>
              <Box sx={{ mb: 1 }}>
                {job.requirements.map((req, index) => (
                  <Chip
                    key={index}
                    label={req}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={job.status}
                  color={job.status === 'open' ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="caption">
                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Job Posting Dialog */}
      <Dialog open={isJobDialogOpen} onClose={() => setIsJobDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Department"
                value={jobForm.department}
                onChange={(e) => isHR && setJobForm({ ...jobForm, department: e.target.value })}
                disabled={!isHR}
              >
                {departments.map((dept) => (
                  <MenuItem 
                    key={dept.id} 
                    value={dept.name}
                    disabled={!isHR && dept.name !== user?.department}
                  >
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Requirements</Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {commonRequirements.map((req) => (
                    <Grid item xs={12} sm={6} md={4} key={req}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={jobForm.requirements.includes(req)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJobForm({
                                  ...jobForm,
                                  requirements: [...jobForm.requirements, req]
                                });
                              } else {
                                setJobForm({
                                  ...jobForm,
                                  requirements: jobForm.requirements.filter(r => r !== req)
                                });
                              }
                            }}
                          />
                        }
                        label={req}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Custom Requirement"
                    value={jobForm.customRequirement}
                    onChange={(e) => setJobForm({ ...jobForm, customRequirement: e.target.value })}
                    helperText="Add your own requirement"
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (jobForm.customRequirement && jobForm.customRequirement.trim()) {
                        setJobForm({
                          ...jobForm,
                          requirements: [...jobForm.requirements, jobForm.customRequirement.trim()],
                          customRequirement: ''
                        });
                      }
                    }}
                    sx={{ mt: 1 }}
                  >
                    Add
                  </Button>
                </Box>
                {jobForm.requirements.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Requirements:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {jobForm.requirements.map((req, index) => (
                        <Chip
                          key={index}
                          label={req}
                          onDelete={() => {
                            setJobForm({
                              ...jobForm,
                              requirements: jobForm.requirements.filter((_, i) => i !== index)
                            });
                          }}
                        />
                    ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={jobForm.status}
                onChange={(e) => setJobForm({
                  ...jobForm,
                  status: e.target.value as 'open' | 'closed'
                })}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Deadline"
                value={jobForm.deadline}
                onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsJobDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleJobFormSubmit} variant="contained" color="primary">
            {selectedJob ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderInterviews = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Interviews</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedInterview(null);
            setInterviewForm({
              candidateId: '',
              interviewerId: 'none', // Initialize with 'none' to match select default
              dateTime: '',
              type: 'technical' as const,
              status: 'scheduled' as const,
              feedback: '',
              location: '',
              meetingLink: '',
              duration: 60,
              participants: [] as string[],
              addToCalendar: true
            });
            setIsInterviewDialogOpen(true);
          }}
        >
          Schedule Interview
        </Button>
      </Box>

      <Grid container spacing={2}>
        {interviews.map((interview) => {
          const candidate = candidates.find(c => c.id === interview.candidateId);
          return (
            <Grid item xs={12} md={6} key={interview.id}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6">{candidate?.name || 'Unknown Candidate'}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {interview.type.toUpperCase()} Interview
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedInterview(interview);
                        setInterviewForm({
                          candidateId: interview.candidateId,
                          interviewerId: interview.interviewerId,
                          dateTime: interview.dateTime,
                          type: interview.type,
                          status: interview.status,
                          feedback: interview.feedback || '',
                          location: interview.location || '',
                          meetingLink: interview.meetingLink || '',
                          duration: interview.duration,
                          participants: interview.participants || [],
                          addToCalendar: true
                        });
                        setIsInterviewDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteInterview(interview.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Date & Time:</strong><br />
                      {new Date(interview.dateTime).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Duration:</strong><br />
                      {interview.duration} minutes
                    </Typography>
                  </Grid>
                  {interview.location && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Location:</strong><br />
                        {interview.location}
                      </Typography>
                    </Grid>
                  )}
                  {interview.meetingLink && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Meeting Link:</strong><br />
                        <Link href={interview.meetingLink} target="_blank" rel="noopener">
                          Join Meeting
                        </Link>
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {interview.feedback && (
                  <Typography variant="body2" paragraph>
                    <strong>Feedback:</strong><br />
                    {interview.feedback}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={interview.status.toUpperCase()}
                    color={interview.status === 'completed' ? 'success' :
                           interview.status === 'cancelled' ? 'error' : 'primary'}
                    size="small"
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Interview Dialog */}
      <Dialog open={isInterviewDialogOpen} onClose={() => setIsInterviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedInterview ? 'Edit Interview' : 'Schedule Interview'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Candidate"
                value={interviewForm.candidateId}
                onChange={(e) => setInterviewForm({ ...interviewForm, candidateId: e.target.value })}
                required
              >
                <MenuItem value="">Select a candidate</MenuItem>
                {candidates.map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Interviewer"
                value={interviewForm.interviewerId}
                onChange={(e) => setInterviewForm({ ...interviewForm, interviewerId: e.target.value })}
                required
              >
                <MenuItem value="none">Select an interviewer</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Date & Time"
                value={interviewForm.dateTime}
                onChange={(e) => setInterviewForm({ ...interviewForm, dateTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={interviewForm.duration}
                onChange={(e) => setInterviewForm({ ...interviewForm, duration: parseInt(e.target.value) || 60 })}
                inputProps={{ min: 15, step: 15 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={interviewForm.type}
                onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as 'technical' | 'hr' | 'culture' })}
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="hr">HR</MenuItem>
                <MenuItem value="culture">Culture</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={interviewForm.location}
                onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                placeholder="Office Room 101 or Virtual"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meeting Link"
                value={interviewForm.meetingLink}
                onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Invitees</InputLabel>
                <Select
                  multiple
                  value={interviewForm.participants || []}
                  onChange={(e) => setInterviewForm({ 
                    ...interviewForm, 
                    participants: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value 
                  })}
                  input={<OutlinedInput label="Invitees" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={employees.find(emp => emp.id === value)?.name || value}
                          />
                      ))}
                    </Box>
                  )}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={interviewForm.addToCalendar}
                    onChange={(e) => setInterviewForm({ ...interviewForm, addToCalendar: e.target.checked })}
                  />
                }
                label="Add to Calendar for All Invitees"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInterviewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInterviewFormSubmit} variant="contained" color="primary">
            {selectedInterview ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Render Interviews */}
      <Grid container spacing={2}>
        {interviews.map((interview) => {
          const candidate = candidates.find(c => c.id === interview.candidateId);
          return (
            <Grid item xs={12} md={6} key={interview.id}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6">{candidate?.name || 'Unknown Candidate'}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {interview.type.toUpperCase()} Interview
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(interview.dateTime).toLocaleString()}
                    </Typography>
                    {interview.participants && interview.participants.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="textSecondary">Invitees:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {interview.participants.map((participantId) => (
                            <Chip
                              key={participantId}
                              label={employees.find(emp => emp.id === participantId)?.name || participantId}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const renderOnboarding = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Onboarding Tasks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedTask(null);
            setTaskForm({
              candidateId: '',
              title: '',
              description: '',
              category: 'documentation',
              status: 'pending',
              dueDate: '',
              assignedTo: '',
              documents: []
            });
            setIsOnboardingDialogOpen(true);
          }}
        >
          Add Task
        </Button>
      </Box>

      <Grid container spacing={2}>
        {onboardingTasks.map((task) => {
          const candidate = candidates.find(c => c.id === task.candidateId);
          return (
            <Grid item xs={12} md={6} key={task.id}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6">{task.title}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      For: {candidate?.name || 'Unknown Candidate'}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskForm({
                          candidateId: task.candidateId,
                          title: task.title,
                          description: task.description,
                          category: task.category,
                          status: task.status,
                          dueDate: task.dueDate,
                          assignedTo: task.assignedTo || '',
                          documents: task.documents || []
                        });
                        setIsOnboardingDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" paragraph>
                  {task.description}
                </Typography>

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Category:</strong> {task.category}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Due Date:</strong> {new Date(task.dueDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  {task.assignedTo && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Assigned To:</strong> {task.assignedTo}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {task.documents && task.documents.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Required Documents:</strong>
                    </Typography>
                    {task.documents.map((doc, index) => (
                      <Chip
                        key={index}
                        label={doc.name}
                        color={doc.status === 'verified' ? 'success' :
                               doc.status === 'rejected' ? 'error' :
                               doc.status === 'submitted' ? 'primary' : 'default'}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={task.status.toUpperCase().replace('_', ' ')}
                    color={task.status === 'completed' ? 'success' :
                           task.status === 'blocked' ? 'error' :
                           task.status === 'in_progress' ? 'primary' : 'default'}
                    size="small"
                  />
                  {task.completedAt && (
                    <Typography variant="caption">
                      Completed: {new Date(task.completedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Onboarding Task Dialog */}
      <Dialog open={isOnboardingDialogOpen} onClose={() => setIsOnboardingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Candidate"
                value={taskForm.candidateId}
                onChange={(e) => setTaskForm({ ...taskForm, candidateId: e.target.value })}
              >
                {candidates.map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={taskForm.category}
                onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value as OnboardingTask['category'] })}
              >
                <MenuItem value="documentation">Documentation</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="setup">Setup</MenuItem>
                <MenuItem value="introduction">Introduction</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Assigned To"
                value={taskForm.assignedTo}
                onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Status"
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as OnboardingTask['status'] })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOnboardingDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTaskFormSubmit} variant="contained" color="primary">
            {selectedTask ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderCandidateDetails = (candidate: Candidate) => {
    const jobPosting = jobPostings.find(job => job.id === candidate.jobPostingId);
    
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 500 }}>
              {candidate.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WorkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary">
                {candidate.jobPostingId ? jobPostings.find(j => j.id === candidate.jobPostingId)?.title : 'No Position'}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={candidate.status.toUpperCase()}
            color={
              candidate.status === 'hired'
                ? 'success'
                : candidate.status === 'rejected'
                ? 'error'
                : candidate.status === 'interview'
                ? 'warning'
                : 'primary'
            }
            size="small"
            sx={{ 
              borderRadius: 1,
              fontWeight: 500,
              fontSize: '0.75rem'
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ fontSize: 18, color: 'primary.light' }} />
            <Typography variant="body2">{candidate.email}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 18, color: 'primary.light' }} />
            <Typography variant="body2">{candidate.phone}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: 'primary.light' }} />
            <Typography variant="body2">
              Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 18, color: 'primary.light' }} />
              <Typography variant="body2" sx={{ mr: 1 }}>
                Documents:
              </Typography>
            </Box>
            {candidate.documents?.length ? (
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {candidate.documents.map((doc) => (
                  <Tooltip key={doc.id} title={`${doc.name} (${doc.category})`}>
                    <IconButton
                      onClick={() => {
                        setSelectedDocument(doc);
                        setDocumentPreviewOpen(true);
                      }}
                    >
                      {doc.category === 'resume' && <DescriptionIcon sx={{ fontSize: 18 }} color="primary" />}
                      {doc.category === 'certificate' && <CardMembershipIcon sx={{ fontSize: 18 }} color="secondary" />}
                      {doc.category === 'id_proof' && <BadgeIcon sx={{ fontSize: 18 }} color="error" />}
                      {doc.category === 'offer_letter' && <WorkIcon sx={{ fontSize: 18 }} color="success" />}
                      {doc.category === 'other' && <AttachFileIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No documents
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* CV Analysis Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            CV Analysis
            <Tooltip title="Analyze CV with AI">
              <IconButton 
                size="small" 
                onClick={() => {
                  if (savedAnalyses[candidate.id] || analysisResults[candidate.id]) {
                    setSelectedAnalysisId(candidate.id);
                    setAnalysisDialogOpen(true);
                  } else {
                    handleAnalyzeCV(candidate, jobPosting!);
                  }
                }}
                disabled={analyzing[candidate.id]}
                sx={{ ml: 1 }}
              >
                {analyzing[candidate.id] ? <CircularProgress size={20} /> : 
                 savedAnalyses[candidate.id] || analysisResults[candidate.id] ? 
                   <VisibilityIcon /> : 
                   <PsychologyIcon />
                }
              </IconButton>
            </Tooltip>
          </Typography>
          {analysisResults[candidate.id] && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              boxShadow: 1,
              '& .MuiTypography-root': { mb: 1 }
            }}>
              <Grid container spacing={2}>
                {/* Skills Section */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 600, mb: 1 }}>
                      Skills Match: {analysisResults[candidate.id].skills.relevanceScore}%
                    </Typography>
                    <Typography variant="subtitle2">Technical Skills:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisResults[candidate.id].skills.technical.map((skill, i) => (
                        <Chip
                          key={i}
                          label={typeof skill === 'string' ? skill : `${skill.skill} (${skill.proficiency})`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Soft Skills:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisResults[candidate.id].skills.soft.map((skill, i) => (
                        <Chip
                          key={i}
                          label={typeof skill === 'string' ? skill : skill.skill}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                {/* Experience Section */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 600, mb: 1 }}>
                      Experience Match: {analysisResults[candidate.id].jobMatch.experienceMatch}%
                    </Typography>
                    <Typography>
                      Total Experience: {analysisResults[candidate.id].experience.years} years
                    </Typography>
                    <Typography>
                      Relevant Experience: {analysisResults[candidate.id].experience.relevantYears} years
                    </Typography>
                    <Typography variant="subtitle2">Companies:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisResults[candidate.id].experience.companies.map((company, i) => (
                        <Chip
                          key={i}
                          label={company}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Roles:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisResults[candidate.id].experience.roles.map((role, i) => (
                        <Chip
                          key={i}
                          label={role}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                {/* Education Section */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 600, mb: 1 }}>
                      Education Match: {analysisResults[candidate.id].jobMatch.educationMatch}%
                    </Typography>
                    <Typography>
                      Degree: {analysisResults[candidate.id].education.degree}
                    </Typography>
                    <Typography>
                      Field: {analysisResults[candidate.id].education.field}
                    </Typography>
                    <Typography variant="subtitle2">Institutions:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisResults[candidate.id].education.institutions.map((inst, i) => (
                        <Chip
                          key={i}
                          label={inst}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                {/* Overall Score */}
                <Grid item xs={12}>
                  <Paper sx={{ 
                    p: 2, 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Typography variant="h5">
                      Overall Match: {analysisResults[candidate.id].jobMatch.overallScore}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Load saved analyses on component mount
  useEffect(() => {
    const loadSavedAnalyses = async () => {
      try {
        const analysisRef = collection(db, 'candidateAnalysis');
        const querySnapshot = await getDocs(analysisRef);
        const saved: {[key: string]: boolean} = {};
        querySnapshot.forEach((doc) => {
          saved[doc.data().candidateId] = true;
        });
        setSavedAnalyses(saved);
      } catch (error) {
        console.error('Error loading saved analyses:', error);
      }
    };
    loadSavedAnalyses();
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Recruitment & Onboarding
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Job Postings" />
        <Tab label="Candidates" />
        <Tab label="Interviews" />
        <Tab label="Onboarding" />
      </Tabs>

      {activeTab === 0 && renderJobPostings()}
      {activeTab === 1 && renderCandidates()}
      {activeTab === 2 && renderInterviews()}
      {activeTab === 3 && renderOnboarding()}

      {/* Add Candidate Dialog */}
      <Dialog 
        open={isCandidateDialogOpen} 
        onClose={() => setIsCandidateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedCandidate ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>Basic Information</Typography>
            </Grid>

            {/* Document Upload Section */}
            {isCandidateDialogOpen && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, fontWeight: 500 }}>Documents</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                      {selectedCandidate?.documents?.map((doc) => (
                        <Tooltip key={doc.id} title={`${doc.name} (${doc.category})`}>
                          <IconButton
                            onClick={() => {
                              setSelectedDocument(doc);
                              setDocumentPreviewOpen(true);
                            }}
                          >
                            {doc.category === 'resume' && <DescriptionIcon color="primary" />}
                            {doc.category === 'certificate' && <CardMembershipIcon color="secondary" />}
                            {doc.category === 'id_proof' && <BadgeIcon color="error" />}
                            {doc.category === 'offer_letter' && <WorkIcon color="success" />}
                            {doc.category === 'other' && <AttachFileIcon />}
                          </IconButton>
                        </Tooltip>
                      ))}
                      {selectedCandidate ? (
                        <Button
                          variant="outlined"
                          startIcon={<CloudUploadIcon />}
                          onClick={() => setDocumentUploadOpen(true)}
                        >
                          Upload Document
                        </Button>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          You can upload documents after creating the candidate
                        </Typography>
                      )}
                    </Box>

                    {/* Document Upload Dialog */}
                    <Dialog 
                      open={documentUploadOpen} 
                      onClose={() => {
                        setDocumentUploadOpen(false);
                        setSelectedDocumentType('');
                      }}
                    >
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogContent>
                        <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
                          <FormControl fullWidth required>
                            <InputLabel>Document Type</InputLabel>
                            <Select
                              value={selectedDocumentType}
                              onChange={(e) => setSelectedDocumentType(e.target.value)}
                              label="Document Type"
                            >
                              <MenuItem value="resume">Resume</MenuItem>
                              <MenuItem value="certificate">Certificate</MenuItem>
                              <MenuItem value="id_proof">ID Proof</MenuItem>
                              <MenuItem value="offer_letter">Offer Letter</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                            style={{ display: 'none' }}
                            id="document-upload"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !selectedCandidate || !selectedDocumentType) {
                                enqueueSnackbar('Please select a document type', 'error');
                                return;
                              }

                              try {
                                const uploadResult = await uploadCandidateDocument(file, selectedCandidate.id);
                                
                                if (uploadResult.url) {
                                  await addDoc(collection(db, 'candidates', selectedCandidate.id, 'documents'), {
                                    name: file.name,
                                    url: uploadResult.url,
                                    category: selectedDocumentType,
                                    uploadDate: new Date().toISOString()
                                  });

                                  enqueueSnackbar('Document uploaded successfully', 'success');
                                  setDocumentUploadOpen(false);
                                  setSelectedDocumentType('');
                                  fetchCandidates();
                                }
                              } catch (error) {
                                console.error('Error uploading document:', error);
                                enqueueSnackbar('Error uploading document', 'error');
                              }
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={() => document.getElementById('document-upload')?.click()}
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                          >
                            Choose File
                          </Button>
                        </Stack>
                      </DialogContent>
                    </Dialog>

                    {/* Document Preview Dialog */}
                    <Dialog
                      open={documentPreviewOpen}
                      onClose={() => {
                        setDocumentPreviewOpen(false);
                        setSelectedDocument(null);
                      }}
                      maxWidth="md"
                      fullWidth
                    >
                      <DialogTitle>
                        {selectedDocument?.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {selectedDocument?.category} - Uploaded on {new Date(selectedDocument?.uploadDate || '').toLocaleDateString()}
                        </Typography>
                      </DialogTitle>
                      <DialogContent>
                        {selectedDocument?.url && (
                          selectedDocument.url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={selectedDocument.url}
                              style={{ width: '100%', height: '500px', border: 'none' }}
                              title="PDF Preview"
                            />
                          ) : (
                            <Box
                              component="img"
                              src={selectedDocument.url}
                              alt={selectedDocument.name}
                              sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '500px',
                                objectFit: 'contain'
                              }}
                            />
                          )
                        )}
                      </DialogContent>
                    </Dialog>
                  
                  </Box>
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Position"
                value={candidateForm.jobPostingId}
                onChange={(e) => setCandidateForm({ ...candidateForm, jobPostingId: e.target.value })}
              >
                {jobPostings.map((job) => (
                  <MenuItem key={job.id} value={job.id}>
                    {job.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resume URL"
                value={candidateForm.resumeUrl}
                onChange={(e) => setCandidateForm({ ...candidateForm, resumeUrl: e.target.value })}
                helperText="Enter the URL where the resume is stored"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={candidateForm.status}
                onChange={(e) => setCandidateForm({
                  ...candidateForm,
                  status: e.target.value as Candidate['status']
                })}
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="screening">Screening</MenuItem>
                <MenuItem value="interview">Interview</MenuItem>
                <MenuItem value="offer">Offer</MenuItem>
                <MenuItem value="hired">Hired</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCandidateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCandidateFormSubmit} variant="contained" color="primary">
            {selectedCandidate ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analysis Results Dialog */}
      <Dialog 
        open={Boolean(selectedAnalysisId)} 
        onClose={handleCloseAnalysisDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
            overflow: 'hidden'
          }
        }}
      >
        {selectedAnalysisId && analysisResults[selectedAnalysisId] && (
          <>
            <DialogTitle 
              sx={{ 
                background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 3,
                mb: 2
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  AI Analysis Results
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Powered by Deep Learning
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {analysisResults[selectedAnalysisId].jobMatch.overallScore}%
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Match Score
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Verdict Section */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      background: (theme) => {
                        const verdict = analysisResults[selectedAnalysisId].verdict.recommendation;
                        switch (verdict) {
                          case 'Strong Hire':
                            return 'linear-gradient(135deg, rgba(46, 125, 50, 0.03) 0%, rgba(46, 125, 50, 0.08) 100%)';
                          case 'Potential Hire':
                            return 'linear-gradient(135deg, rgba(2, 136, 209, 0.03) 0%, rgba(2, 136, 209, 0.08) 100%)';
                          case 'Consider with Reservations':
                            return 'linear-gradient(135deg, rgba(237, 108, 2, 0.03) 0%, rgba(237, 108, 2, 0.08) 100%)';
                          default:
                            return 'linear-gradient(135deg, rgba(211, 47, 47, 0.03) 0%, rgba(211, 47, 47, 0.08) 100%)';
                        }
                      },
                      borderRadius: 3,
                      border: (theme) => {
                        const verdict = analysisResults[selectedAnalysisId].verdict.recommendation;
                        switch (verdict) {
                          case 'Strong Hire':
                            return '1px solid rgba(46, 125, 50, 0.1)';
                          case 'Potential Hire':
                            return '1px solid rgba(2, 136, 209, 0.1)';
                          case 'Consider with Reservations':
                            return '1px solid rgba(237, 108, 2, 0.1)';
                          default:
                            return '1px solid rgba(211, 47, 47, 0.1)';
                        }
                      },
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 600,
                            color: (theme) => {
                              const verdict = analysisResults[selectedAnalysisId].verdict.recommendation;
                              switch (verdict) {
                                case 'Strong Hire':
                                  return theme.palette.success.main;
                                case 'Potential Hire':
                                  return theme.palette.info.main;
                                case 'Consider with Reservations':
                                  return theme.palette.warning.main;
                                default:
                                  return theme.palette.error.main;
                              }
                            }
                          }}
                        >
                          {analysisResults[selectedAnalysisId].verdict.recommendation}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Confidence Score: {analysisResults[selectedAnalysisId].verdict.confidenceScore}%
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          background: (theme) => {
                            const verdict = analysisResults[selectedAnalysisId].verdict.recommendation;
                            switch (verdict) {
                              case 'Strong Hire':
                                return 'rgba(46, 125, 50, 0.1)';
                              case 'Potential Hire':
                                return 'rgba(2, 136, 209, 0.1)';
                              case 'Consider with Reservations':
                                return 'rgba(237, 108, 2, 0.1)';
                              default:
                                return 'rgba(211, 47, 47, 0.1)';
                            }
                          },
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 120,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {analysisResults[selectedAnalysisId].jobMatch.overallScore}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                          Reasons to Hire
                        </Typography>
                        <List dense>
                          {analysisResults[selectedAnalysisId].verdict.reasonsToHire.map((reason, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircleIcon color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={reason} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 600, mb: 1 }}>
                          Areas of Caution
                        </Typography>
                        <List dense>
                          {analysisResults[selectedAnalysisId].verdict.reasonsForCaution.map((reason, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <WarningIcon color="error" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={reason} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" color="info.main" sx={{ fontWeight: 600, mb: 1 }}>
                          Recommended Next Steps
                        </Typography>
                        <List dense>
                          {analysisResults[selectedAnalysisId].verdict.nextSteps.map((step, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <ArrowForwardIcon color="info" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={step} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Summary Section */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.03) 0%, rgba(103, 58, 183, 0.08) 100%)',
                      borderRadius: 3,
                      border: '1px solid rgba(103, 58, 183, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 600, mb: 1 }}>
                          Candidate Overview
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                          {analysisResults[selectedAnalysisId].summary.overview}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          background: 'rgba(103, 58, 183, 0.1)',
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 80,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 700 }}>
                          {analysisResults[selectedAnalysisId].summary.relevanceScore}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography 
                          variant="subtitle1" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main' 
                            }} 
                          />
                          Key Insights
                        </Typography>
                        <List>
                          {analysisResults[selectedAnalysisId].summary.insights.map((insight, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <LightbulbIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={insight} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                            Strengths
                          </Typography>
                          <List dense>
                            {analysisResults[selectedAnalysisId].summary.strengths.map((strength, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <CheckCircleIcon color="success" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={strength} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                            Areas for Growth
                          </Typography>
                          <List dense>
                            {analysisResults[selectedAnalysisId].summary.areasOfImprovement.map((area, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <TrendingUpIcon color="warning" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={area} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Skills Section */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.03) 0%, rgba(25, 118, 210, 0.08) 100%)',
                      borderRadius: 3,
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                          Skills Analysis
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Technical and Soft Skills Assessment
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          background: 'rgba(25, 118, 210, 0.1)',
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 80,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                          {analysisResults[selectedAnalysisId].skills.relevanceScore}%
                        </Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography 
                          variant="subtitle1" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main' 
                            }} 
                          />
                          Technical Skills
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {analysisResults[selectedAnalysisId].skills.technical.map((skill, i) => (
                            <Chip
                              key={i}
                              label={typeof skill === 'string' ? skill : `${skill.skill} (${skill.proficiency})`}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{ 
                                borderRadius: '8px',
                                bgcolor: (theme) => {
                                  if (typeof skill === 'string') return alpha(theme.palette.primary.main, 0.1);
                                  switch (skill.proficiency) {
                                    case 'Expert':
                                      return alpha(theme.palette.success.main, 0.1);
                                    case 'Advanced':
                                      return alpha(theme.palette.info.main, 0.1);
                                    case 'Intermediate':
                                      return alpha(theme.palette.warning.main, 0.1);
                                    default:
                                      return alpha(theme.palette.grey[500], 0.1);
                                  }
                                },
                                borderColor: (theme) => {
                                  if (typeof skill === 'string') return theme.palette.primary.main;
                                  switch (skill.proficiency) {
                                    case 'Expert':
                                      return theme.palette.success.main;
                                    case 'Advanced':
                                      return theme.palette.info.main;
                                    case 'Intermediate':
                                      return theme.palette.warning.main;
                                    default:
                                      return theme.palette.grey[500];
                                  }
                                },
                                color: (theme) => {
                                  if (typeof skill === 'string') return theme.palette.primary.main;
                                  switch (skill.proficiency) {
                                    case 'Expert':
                                      return theme.palette.success.main;
                                    case 'Advanced':
                                      return theme.palette.info.main;
                                    case 'Intermediate':
                                      return theme.palette.warning.main;
                                    default:
                                      return theme.palette.grey[500];
                                  }
                                },
                                '&:hover': {
                                  bgcolor: (theme) => {
                                    if (typeof skill === 'string') return alpha(theme.palette.primary.main, 0.2);
                                    switch (skill.proficiency) {
                                      case 'Expert':
                                        return alpha(theme.palette.success.main, 0.2);
                                      case 'Advanced':
                                        return alpha(theme.palette.info.main, 0.2);
                                      case 'Intermediate':
                                        return alpha(theme.palette.warning.main, 0.2);
                                      default:
                                        return alpha(theme.palette.grey[500], 0.2);
                                    }
                                  }
                                }
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Soft Skills
                        </Typography>
                        <List dense>
                          {analysisResults[selectedAnalysisId].skills.soft.map((skill, i) => (
                            <ListItem key={i} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <PersonIcon color="secondary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={typeof skill === 'string' ? skill : skill.skill}
                                secondary={typeof skill === 'string' ? null : skill.evidence}
                                secondaryTypography={{ 
                                  variant: 'caption',
                                  color: 'text.secondary',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Experience Section */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3,
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.03) 0%, rgba(46, 125, 50, 0.08) 100%)',
                      borderRadius: 3,
                      border: '1px solid rgba(46, 125, 50, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                          Experience
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Professional Background
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          background: 'rgba(46, 125, 50, 0.1)',
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 80,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                          {analysisResults[selectedAnalysisId].jobMatch.experienceMatch}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Timeline>
                      {analysisResults[selectedAnalysisId].experience.details.map((exp, idx) => (
                        <TimelineItem key={idx}>
                          <TimelineSeparator>
                            <TimelineDot color="success" />
                            {idx < analysisResults[selectedAnalysisId].experience.details.length - 1 && (
                              <TimelineConnector />
                            )}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                bgcolor: 'rgba(46, 125, 50, 0.05)',
                                borderRadius: 2,
                                mb: 2
                              }}
                            >
                              <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600 }}>
                                {exp.role} at {exp.company}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                {exp.duration}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  Key Achievements:
                                </Typography>
                                <List dense>
                                  {exp.achievements.map((achievement, aIdx) => (
                                    <ListItem key={aIdx} sx={{ py: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 32 }}>
                                        <StarIcon color="success" fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText primary={achievement} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" color="textSecondary">
                                  Technologies Used:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {exp.technologies.map((tech, tIdx) => (
                                    <Chip
                                      key={tIdx}
                                      label={tech}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      sx={{ 
                                        borderRadius: '8px',
                                        '&:hover': {
                                          bgcolor: 'success.main',
                                          color: 'white'
                                        }
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            </Paper>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </Paper>
                </Grid>

                {/* Education Section */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3,
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(237, 108, 2, 0.03) 0%, rgba(237, 108, 2, 0.08) 100%)',
                      borderRadius: 3,
                      border: '1px solid rgba(237, 108, 2, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
                          Educational Background
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Academic History and Achievements
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          background: 'rgba(237, 108, 2, 0.1)',
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 80,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                          {analysisResults[selectedAnalysisId].jobMatch.educationMatch}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={3}>
                      {analysisResults[selectedAnalysisId].education.details.map((edu, idx) => (
                        <Grid item xs={12} key={idx}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              bgcolor: 'rgba(237, 108, 2, 0.05)',
                              borderRadius: 2
                            }}
                          >
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" color="warning.main" sx={{ fontWeight: 600 }}>
                                  {edu.institution}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                  {edu.location} • Ranking: {edu.ranking}
                                </Typography>
                                {edu.researchWork && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                      Research Work:
                                    </Typography>
                                    <Typography variant="body2">
                                      {edu.researchWork}
                                    </Typography>
                                  </Box>
                                )}
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  Achievements:
                                </Typography>
                                <List dense>
                                  {edu.achievements.map((achievement, aIdx) => (
                                    <ListItem key={aIdx} sx={{ py: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 32 }}>
                                        <SchoolIcon color="warning" fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText primary={achievement} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    onClick={() => handleSaveAnalysis(selectedAnalysisId, analysisResults[selectedAnalysisId])}
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 3,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        bgcolor: 'primary.50'
                      }
                    }}
                  >
                    Save Analysis
                  </Button>
                  <Button
                    onClick={() => {
                      const candidate = candidates.find(c => c.id === selectedAnalysisId);
                      const jobPosting = jobPostings.find(j => j.id === candidate?.jobPostingId);
                      if (candidate && jobPosting) {
                        handleReAnalyze(selectedAnalysisId, jobPosting);
                      }
                    }}
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 3,
                      borderColor: 'success.main',
                      color: 'success.main',
                      '&:hover': {
                        borderColor: 'success.dark',
                        bgcolor: 'success.50'
                      }
                    }}
                  >
                    Analyze Again
                  </Button>
                </Box>
                <Button 
                  onClick={handleCloseAnalysisDialog}
                  variant="contained"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 4
                  }}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default RecruitmentPage;
