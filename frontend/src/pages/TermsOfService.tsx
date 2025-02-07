import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and using this ERP system, you agree to be bound by these Terms of Service
          and all applicable laws and regulations. If you do not agree with any of these terms,
          you are prohibited from using or accessing this system.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
        <p className="mb-4">
          Permission is granted to temporarily access the ERP system for personal
          and business use. This is the grant of a license, not a transfer of title, and
          under this license you may not:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Modify or copy the materials</li>
          <li>Use the materials for any commercial purpose without authorization</li>
          <li>Transfer the materials to another person or mirror the materials on any other server</li>
          <li>Attempt to decompile or reverse engineer any software contained in the system</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Third-Party Services</h2>
        <p className="mb-4">
          Our service integrates with third-party services including Google Calendar. By using these integrations:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>You agree to comply with their respective terms of service</li>
          <li>You understand that we are not responsible for third-party service availability</li>
          <li>You acknowledge that service integrations may be modified or discontinued</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. User Account</h2>
        <p className="mb-4">
          You are responsible for:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Maintaining the confidentiality of your account</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Disclaimer</h2>
        <p className="mb-4">
          The materials within the ERP system are provided on an 'as is' basis.
          We make no warranties, expressed or implied, and hereby disclaim and negate
          all other warranties including, without limitation, implied warranties or
          conditions of merchantability, fitness for a particular purpose, or
          non-infringement of intellectual property or other violation of rights.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Limitations</h2>
        <p className="mb-4">
          In no event shall we or our suppliers be liable for any damages
          (including, without limitation, damages for loss of data or profit,
          or due to business interruption) arising out of the use or inability
          to use the materials on our system.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Governing Law</h2>
        <p className="mb-4">
          These terms and conditions are governed by and construed in accordance
          with the laws, and you irrevocably submit to the exclusive jurisdiction
          of the courts in that location.
        </p>
      </section>

      <footer className="text-sm text-gray-600">
        Last updated: February 6, 2025
      </footer>
    </div>
  );
};

export default TermsOfService;
