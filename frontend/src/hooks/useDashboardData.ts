import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: string;
  department?: string;
}

interface TaskComment {
  text: string;
  progress: number;
  timestamp: Date;
  userId: string;
  userName: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date;
  assigneeId: string;
  assignedTo: string;
  comments: TaskComment[];
  completed: boolean;
  latestComment?: TaskComment;
}

interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: string;
  dueDate: Date;
  members: { employeeId: string }[];
  departmentId?: string;
}

interface DashboardData {
  teamMembers: TeamMember[];
  projects: Project[];
  tasks: Task[];
  timeOffBalance: {
    vacation: number;
    sick: number;
    personal: number;
  };
  loading: boolean;
  error: string | null;
}

const useDashboardData = (): DashboardData => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeOffBalance, setTimeOffBalance] = useState({
    vacation: 0,
    sick: 0,
    personal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, userRole } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }

    // Clear any previous error
    setError(null);

    // Check for user and role
    if (!user) {
      console.error('Dashboard access denied: No user');
      setError('Authentication required');
      setLoading(false);
      return;
    }

    // Log current user state
    console.log('Current user state:', {
      uid: user.uid,
      email: user.email,
      role: userRole,
      departmentId: user.departmentId || 'unassigned',
      teamId: user.teamId || 'none'
    });

    try {
      setLoading(true);

      // Fetch team members based on role
      console.log('Fetching team members for user:', { 
        email: user.email,
        role: userRole,
        departmentId: user.departmentId
      });
      
      const teamMembersRef = collection(db, 'employees');
      let teamMembersQuery;
      
      if (userRole === 'hr') {
        // HR can see all employees
        console.log('HR view: Fetching all employees');
        teamMembersQuery = query(teamMembersRef);
      } else if (userRole === 'manager') {
        // Managers can see all employees in their department
        console.log('Manager view: Fetching department employees');
        teamMembersQuery = query(
          teamMembersRef,
          where('departmentId', '==', user.departmentId)
        );
      } else {
        // Regular employees can only see their department members
        console.log('Employee view: Fetching department members');
        teamMembersQuery = query(
          teamMembersRef,
          where('departmentId', '==', user.departmentId)
        );
      }
      
      const teamMembersSnapshot = await getDocs(teamMembersQuery);
      const fetchedTeamMembers = teamMembersSnapshot.docs
        .filter(doc => doc.id !== user.uid) // Exclude current user
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            name: data.name || 'Unknown',
            role: data.role || 'employee',
            status: data.status || 'active',
            department: data.department,
            departmentId: data.departmentId,
            teamId: data.teamId,
            avatar: data.avatar || undefined
          };
        });
      
      console.log('Fetched team members:', fetchedTeamMembers);
      setTeamMembers(fetchedTeamMembers);

      // First get the employee ID for the current user
      const employeesRef = collection(db, 'employees');
      const employeeQuery = query(employeesRef, where('email', '==', user.email));
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (employeeSnapshot.empty) {
        console.error('No employee record found for email:', user.email);
        setError('Employee record not found');
        setLoading(false);
        return;
      }
      
      const employeeId = employeeSnapshot.docs[0].id;
      console.log('Found employee ID:', employeeId);

      // Fetch projects using employee ID
      console.log('Fetching projects for employee:', employeeId);
      const projectsRef = collection(db, 'projects');
      let projectsQuery;

      try {
        // Query projects where the employee is a member
        projectsQuery = query(
          projectsRef,
          where('members', 'array-contains', { employeeId: employeeId }),
          orderBy('dueDate', 'asc')
        );
        console.log('Querying projects for employee ID:', employeeId);
      } catch (err) {
        console.error('Error creating projects query:', err);
        projectsQuery = query(projectsRef, orderBy('dueDate', 'asc'));
      }
      const projectsSnapshot = await getDocs(projectsQuery);
      const fetchedProjects = projectsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Project data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate() || new Date(), // Convert Firestore Timestamp to Date
        };
      }) as Project[];
      
      console.log('Fetched projects:', fetchedProjects);
      setProjects(fetchedProjects);

      // Fetch tasks for the employee
      console.log('Fetching tasks for employee:', employeeId);
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(
        tasksRef,
        where('assigneeId', '==', employeeId),
        orderBy('dueDate', 'asc')
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      const fetchedTasks = await Promise.all(tasksSnapshot.docs.map(async doc => {
        const data = doc.data();
        console.log('Task data:', { id: doc.id, ...data });
        
        // Get comments
        const commentsQuery = query(
          collection(db, `tasks/${doc.id}/comments`),
          orderBy('timestamp', 'desc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = commentsSnapshot.docs.map(commentDoc => {
          const commentData = commentDoc.data();
          return {
            text: commentData.text,
            progress: commentData.progress,
            timestamp: commentData.timestamp?.toDate(),
            userId: commentData.userId,
            userName: commentData.userName
          };
        });

        return {
          id: doc.id,
          title: data.title || 'Untitled Task',
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          dueDate: data.dueDate?.toDate() || new Date(),
          assigneeId: data.assigneeId,
          assignedTo: data.assignedTo || 'Unassigned',
          comments,
          completed: data.completed === true || data.status === 'done',
          latestComment: comments.length > 0 ? comments[0] : undefined
        };
      }));
      
      console.log('Fetched tasks:', fetchedTasks);
      setTasks(fetchedTasks);

      // Fetch time off balance from leaveBalances collection
      console.log('Fetching time off balance for user:', user.uid);
      const currentYear = new Date().getFullYear();
      const balanceId = `${user.uid}-${currentYear}`;
      const balanceRef = collection(db, 'leaveBalances');
      const balanceDoc = await getDoc(doc(balanceRef, balanceId));
      
      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        console.log('Found leave balance:', data);
        
        setTimeOffBalance({
          vacation: data.casual || 0, // casual leave is shown as vacation in dashboard
          sick: data.sick || 0,
          personal: 0 // we don't have personal leave in the new system
        });
      } else {
        console.log('No leave balance found, using defaults');
        setTimeOffBalance({
          vacation: 25, // default casual leave days
          sick: 999, // unlimited sick leave
          personal: 0 // no personal leave
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, userRole, authLoading]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    teamMembers,
    projects,
    tasks,
    timeOffBalance,
    ...timeOffBalance,
    loading,
    error,
  };
};

export { useDashboardData };
