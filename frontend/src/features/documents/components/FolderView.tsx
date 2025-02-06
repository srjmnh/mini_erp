import React from 'react';
import { motion } from 'framer-motion';
import {
  IconFolder,
  IconDotsVertical,
  IconShare,
  IconTrash,
  IconPencil,
  IconUsers,
} from '@tabler/icons-react';
import { Menu } from '@headlessui/react';
import { Folder } from '@/types/document';

interface FolderViewProps {
  folders: Folder[];
  onFolderClick: (folder: Folder) => void;
  onFolderShare: (folder: Folder) => void;
  onFolderEdit: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
}

const FolderView: React.FC<FolderViewProps> = ({
  folders,
  onFolderClick,
  onFolderShare,
  onFolderEdit,
  onFolderDelete,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {folders.map((folder) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative group"
        >
          <div
            onClick={() => onFolderClick(folder)}
            className="p-4 rounded-lg bg-white border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group-hover:border-indigo-500"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {folder.type === 'department' ? (
                  <IconUsers className="w-5 h-5 text-indigo-500" />
                ) : folder.type === 'shared' ? (
                  <IconShare className="w-5 h-5 text-green-500" />
                ) : (
                  <IconFolder
                    className="w-5 h-5"
                    style={{ color: folder.color || '#4F46E5' }}
                  />
                )}
                <span className="font-medium text-gray-900">{folder.name}</span>
              </div>
              <Menu as="div" className="relative">
                <Menu.Button className="p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconDotsVertical className="w-4 h-4 text-gray-500" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderShare(folder);
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
                          onFolderEdit(folder);
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
                          onFolderDelete(folder);
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
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>{folder.metadata?.department || 'Personal'}</span>
                {folder.sharedWith.length > 0 && (
                  <span className="flex items-center">
                    <IconUsers className="w-3 h-3 mr-1" />
                    {folder.sharedWith.length}
                  </span>
                )}
              </div>
              {folder.metadata?.description && (
                <p className="truncate">{folder.metadata.description}</p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FolderView;
