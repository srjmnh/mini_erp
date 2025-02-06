export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    id: 'technical',
    name: 'Technical Skills',
    skills: [
      'JavaScript',
      'Python',
      'Java',
      'C++',
      'SQL',
      'React',
      'Node.js',
      'AWS',
      'Docker',
      'Kubernetes',
      'Machine Learning',
      'Data Analysis',
    ]
  },
  {
    id: 'soft_skills',
    name: 'Soft Skills',
    skills: [
      'Leadership',
      'Communication',
      'Team Management',
      'Problem Solving',
      'Time Management',
      'Project Management',
      'Public Speaking',
      'Conflict Resolution',
    ]
  },
  {
    id: 'languages',
    name: 'Languages',
    skills: [
      'English',
      'Spanish',
      'French',
      'German',
      'Chinese',
      'Japanese',
      'Arabic',
    ]
  },
  {
    id: 'design',
    name: 'Design',
    skills: [
      'UI/UX Design',
      'Graphic Design',
      'Adobe Creative Suite',
      'Figma',
      'Sketch',
      'Product Design',
    ]
  },
  {
    id: 'business',
    name: 'Business',
    skills: [
      'Marketing',
      'Sales',
      'Business Development',
      'Strategy',
      'Analytics',
      'Customer Service',
      'Operations',
    ]
  },
];
