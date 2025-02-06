import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSnackbar } from './SnackbarContext';
import { useAuth } from './AuthContext';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Folder {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  documentCount: number;
}

interface SupabaseContextType {
  supabase: ReturnType<typeof createClient>;
  customFolders: Folder[];
  fetchCustomFolders: () => Promise<void>;
  getDocumentCount: (folderPath: string) => Promise<number>;
  syncStorageWithDatabase: (folderPath: string) => Promise<void>;
}

export const SupabaseContext = createContext<SupabaseContextType>({
  supabase,
  customFolders: [],
  fetchCustomFolders: async () => {},
  getDocumentCount: async () => 0,
  syncStorageWithDatabase: async () => {},
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [customFolders, setCustomFolders] = useState<Folder[]>([]);
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const syncStorageWithDatabase = async (folderPath: string) => {
    try {
      // List files in storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('documents')
        .list(folderPath);

      if (storageError) {
        console.error('Storage error:', storageError);
        return;
      }

      // Get existing files in database for this path
      const { data: dbFiles, error: dbError } = await supabase
        .from('files')
        .select('storage_path')
        .eq('folder_path', folderPath);

      if (dbError) {
        console.error('Database error:', dbError);
        return;
      }

      const existingPaths = new Set(dbFiles?.map(f => f.storage_path) || []);

      // Add missing files to database
      for (const file of storageFiles || []) {
        const storagePath = `${folderPath}/${file.name}`;
        if (!existingPaths.has(storagePath)) {
          const { error: insertError } = await supabase
            .from('files')
            .insert({
              name: file.name,
              folder_path: folderPath,
              type: file.metadata?.mimetype || 'application/octet-stream',
              size: file.metadata?.size || 0,
              storage_path: storagePath,
              created_by: null // Set to null since we're using Firebase auth
            });

          if (insertError) {
            console.error('Error inserting file:', insertError);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing storage with database:', error);
    }
  };

  const getDocumentCount = async (folderPath: string): Promise<number> => {
    try {
      // First sync storage with database
      await syncStorageWithDatabase(folderPath);
      
      const { count, error } = await supabase
        .from('files')
        .select('*', { count: 'exact' })
        .eq('folder_path', folderPath);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting document count:', error);
      return 0;
    }
  };

  const fetchCustomFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_folders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get document counts for each folder
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder) => {
          const count = await getDocumentCount(folder.path);
          return {
            ...folder,
            documentCount: count
          };
        })
      );

      setCustomFolders(foldersWithCounts);
    } catch (error) {
      console.error('Error fetching custom folders:', error);
      showSnackbar('Failed to fetch folders', 'error');
    }
  };

  useEffect(() => {
    fetchCustomFolders();
  }, []);

  const value = {
    supabase,
    customFolders,
    fetchCustomFolders,
    getDocumentCount,
    syncStorageWithDatabase,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
