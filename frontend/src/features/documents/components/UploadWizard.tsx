import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocuments } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useQuery } from '@tanstack/react-query';
import {
  IconUpload,
  IconFolder,
  IconX,
  IconChevronRight,
  IconChevronLeft,
  IconLock,
  IconCalendar,
  IconUsers,
  IconLoader2,
} from '@tabler/icons-react';
import './UploadWizard.css';

// Constants
const DOCUMENT_TYPES = [
  { id: 'contract', label: 'Employee Contract', icon: '📄' },
  { id: 'letter', label: 'Official Letter', icon: '✉️' },
  { id: 'department', label: 'Department Document', icon: '📁' },
  { id: 'personal', label: 'Personal Document', icon: '👤' },
  { id: 'other', label: 'Other', icon: '📎' },
] as const;

const DOCUMENT_CATEGORIES = [
  'HR Documents',
  'Financial Reports',
  'Legal Documents',
  'Employee Records',
  'Contracts',
  'Policies',
  'Training Materials',
  'Invoices',
  'Purchase Orders',
  'Tax Documents'
] as const;

// Types
interface UploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
}

// Form Schema
const uploadFormSchema = z.object({
  files: z.array(z.instanceof(File)).min(1, 'Please select at least one file'),
  folder: z.string().nullable(),
  documentType: z.enum(['contract', 'letter', 'department', 'personal', 'other']),
  category: z.enum(DOCUMENT_CATEGORIES),
  description: z.string().optional(),
  department: z.string().optional(),
  employees: z.array(z.string()).optional(),
  expiryDate: z.string().optional(),
  isConfidential: z.boolean().default(false),
  requiresAcknowledgment: z.boolean().default(false),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

const UploadWizard: React.FC<UploadWizardProps> = ({ isOpen, onClose }) => {
  const { folders, uploadDocument } = useDocuments();
  const { user } = useAuth();
  const { getDepartments, getEmployees } = useFirestore();

  // React Query for data fetching
  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: isOpen,
  });

  const { data: employees = [], isLoading: empsLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    enabled: isOpen,
  });

  // Form handling with react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      files: [],
      folder: null,
      documentType: 'other',
      category: 'HR Documents',
      isConfidential: false,
      requiresAcknowledgment: false,
    },
  });

  // File handling
  const handleDrop = (e: React.DragEvent, onChange: (files: File[]) => void) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    onChange(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, onChange: (files: File[]) => void) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      onChange(selectedFiles);
    }
  };

  const removeFile = (index: number, files: File[], onChange: (files: File[]) => void) => {
    onChange(files.filter((_, i) => i !== index));
  };

  // Form submission
  const onSubmit = async (data: UploadFormData) => {
    if (!user?.email) {
      throw new Error('You must be logged in to upload documents');
    }

    try {
      const sharedWith = [
        ...(data.employees?.map(id => ({
          type: 'employee' as const,
          id,
          name: employees.find(e => e.id === id)?.name || '',
        })) || []),
        data.department ? [{
          type: 'department' as const,
          id: data.department,
          name: departments.find(d => d.id === data.department)?.name || '',
        }] : [],
      ];

      await Promise.all(
        data.files.map(file =>
          uploadDocument(
            file,
            {
              category: data.category,
              description: data.description,
              documentType: data.documentType,
              departmentId: data.department,
              employeeId: data.documentType === 'contract' ? data.employees?.[0] : undefined,
              sharedWith,
              expiryDate: data.expiryDate,
              isConfidential: data.isConfidential,
              requiresAcknowledgment: data.requiresAcknowledgment,
              uploadedBy: user.email,
              status: 'pending',
            },
            data.folder
          )
        )
      );

      reset();
      onClose();
    } catch (error) {
      console.error('Error during upload:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="modal-overlay"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="text-2xl font-semibold">Upload Documents</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-6">
            {/* File Upload */}
            <div className="form-section">
              <label className="form-label">Upload Files</label>
              <Controller
                name="files"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div
                    onDrop={(e) => handleDrop(e, onChange)}
                    onDragOver={(e) => e.preventDefault()}
                    className="file-drop-zone"
                  >
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileSelect(e, onChange)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <IconUpload size={40} className="text-gray-400" />
                      <span className="text-gray-600">
                        Drop files here or click to upload
                      </span>
                    </label>
                    {value.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {value.map((file, index) => (
                          <div key={index} className="file-item">
                            <span className="file-item-name">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index, value, onChange)}
                              className="file-remove-btn"
                            >
                              <IconX size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
              {errors.files && (
                <p className="form-error">{errors.files.message}</p>
              )}
            </div>

            {/* Document Type */}
            <div className="form-section">
              <label className="form-label">Document Type</label>
              <Controller
                name="documentType"
                control={control}
                render={({ field }) => (
                  <div className="form-grid">
                    {DOCUMENT_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => field.onChange(type.id)}
                        className={`document-type-btn ${
                          field.value === type.id ? 'selected' : ''
                        }`}
                      >
                        <span className="text-2xl">{type.icon}</span>
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.documentType && (
                <p className="form-error">{errors.documentType.message}</p>
              )}
            </div>

            {/* Category and Description */}
            <div className="form-grid">
              <div>
                <label className="form-label">Category</label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="select-input">
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.category && (
                  <p className="form-error">{errors.category.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Description</label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Description"
                      className="input"
                    />
                  )}
                />
              </div>
            </div>

            {/* Department and Employees */}
            <div className="form-grid">
              <div>
                <label className="form-label">Department</label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="select-input">
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="form-label">Share with Employees</label>
                <Controller
                  name="employees"
                  control={control}
                  render={({ field }) => (
                    <select
                      multiple
                      {...field}
                      className="select-input"
                      onChange={(e) =>
                        field.onChange(
                          Array.from(e.target.selectedOptions, option => option.value)
                        )
                      }
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex items-center gap-6">
              <Controller
                name="isConfidential"
                control={control}
                render={({ field }) => (
                  <label className="checkbox-label">
                    <input type="checkbox" {...field} className="checkbox-input" />
                    <IconLock size={16} />
                    <span>Confidential</span>
                  </label>
                )}
              />
              <Controller
                name="requiresAcknowledgment"
                control={control}
                render={({ field }) => (
                  <label className="checkbox-label">
                    <input type="checkbox" {...field} className="checkbox-input" />
                    <IconUsers size={16} />
                    <span>Requires Acknowledgment</span>
                  </label>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="loading-spinner mr-2" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadWizard;
