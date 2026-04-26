import { apiClient } from './request';

// ── Types ─────────────────────────────────────────────────────────────

export interface QuizOption {
  label: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  type: 'true_false' | 'single_choice' | 'multi_choice';
  content: string;
  /** JSON string: [{"label":"A","text":"..."},...] */
  options: string;
  /** JSON string: ["A"] or ["A","C"] */
  answer: string;
  analysis: string;
  category: string;
  difficulty: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionQuery {
  page: number;
  size: number;
}

export interface CreateQuestionParams {
  type: 'true_false' | 'single_choice' | 'multi_choice';
  content: string;
  options: string;
  answer: string;
  analysis?: string;
  category?: string;
  difficulty?: number;
  enabled?: boolean;
}

export interface QuizConfig {
  id: number;
  tenantId: number;
  dailyLimit: number;
  pointsPerCorrect: number;
  showAnalysis: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateQuizConfigParams {
  dailyLimit?: number;
  pointsPerCorrect?: number;
  showAnalysis?: boolean;
  enabled?: boolean;
}

// ── Question APIs ─────────────────────────────────────────────────────

export const fetchQuestions = async (params: QuizQuestionQuery) => {
  const res = await apiClient.get('/enterprise/quiz/questions', { params });
  return res.data;
};

export const createQuestion = async (data: CreateQuestionParams) => {
  const res = await apiClient.post('/enterprise/quiz/questions', data);
  return res.data;
};

export const updateQuestion = async (id: number, data: Partial<CreateQuestionParams>) => {
  const res = await apiClient.put(`/enterprise/quiz/questions/${id}`, data);
  return res.data;
};

export const deleteQuestion = async (id: number) => {
  const res = await apiClient.delete(`/enterprise/quiz/questions/${id}`);
  return res.data;
};

// ── Config APIs ───────────────────────────────────────────────────────

export const fetchQuizConfig = async () => {
  const res = await apiClient.get('/enterprise/quiz/config');
  return res.data;
};

export const updateQuizConfig = async (data: UpdateQuizConfigParams) => {
  const res = await apiClient.put('/enterprise/quiz/config', data);
  return res.data;
};
