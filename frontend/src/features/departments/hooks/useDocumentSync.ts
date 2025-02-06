import { useEffect, useState } from 'react';
import { useFirestore } from '../../../contexts/FirestoreContext';
import { Document } from '../../../types';

export const useDocumentSync = (departmentId: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { listDepartmentDocuments, onDepartmentDocumentsChange } = useFirestore();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const docs = await listDepartmentDocuments(departmentId);
        setDocuments(docs);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();

    // Set up real-time listener
    const unsubscribe = onDepartmentDocumentsChange(departmentId, (updatedDocs) => {
      setDocuments(updatedDocs);
    });

    return () => {
      unsubscribe();
    };
  }, [departmentId]);

  return {
    documents,
    isLoading,
    error,
  };
};
