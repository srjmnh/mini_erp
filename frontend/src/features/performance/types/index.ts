export interface ReviewTemplate {
  id: string;
  name: string;
  description: string;
  type: 'predefined' | 'custom';
  categories: ReviewCategory[];
  createdAt: Date;
  createdBy: string;
}

export interface ReviewCategory {
  id: string;
  name: string;
  description: string;
  criteria: ReviewCriteria[];
}

export interface ReviewCriteria {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'multiChoice';
  options?: string[]; // For multiChoice type
  required: boolean;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  templateId: string;
  status: 'draft' | 'completed' | 'acknowledged';
  responses: ReviewResponse[];
  overallRating?: number;
  comments: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  acknowledgedAt?: Date;
}

export interface ReviewResponse {
  criteriaId: string;
  rating?: number;
  textResponse?: string;
  selectedOptions?: string[];
}

export const RATING_LABELS = {
  1: 'Needs Significant Improvement',
  2: 'Needs Improvement',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding Performance'
};
