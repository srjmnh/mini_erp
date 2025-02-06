import React from 'react';
import { Disclosure, Popover } from '@headlessui/react';
import { IconChevronDown, IconFilter, IconX } from '@tabler/icons-react';
import type { DocumentFilter, DocumentCategory, Department } from '@/types/document';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DocumentFiltersProps {
  filters: DocumentFilter;
  onFilterChange: (filters: DocumentFilter) => void;
  onClearFilters: () => void;
}

const DOCUMENT_TYPES = [
  'contract',
  'invoice',
  'report',
  'policy',
  'form',
  'other',
] as const;

const CONFIDENTIALITY_LEVELS = [
  'public',
  'internal',
  'confidential',
  'restricted',
] as const;

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const updateFilter = (key: keyof DocumentFilter, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ''
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <IconX className="w-4 h-4 mr-1" />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Categories */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full text-sm font-medium text-gray-700">
                <span>Categories</span>
                <IconChevronDown
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-4 h-4 text-gray-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-2 pb-2 text-sm text-gray-500">
                <div className="space-y-2">
                  {Object.values(DocumentCategory).map((category) => (
                    <label
                      key={category}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.category === category}
                        onChange={(e) =>
                          updateFilter(
                            'category',
                            e.target.checked ? category : undefined
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Departments */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full text-sm font-medium text-gray-700">
                <span>Departments</span>
                <IconChevronDown
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-4 h-4 text-gray-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-2 pb-2 text-sm text-gray-500">
                <div className="space-y-2">
                  {Object.values(Department).map((department) => (
                    <label
                      key={department}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.department === department}
                        onChange={(e) =>
                          updateFilter(
                            'department',
                            e.target.checked ? department : undefined
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{department}</span>
                    </label>
                  ))}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Document Type */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full text-sm font-medium text-gray-700">
                <span>Document Type</span>
                <IconChevronDown
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-4 h-4 text-gray-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-2 pb-2 text-sm text-gray-500">
                <div className="space-y-2">
                  {DOCUMENT_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.documentType === type}
                        onChange={(e) =>
                          updateFilter(
                            'documentType',
                            e.target.checked ? type : undefined
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Confidentiality Level */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full text-sm font-medium text-gray-700">
                <span>Confidentiality Level</span>
                <IconChevronDown
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-4 h-4 text-gray-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-2 pb-2 text-sm text-gray-500">
                <div className="space-y-2">
                  {CONFIDENTIALITY_LEVELS.map((level) => (
                    <label
                      key={level}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.confidentialityLevel === level}
                        onChange={(e) =>
                          updateFilter(
                            'confidentialityLevel',
                            e.target.checked ? level : undefined
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="capitalize">{level}</span>
                    </label>
                  ))}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Date Range */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full text-sm font-medium text-gray-700">
                <span>Date Range</span>
                <IconChevronDown
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-4 h-4 text-gray-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-2 pb-2 text-sm text-gray-500">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs mb-1">Start Date</label>
                    <DatePicker
                      selected={filters.dateRange?.start}
                      onChange={(date) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          start: date,
                        })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">End Date</label>
                    <DatePicker
                      selected={filters.dateRange?.end}
                      onChange={(date) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          end: date,
                        })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      </div>
    </div>
  );
};

export default DocumentFilters;
