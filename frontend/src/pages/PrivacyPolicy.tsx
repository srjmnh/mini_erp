import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          We collect information that you provide directly to us when using our ERP system:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Account information (name, email)</li>
          <li>Calendar data through Google Calendar integration</li>
          <li>Project and task information</li>
          <li>Files and documents you upload</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          We use the collected information to:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide and maintain our services</li>
          <li>Sync your calendar events and tasks</li>
          <li>Improve and personalize your experience</li>
          <li>Communicate with you about our services</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
        <p className="mb-4">
          We implement appropriate security measures to protect your personal information.
          Your data is stored securely and accessed only as necessary to provide our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
        <p className="mb-4">
          We use Google Calendar API for calendar integration. When you connect your Google Calendar:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>We request access to view and manage your calendar events</li>
          <li>We only sync events related to your projects and tasks</li>
          <li>You can revoke access at any time through your Google Account settings</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this Privacy Policy, please contact us.
        </p>
      </section>

      <footer className="text-sm text-gray-600">
        Last updated: February 6, 2025
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
