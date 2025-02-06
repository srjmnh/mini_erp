import { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/config/firebase';
import { Document } from '@/types/document';

// Types
export interface Document {
  id: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: Date;
  folderId: string | null;
  size: number;
  type: string;
  status: 'active' | 'inactive';
  accessRoles: string[];
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
  tags?: string[];
  category?: string;
  customMetadata?: any;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string[];
  accessRoles: string[];
  createdBy: string;
  createdAt: string;
  departmentId?: string;
  isPersonal?: boolean;
  ownerId?: string;
}

interface DocumentContextType {
  documents: Document[];
  folders: Folder[];
  loading: boolean;
  error: string | null;
  uploadDocument: (file: File, metadata: Partial<Document>, folderId?: string) => Promise<void>;
  deleteDocument: (documentId: string, storagePath: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  getDownloadUrl: (storagePath: string) => Promise<string>;
  createFolder: (name: string, parentId: string | null, accessRoles: string[]) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveDocument: (documentId: string, newFolderId: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
      setDocuments(docs);
    }, (error) => {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    });

    const unsubscribeFolders = onSnapshot(collection(db, 'folders'), (snapshot) => {
      const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
      setFolders(folders);
    }, (error) => {
      console.error('Error fetching folders:', error);
      setError('Failed to fetch folders');
    });

    setLoading(false);

    return () => {
      unsubscribeDocs();
      unsubscribeFolders();
    };
  }, []);

  const uploadDocument = async (file: File, metadata: Partial<Document>, folderId: string = 'root') => {
    try {
      setError(null);
      setLoading(true);
      
      // Create a unique file path
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storagePath = `${folderId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      if (!data) {
        throw new Error('Upload failed - no data returned');
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Prepare document data with validation
      const docData = {
        fileName: file.name,
        storagePath,
        downloadURL: publicUrl,
        uploadedAt: new Date(),
        folderId,
        size: file.size,
        type: file.type,
        status: 'active',
        accessRoles: metadata.accessRoles || ['admin'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Only include metadata fields that are not undefined
        ...(metadata.name && { name: metadata.name }),
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.tags && { tags: metadata.tags }),
        ...(metadata.category && { category: metadata.category }),
        ...(metadata.customMetadata && { customMetadata: metadata.customMetadata }),
      };

      // Save metadata to Firestore
      const docRef = await addDoc(collection(db, 'documents'), docData);
      console.log('Document uploaded successfully:', docRef.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error uploading document:', error);
      setError(`Failed to upload ${file.name}: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string, storagePath: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Delete from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', documentId));
      console.log('Document deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error deleting document:', error);
      setError(`Failed to delete document: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      setError(null);
      await updateDoc(doc(db, 'documents', id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      setError('Failed to update document');
      throw error;
    }
  };

  const getDownloadUrl = async (storagePath: string) => {
    try {
      setError(null);
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);
      return publicUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      setError('Failed to get download URL');
      throw error;
    }
  };

  const createFolder = async (name: string, parentId: string | null, accessRoles: string[]) => {
    try {
      const timestamp = new Date().toISOString();
      const parentFolder = parentId ? folders.find(f => f.id === parentId) : null;
      const path = parentFolder ? [...parentFolder.path, name] : [name];

      const folderData: Omit<Folder, 'id'> = {
        name,
        parentId,
        path,
        accessRoles,
        createdBy: 'current-user', // Replace with actual user ID
        createdAt: timestamp,
        departmentId: null,
        isPersonal: false,
        ownerId: null,
      };

      await addDoc(collection(db, 'folders'), folderData);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      // Delete all documents in the folder
      const folderDocs = documents.filter(doc => doc.folderId === id);
      await Promise.all(folderDocs.map(doc => deleteDocument(doc.id, doc.storagePath)));

      // Delete all subfolders
      const subFolders = folders.filter(f => f.parentId === id);
      await Promise.all(subFolders.map(f => deleteFolder(f.id)));

      // Delete the folder itself
      await deleteDoc(doc(db, 'folders', id));
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  const moveDocument = async (documentId: string, newFolderId: string) => {
    try {
      await updateDoc(doc(db, 'documents', documentId), {
        folderId: newFolderId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error moving document:', error);
      throw error;
    }
  };

  const value = {
    documents,
    folders,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    updateDocument,
    getDownloadUrl,
    createFolder,
    deleteFolder,
    moveDocument,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
