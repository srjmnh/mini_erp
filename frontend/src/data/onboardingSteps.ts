export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: string;
  required: boolean;
}

export const onboardingSteps: OnboardingStep[] = [
  // Documentation
  {
    id: 'id_verification',
    title: 'ID Verification',
    description: 'Submit government-issued ID and proof of address',
    category: 'Documentation',
    required: true,
  },
  {
    id: 'employment_contract',
    title: 'Employment Contract',
    description: 'Sign and submit employment contract',
    category: 'Documentation',
    required: true,
  },
  {
    id: 'tax_forms',
    title: 'Tax Forms',
    description: 'Complete and submit tax forms',
    category: 'Documentation',
    required: true,
  },

  // IT Setup
  {
    id: 'email_setup',
    title: 'Email Setup',
    description: 'Set up company email and communication tools',
    category: 'IT Setup',
    required: true,
  },
  {
    id: 'equipment_handover',
    title: 'Equipment Handover',
    description: 'Receive and set up work equipment',
    category: 'IT Setup',
    required: true,
  },
  {
    id: 'system_access',
    title: 'System Access',
    description: 'Set up access to required systems and tools',
    category: 'IT Setup',
    required: true,
  },

  // Training
  {
    id: 'company_policies',
    title: 'Company Policies',
    description: 'Review and acknowledge company policies',
    category: 'Training',
    required: true,
  },
  {
    id: 'security_training',
    title: 'Security Training',
    description: 'Complete security awareness training',
    category: 'Training',
    required: true,
  },
  {
    id: 'role_training',
    title: 'Role-specific Training',
    description: 'Complete role-specific training modules',
    category: 'Training',
    required: false,
  },

  // Team Integration
  {
    id: 'team_introduction',
    title: 'Team Introduction',
    description: 'Meet team members and key stakeholders',
    category: 'Team Integration',
    required: true,
  },
  {
    id: 'mentor_assignment',
    title: 'Mentor Assignment',
    description: 'Assignment of a mentor/buddy',
    category: 'Team Integration',
    required: false,
  },
  {
    id: 'first_project',
    title: 'First Project',
    description: 'Assignment of first project/tasks',
    category: 'Team Integration',
    required: false,
  },
];
