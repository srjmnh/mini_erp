import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';

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
}

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

const RecruitmentPage: React.FC = () => {
  const { user, userRole } = useAuth();
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
      showSnackbar('Error fetching employees', 'error');
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
      showSnackbar('Error fetching departments', 'error');
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
      showSnackbar('Error fetching job postings', 'error');
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
          
          // Only apply 'in' filter if we have job IDs
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
      const candidates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      setCandidates(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      enqueueSnackbar('Error fetching candidates', { variant: 'error' });
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
      showSnackbar('Error fetching onboarding tasks', 'error');
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

      showSnackbar('Event added to calendar', 'success');
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      showSnackbar('Error adding event to calendar', 'error');
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
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }
      
      // Validate interviewer is selected
      if (!interviewForm.interviewerId || interviewForm.interviewerId === 'none') {
        console.warn('Invalid interviewer:', interviewForm.interviewerId);
        showSnackbar('Please select an interviewer', 'error');
        return;
      }
      
      // Validate interviewer exists in employees list
      const selectedInterviewer = employees.find(e => e.id === interviewForm.interviewerId);
      if (!selectedInterviewer) {
        console.error('Selected interviewer not found in employees list:', {
          interviewerId: interviewForm.interviewerId,
          availableEmployees: employees.map(e => ({ id: e.id, name: e.name }))
        });
        showSnackbar('Selected interviewer not found', 'error');
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
                showSnackbar('You can only manage interviews for your department', 'error');
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
        showSnackbar('Interview updated successfully', 'success');
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
        showSnackbar('Interview scheduled successfully', 'success');
      }
      setIsInterviewDialogOpen(false);
      fetchInterviews();
    } catch (error) {
      console.error('Error saving interview:', error);
      showSnackbar('Error saving interview', 'error');
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
                showSnackbar('You can only manage tasks for your department', 'error');
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
        showSnackbar('Task updated successfully', 'success');
      } else {
        await addDoc(collection(db, 'onboardingTasks'), {
          ...taskForm,
          createdAt: new Date().toISOString(),
        });
        showSnackbar('Task created successfully', 'success');
      }
      setIsOnboardingDialogOpen(false);
      fetchOnboardingTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      showSnackbar('Error saving task', 'error');
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await deleteDoc(doc(db, 'interviews', interviewId));
      showSnackbar('Interview deleted successfully', 'success');
      fetchInterviews();
    } catch (error) {
      console.error('Error deleting interview:', error);
      showSnackbar('Error deleting interview', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'onboardingTasks', taskId));
      showSnackbar('Task deleted successfully', 'success');
      fetchOnboardingTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showSnackbar('Error deleting task', 'error');
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
      enqueueSnackbar('Error fetching interviews', { variant: 'error' });
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
        showSnackbar('Job posting updated successfully', 'success');
      } else {
        // Create new job
        await addDoc(collection(db, 'jobPostings'), {
          ...jobForm,
          postedDate: new Date().toISOString(),
          status: 'open'
        });
        showSnackbar('Job posting created successfully', 'success');
      }
      setIsJobDialogOpen(false);
      fetchJobPostings();
    } catch (error) {
      console.error('Error saving job posting:', error);
      showSnackbar('Error saving job posting', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, 'jobPostings', jobId));
      showSnackbar('Job posting deleted successfully', 'success');
      fetchJobPostings();
    } catch (error) {
      console.error('Error deleting job posting:', error);
      showSnackbar('Error deleting job posting', 'error');
    }
  };

  // Candidate management states
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState({
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
        showSnackbar('Candidate updated successfully', 'success');
      } else {
        // Create new candidate
        await addDoc(collection(db, 'candidates'), {
          ...candidateForm,
          appliedDate: new Date().toISOString(),
        });
        showSnackbar('Candidate added successfully', 'success');
      }
      setIsCandidateDialogOpen(false);
      fetchCandidates();
    } catch (error) {
      console.error('Error saving candidate:', error);
      showSnackbar('Error saving candidate', 'error');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', candidateId));
      showSnackbar('Candidate deleted successfully', 'success');
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      showSnackbar('Error deleting candidate', 'error');
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
        {candidates.map((candidate) => {
          const job = jobPostings.find(j => j.id === candidate.jobPostingId);
          return (
            <Grid item xs={12} md={6} key={candidate.id}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6">{candidate.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {job?.title || 'Unknown Position'}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
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
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCandidate(candidate.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Email:</strong> {candidate.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {candidate.phone}
                    </Typography>
                  </Grid>
                </Grid>

                <Typography variant="body2" paragraph>
                  <strong>Notes:</strong><br />
                  {candidate.notes}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={candidate.status.toUpperCase()}
                    color={getStatusColor(candidate.status)}
                    size="small"
                  />
                  <Typography variant="caption">
                    Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Candidate Dialog */}
      <Dialog open={isCandidateDialogOpen} onClose={() => setIsCandidateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCandidate ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
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
              interviewerId: '',
              dateTime: '',
              type: 'technical',
              status: 'scheduled',
              feedback: '',
              location: '',
              meetingLink: '',
              duration: 60,
              participants: [],
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
                        <Chip key={value} label={employees.find(emp => emp.id === value)?.name || value} />
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
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
    </Paper>
  );
};

export default RecruitmentPage;
