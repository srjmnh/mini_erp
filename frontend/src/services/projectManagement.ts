import { db, storage } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Collection references
const projectsRef = collection(db, 'projects');
const tasksRef = collection(db, 'tasks');
const commentsRef = collection(db, 'comments');
const timeLogsRef = collection(db, 'timeLogs');
const attachmentsRef = collection(db, 'attachments');
const milestonesRef = collection(db, 'milestones');
const risksRef = collection(db, 'risks');
const meetingsRef = collection(db, 'meetings');

// Project Management Service
export const projectManagementService = {
  // Projects
  async createProject(data: any) {
    return await addDoc(projectsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      progress: 0
    });
  },

  async updateProject(projectId: string, data: any) {
    const projectRef = doc(projectsRef, projectId);
    return await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Tasks
  async createTask(projectId: string, data: any) {
    return await addDoc(tasksRef, {
      ...data,
      projectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async updateTask(taskId: string, data: any) {
    const taskRef = doc(tasksRef, taskId);
    return await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Comments
  async addComment(taskId: string, userId: string, content: string, mentions: string[] = []) {
    return await addDoc(commentsRef, {
      taskId,
      userId,
      content,
      mentions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // Time Tracking
  async startTimeTracking(taskId: string, userId: string, description?: string) {
    return await addDoc(timeLogsRef, {
      taskId,
      userId,
      startTime: serverTimestamp(),
      description,
      createdAt: serverTimestamp()
    });
  },

  async stopTimeTracking(timeLogId: string) {
    const timeLogRef = doc(timeLogsRef, timeLogId);
    return await updateDoc(timeLogRef, {
      endTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // File Attachments
  async uploadAttachment(file: File, taskId?: string, projectId?: string) {
    if (!taskId && !projectId) {
      throw new Error('Either taskId or projectId must be provided');
    }

    // Upload file to Firebase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const path = `${taskId ? 'tasks' : 'projects'}/${taskId || projectId}/${fileName}`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // Save attachment metadata to Firestore
    return await addDoc(attachmentsRef, {
      name: file.name,
      url: downloadURL,
      type: file.type,
      size: file.size,
      taskId,
      projectId,
      uploadedAt: serverTimestamp()
    });
  },

  // Milestones
  async createMilestone(projectId: string, data: any) {
    return await addDoc(milestonesRef, {
      ...data,
      projectId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // Risks
  async createRisk(projectId: string, data: any) {
    return await addDoc(risksRef, {
      ...data,
      projectId,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // Meetings
  async scheduleMeeting(projectId: string, data: any) {
    return await addDoc(meetingsRef, {
      ...data,
      projectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async updateMeetingResponse(meetingId: string, userId: string, status: 'accepted' | 'declined') {
    const meetingRef = doc(meetingsRef, meetingId);
    return await updateDoc(meetingRef, {
      [`responses.${userId}`]: status,
      updatedAt: serverTimestamp()
    });
  }
};
