import React from 'react';
import { motion } from 'framer-motion';
import {
  IconFile,
  IconFileText,
  IconTable,
  IconPdf,
  IconZip,
  IconDotsVertical,
  IconShare,
  IconTrash,
  IconPencil,
  IconDownload,
  IconLock,
  IconClock,
  IconEye,
} from '@tabler/icons-react';
import { Menu } from '@headlessui/react';
import { format } from 'date-fns';
import { Document } from '@/types/document';

interface DocumentListProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  onDocumentShare: (document: Document) => void;
  onDocumentEdit: (document: Document) => void;
  onDocumentDelete: (document: Document) => void;
  onDocumentDownload: (document: Document) => void;
}

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return <IconPdf className="w-6 h-6 text-red-500" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <IconTable className="w-6 h-6 text-green-500" />;
    case 'doc':
    case 'docx':
    case 'txt':
      return <IconFileText className="w-6 h-6 text-blue-500" />;
    case 'zip':
    case 'rar':
      return <IconZip className="w-6 h-6 text-purple-500" />;
    default:
      return <IconFile className="w-6 h-6 text-gray-500" />;
  }
};

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentClick,
  onDocumentShare,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentDownload,
}) => {
  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <motion.div
          key={document.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative group"
        >
          <div
            onClick={() => onDocumentClick(document)}
            className="p-4 rounded-lg bg-white border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getFileIcon(document.type)}
                <div>
                  <h3 className="font-medium text-gray-900">{document.fileName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{document.department}</span>
                    <span>•</span>
                    <span>{format(new Date(document.updatedAt), 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{(document.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {document.confidentialityLevel !== 'public' && (
                  <IconLock className="w-4 h-4 text-amber-500" />
                )}
                {document.workflow?.status === 'pending_review' && (
                  <div className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                    Pending Review
                  </div>
                )}
                <Menu as="div" className="relative">
                  <Menu.Button className="p-1 rounded-full hover:bg-gray-100">
                    <IconDotsVertical className="w-4 h-4 text-gray-500" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocumentDownload(document);
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <IconDownload className="w-4 h-4 mr-2" />
                          Download
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocumentShare(document);
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <IconShare className="w-4 h-4 mr-2" />
                          Share
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocumentEdit(document);
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <IconPencil className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocumentDelete(document);
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-red-600`}
                        >
                          <IconTrash className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
            </div>

            {/* Additional metadata */}
            <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <IconEye className="w-4 h-4" />
                <span>
                  {document.audit?.viewedBy?.length || 0} view
                  {(document.audit?.viewedBy?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
              {document.workflow && (
                <div className="flex items-center space-x-1">
                  <IconClock className="w-4 h-4" />
                  <span>
                    Step {document.workflow.currentStep} of{' '}
                    {document.workflow.steps.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default DocumentList;
