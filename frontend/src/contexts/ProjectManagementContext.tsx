import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSnackbar } from './SnackbarContext';
import { Comment, TimeLog, Attachment, TaskDependency, Project, ProjectTask } from './ProjectContext';
import { projectManagementService } from '../services/projectManagement';
import { useAuth } from './AuthContext';

interface ProjectManagementContextType {
  // Comments
  addComment: (taskId: string, content: string, mentions: string[]) => Promise<string>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  
  // Time tracking
  startTimeTracking: (taskId: string, description?: string) => Promise<string>;
  stopTimeTracking: (timeLogId: string) => Promise<void>;
  updateTimeLog: (timeLogId: string, data: Partial<TimeLog>) => Promise<void>;
  deleteTimeLog: (timeLogId: string) => Promise<void>;
  
  // Attachments
  uploadAttachment: (file: File, taskId?: string, projectId?: string) => Promise<string>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  
  // Task Dependencies
  addDependency: (taskId: string, dependsOnId: string, type: TaskDependency['type']) => Promise<string>;
  removeDependency: (dependencyId: string) => Promise<void>;
  
  // Milestones
  addMilestone: (projectId: string, title: string, dueDate: string, description?: string) => Promise<string>;
  updateMilestone: (milestoneId: string, data: Partial<Project['milestones'][0]>) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  
  // Risks
  addRisk: (projectId: string, data: Omit<Project['risks'][0], 'id'>) => Promise<string>;
  updateRisk: (riskId: string, data: Partial<Project['risks'][0]>) => Promise<void>;
  deleteRisk: (riskId: string) => Promise<void>;
  
  // Meetings
  scheduleMeeting: (projectId: string, data: Omit<Project['meetings'][0], 'id'>) => Promise<string>;
  updateMeeting: (meetingId: string, data: Partial<Project['meetings'][0]>) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;
  respondToMeeting: (meetingId: string, status: 'accepted' | 'declined') => Promise<void>;
}

const ProjectManagementContext = createContext<ProjectManagementContextType | undefined>(undefined);

export function ProjectManagementProvider({ children }: { children: React.ReactNode }) {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  // Comments
  const addComment = async (taskId: string, content: string, mentions: string[] = []) => {
    try {
      const docRef = await projectManagementService.addComment(taskId, user.uid, content, mentions);
      showSnackbar('Comment added successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      showSnackbar('Failed to add comment', 'error');
      throw error;
    }
  };

  // Time tracking
  const startTimeTracking = async (taskId: string, description?: string) => {
    try {
      const docRef = await projectManagementService.startTimeTracking(taskId, user.uid, description);
      showSnackbar('Time tracking started', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error starting time tracking:', error);
      showSnackbar('Failed to start time tracking', 'error');
      throw error;
    }
  };

  const stopTimeTracking = async (timeLogId: string) => {
    try {
      await projectManagementService.stopTimeTracking(timeLogId);
      showSnackbar('Time tracking stopped', 'success');
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      showSnackbar('Failed to stop time tracking', 'error');
      throw error;
    }
  };

  // File uploads
  const uploadAttachment = async (file: File, taskId?: string, projectId?: string) => {
    try {
      const docRef = await projectManagementService.uploadAttachment(file, taskId, projectId);
      showSnackbar('File uploaded successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      showSnackbar('Failed to upload file', 'error');
      throw error;
    }
  };

  // Dependencies
  const addDependency = async (taskId: string, dependsOnId: string, type: TaskDependency['type']) => {
    try {
      const docRef = await projectManagementService.addDependency(taskId, dependsOnId, type);
      showSnackbar('Dependency added successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error adding dependency:', error);
      showSnackbar('Failed to add dependency', 'error');
      throw error;
    }
  };

  // Milestones
  const addMilestone = async (projectId: string, title: string, dueDate: string, description?: string) => {
    try {
      const docRef = await projectManagementService.createMilestone(projectId, {
        title,
        dueDate,
        description
      });
      showSnackbar('Milestone added successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error adding milestone:', error);
      showSnackbar('Failed to add milestone', 'error');
      throw error;
    }
  };

  // Risks
  const addRisk = async (projectId: string, data: any) => {
    try {
      const docRef = await projectManagementService.createRisk(projectId, data);
      showSnackbar('Risk added successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error adding risk:', error);
      showSnackbar('Failed to add risk', 'error');
      throw error;
    }
  };

  // Meetings
  const scheduleMeeting = async (projectId: string, data: any) => {
    try {
      const docRef = await projectManagementService.scheduleMeeting(projectId, data);
      showSnackbar('Meeting scheduled successfully', 'success');
      return docRef.id;
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      showSnackbar('Failed to schedule meeting', 'error');
      throw error;
    }
  };

  const respondToMeeting = async (meetingId: string, status: 'accepted' | 'declined') => {
    try {
      await projectManagementService.updateMeetingResponse(meetingId, user.uid, status);
      showSnackbar('Meeting response updated', 'success');
    } catch (error) {
      console.error('Error updating meeting response:', error);
      showSnackbar('Failed to update meeting response', 'error');
      throw error;
    }
  };

  const value = {
    addComment,
    startTimeTracking,
    stopTimeTracking,
    uploadAttachment,
    addDependency,
    addMilestone,
    addRisk,
    scheduleMeeting,
    respondToMeeting,
    // ... implement other methods
  };

  return (
    <ProjectManagementContext.Provider value={value}>
      {children}
    </ProjectManagementContext.Provider>
  );
}

export function useProjectManagement() {
  const context = useContext(ProjectManagementContext);
  if (context === undefined) {
    throw new Error('useProjectManagement must be used within a ProjectManagementProvider');
  }
  return context;
}
