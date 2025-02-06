import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IconUpload, IconX } from '@tabler/icons-react';
import { buttonStyles, inputStyles, cardStyles, typographyStyles } from '@/styles/components';

interface UploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, metadata: any) => Promise<void>;
}

const UploadWizard: React.FC<UploadWizardProps> = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    category: '',
    department: '',
    confidential: false,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await onUpload(file, metadata);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cardStyles.base}>
      <div className={cardStyles.header}>
        <div className="flex justify-between items-center">
          <h3 className={typographyStyles.h2}>Upload Document</h3>
          <button
            onClick={onClose}
            className={`${buttonStyles.base} ${buttonStyles.icon}`}
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={cardStyles.body}>
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors duration-200"
          >
            {file ? (
              <div>
                <IconUpload className="mx-auto h-12 w-12 text-blue-500" />
                <p className={`${typographyStyles.body} mt-2`}>{file.name}</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className={`${buttonStyles.base} ${buttonStyles.text} ${buttonStyles.sm} mt-2`}
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div>
                <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                <p className={`${typographyStyles.body} mt-2`}>
                  Drag and drop your file here, or{' '}
                  <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                  </label>
                </p>
                <p className={`${typographyStyles.caption} mt-1`}>
                  Supported files: PDF, DOC, DOCX, TXT
                </p>
              </div>
            )}
          </div>

          {/* Metadata Form */}
          {file && (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="title" className={typographyStyles.label}>
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className={inputStyles.input}
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className={typographyStyles.label}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className={inputStyles.input}
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="category" className={typographyStyles.label}>
                  Category
                </label>
                <select
                  id="category"
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className={inputStyles.select}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <label htmlFor="department" className={typographyStyles.label}>
                  Department
                </label>
                <select
                  id="department"
                  value={metadata.department}
                  onChange={(e) => setMetadata({ ...metadata, department: e.target.value })}
                  className={inputStyles.select}
                  required
                >
                  <option value="">Select Department</option>
                  <option value="HR">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="IT">Information Technology</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={metadata.confidential}
                  onChange={(e) => setMetadata({ ...metadata, confidential: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="confidential" className={`${typographyStyles.label} ml-2 mb-0`}>
                  Mark as confidential
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className={cardStyles.footer}>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`${buttonStyles.base} ${buttonStyles.secondary} ${buttonStyles.md}`}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${buttonStyles.base} ${buttonStyles.primary} ${buttonStyles.md}`}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UploadWizard;
