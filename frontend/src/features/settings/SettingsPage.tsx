import React from 'react';
import { motion } from 'framer-motion';
import { IconSettings } from '@tabler/icons-react';
import { buttonStyles, inputStyles, cardStyles, typographyStyles, listStyles, chipStyles } from '@/styles/components';

const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top App Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className={typographyStyles.h1}>Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={cardStyles.base}>
          <div className={cardStyles.body}>
            <p className={typographyStyles.body}>Settings page content coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
