import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types/task';
import { useAuth } from './useAuth';

const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user) {
      console.log('No user found in useTasks hook');
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
    try {
      console.log('Fetching tasks for user:', user.uid);
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, orderBy('dueDate', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const allTasks = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      console.log('All tasks:', allTasks);
      
      const userTasks = allTasks.filter(task => task.assignedTo === user.uid);
      console.log('Filtered tasks for user:', userTasks);
      
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addTask = async (taskData: Omit<Task, 'id'>) => {
    if (!user) return;
    
    try {
      const tasksRef = collection(db, 'tasks');
      await addDoc(tasksRef, taskData);
      await fetchTasks();
    } catch (err) {
      setError('Failed to add task');
      console.error('Error adding task:', err);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
      await fetchTasks();
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks: fetchTasks,
  };
};

export { useTasks };
