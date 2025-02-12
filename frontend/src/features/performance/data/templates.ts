import { ReviewTemplate } from '../types';

export const PREDEFINED_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'annual-review',
    name: 'Annual Performance Review',
    description: 'Comprehensive annual review covering all aspects of employee performance',
    type: 'predefined',
    categories: [
      {
        id: 'job-knowledge',
        name: 'Job Knowledge & Skills',
        description: 'Assessment of technical skills and job-related knowledge',
        criteria: [
          {
            id: 'technical-skills',
            question: 'How effectively does the employee apply technical skills required for the position?',
            type: 'rating',
            required: true
          },
          {
            id: 'problem-solving',
            question: 'Demonstrate problem-solving abilities and decision-making skills',
            type: 'rating',
            required: true
          },
          {
            id: 'skill-improvement',
            question: 'Describe specific areas where technical skills have improved over the review period',
            type: 'text',
            required: true
          }
        ]
      },
      {
        id: 'productivity',
        name: 'Productivity & Quality',
        description: 'Evaluation of work output and quality standards',
        criteria: [
          {
            id: 'work-quality',
            question: 'How would you rate the overall quality of work produced?',
            type: 'rating',
            required: true
          },
          {
            id: 'efficiency',
            question: 'Rate the employee\'s efficiency in completing assigned tasks',
            type: 'rating',
            required: true
          },
          {
            id: 'time-management',
            question: 'Evaluate time management and ability to meet deadlines',
            type: 'rating',
            required: true
          }
        ]
      },
      {
        id: 'communication',
        name: 'Communication & Teamwork',
        description: 'Assessment of interpersonal skills and team collaboration',
        criteria: [
          {
            id: 'team-collaboration',
            question: 'How effectively does the employee work with team members?',
            type: 'rating',
            required: true
          },
          {
            id: 'communication-clarity',
            question: 'Rate the clarity and effectiveness of written and verbal communication',
            type: 'rating',
            required: true
          }
        ]
      }
    ],
    createdAt: new Date(),
    createdBy: 'system'
  },
  {
    id: 'quarterly-check-in',
    name: 'Quarterly Check-in',
    description: 'Quick quarterly assessment focusing on goals and progress',
    type: 'predefined',
    categories: [
      {
        id: 'goals-progress',
        name: 'Goals & Progress',
        description: 'Review of quarterly goals and achievements',
        criteria: [
          {
            id: 'goals-achievement',
            question: 'What percentage of quarterly goals were achieved?',
            type: 'multiChoice',
            options: ['0-25%', '26-50%', '51-75%', '76-100%'],
            required: true
          },
          {
            id: 'challenges',
            question: 'What challenges were faced in achieving these goals?',
            type: 'text',
            required: true
          }
        ]
      },
      {
        id: 'next-quarter',
        name: 'Next Quarter Planning',
        description: 'Planning and goal setting for next quarter',
        criteria: [
          {
            id: 'next-goals',
            question: 'What are the key goals for next quarter?',
            type: 'text',
            required: true
          },
          {
            id: 'support-needed',
            question: 'What support or resources are needed to achieve these goals?',
            type: 'text',
            required: true
          }
        ]
      }
    ],
    createdAt: new Date(),
    createdBy: 'system'
  },
  {
    id: 'project-completion',
    name: 'Project Completion Review',
    description: 'Performance evaluation specific to project completion',
    type: 'predefined',
    categories: [
      {
        id: 'project-execution',
        name: 'Project Execution',
        description: 'Assessment of project delivery and execution',
        criteria: [
          {
            id: 'timeline-adherence',
            question: 'How well were project timelines maintained?',
            type: 'rating',
            required: true
          },
          {
            id: 'quality-delivery',
            question: 'Rate the quality of delivered project components',
            type: 'rating',
            required: true
          },
          {
            id: 'stakeholder-management',
            question: 'How effectively were stakeholder relationships managed?',
            type: 'rating',
            required: true
          }
        ]
      },
      {
        id: 'project-learnings',
        name: 'Project Learnings',
        description: 'Reflection on project learnings and improvements',
        criteria: [
          {
            id: 'key-learnings',
            question: 'What were the key learnings from this project?',
            type: 'text',
            required: true
          },
          {
            id: 'future-improvements',
            question: 'What could be improved in future projects?',
            type: 'text',
            required: true
          }
        ]
      }
    ],
    createdAt: new Date(),
    createdBy: 'system'
  }
];
