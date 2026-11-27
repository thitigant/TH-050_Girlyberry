export type UserRole = 'SURVEY_OWNER' | 'RESPONDENT';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  token?: string;
}

export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionType = 'RATING' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'LIKERT_SCALE' | 'SHORT_TEXT';

export interface QuestionOption {
  id: string;
  label: string;
  order: number;
}

export interface Question {
  id: string;
  prompt: string;
  questionType: QuestionType;
  isRequired: boolean;
  order: number;
  options?: QuestionOption[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: SurveyStatus;
  responseMode?: 'IDENTIFIED' | 'ANONYMOUS';
  closesAt?: string;
  accessCode?: string;
  allowedEmailDomain?: string;
  requiresAccessCode?: boolean;
  ownerId: string;
  ownerEmail?: string;
  createdAt: string;
  publishedAt?: string;
  closedAt?: string;
  questions: Question[];
}

export interface AnswerInput {
  questionId: string;
  ratingValue?: number;
  textValue?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
}

export interface SubmissionReceipt {
  receiptId: string;
  surveyId: string;
  surveyTitle: string;
  submittedAt: string;
  answersCount: number;
}
