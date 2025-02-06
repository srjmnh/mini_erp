import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirestore } from './FirestoreContext';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectMember {
  employeeId: string;
  role: 'project_manager' | 'team_lead' | 'member';
  joinedAt: string;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  mentions: string[]; // user IDs
}

interface TimeLog {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  description: string;
  duration: number; // in minutes
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface TaskDependency {
  id: string;
  dependsOn: string; // task ID
  type: 'blocks' | 'blocked_by' | 'relates_to';
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: ProjectPriority;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number;
  actualHours?: number;
  comments: Comment[];
  attachments: Attachment[];
  timeLogs: TimeLog[];
  dependencies: TaskDependency[];
  tags: string[];
  cost?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskDescription?: string;
  customFields?: Record<string, any>;
  recurringConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: string;
    interval: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate?: string;
  budget?: number;
  actualCost?: number;
  departments: Array<{
    id: string;
    name: string;
    assignedAt: string;
  }>;
  members: ProjectMember[];
  tasks: ProjectTask[];
  progress: number;
  createdAt: string;
  updatedAt: string;
  documents: Attachment[];
  milestones: {
    id: string;
    title: string;
    dueDate: string;
    status: 'pending' | 'completed';
    description?: string;
  }[];
  risks: {
    id: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    probability: 'low' | 'medium' | 'high';
    mitigation?: string;
    status: 'open' | 'mitigated' | 'closed';
  }[];
  meetings: {
    id: string;
    title: string;
    date: string;
    duration: number;
    attendees: string[];
    notes?: string;
    location?: string;
    videoLink?: string;
  }[];
}

interface ProjectContextType {
  projects: Project[];
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProjectMember: (projectId: string, member: Omit<ProjectMember, 'joinedAt'>) => Promise<void>;
  removeProjectMember: (projectId: string, employeeId: string) => Promise<void>;
  updateProjectMember: (projectId: string, employeeId: string, role: ProjectMember['role']) => Promise<void>;
  addTask: (projectId: string, task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (projectId: string, taskId: string, task: Partial<ProjectTask>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { employees } = useFirestore();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
    });

    return () => unsubscribe();
  }, []);

  const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const projectRef = doc(collection(db, 'projects'));
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      id: projectRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(projectRef, newProject);
    return projectRef.id;
  };

  const updateProject = async (id: string, project: Partial<Project>) => {
    try {
      // Validate project ID
      if (!id) {
        throw new Error('Project ID is required');
      }

      // Check if project exists
      const projectRef = doc(db, 'projects', id);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        throw new Error('Project not found');
      }

      // Validate project data
      if (project.startDate && isNaN(Date.parse(project.startDate))) {
        throw new Error('Invalid start date format');
      }
      if (project.endDate && isNaN(Date.parse(project.endDate))) {
        throw new Error('Invalid end date format');
      }
      if (project.budget && typeof project.budget !== 'number') {
        throw new Error('Budget must be a number');
      }
      if (project.actualCost && typeof project.actualCost !== 'number') {
        throw new Error('Actual cost must be a number');
      }

      // Add updated timestamp
      const updateData = {
        ...project,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined values to prevent overwriting with undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await updateDoc(projectRef, updateData);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error instanceof Error ? error : new Error('Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    await deleteDoc(doc(db, 'projects', id));
  };

  const addProjectMember = async (projectId: string, member: Omit<ProjectMember, 'joinedAt'>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const newMember: ProjectMember = {
      ...member,
      joinedAt: new Date().toISOString(),
    };

    await updateProject(projectId, {
      members: [...project.members, newMember],
    });
  };

  const removeProjectMember = async (projectId: string, employeeId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    await updateProject(projectId, {
      members: project.members.filter(m => m.employeeId !== employeeId),
    });
  };

  const updateProjectMember = async (projectId: string, employeeId: string, role: ProjectMember['role']) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    await updateProject(projectId, {
      members: project.members.map(m => 
        m.employeeId === employeeId ? { ...m, role } : m
      ),
    });
  };

  const addTask = async (projectId: string, task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const taskId = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newTask: ProjectTask = {
      ...task,
      id: taskId,
      createdAt: now,
      updatedAt: now,
    };

    const updatedTasks = [...project.tasks, newTask];
    
    // Calculate new progress
    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter(t => t.status === 'done').length;
    const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    console.log('Adding task, updating progress:', { totalTasks, completedTasks, newProgress });

    await updateProject(projectId, {
      tasks: updatedTasks,
      progress: newProgress
    });

    return taskId;
  };

  const updateTask = async (projectId: string, taskId: string, taskUpdate: Partial<ProjectTask>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, ...taskUpdate, updatedAt: new Date().toISOString() } : t
    );

    // Calculate new progress
    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter(t => t.status === 'done').length;
    const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    console.log('Updating project progress:', { totalTasks, completedTasks, newProgress });

    await updateProject(projectId, {
      tasks: updatedTasks,
      progress: newProgress
    });
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    await updateProject(projectId, {
      tasks: project.tasks.filter(t => t.id !== taskId),
    });
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        createProject,
        updateProject,
        deleteProject,
        addProjectMember,
        removeProjectMember,
        updateProjectMember,
        addTask,
        updateTask,
        deleteTask,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
