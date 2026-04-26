import { apiClient } from './request';

export interface QuizOption {
  label: string;
  text: string;
}

export interface DailyQuizQuestion {
  id: number;
  type: 'true_false' | 'single_choice' | 'multi_choice';
  content: string;
  options: QuizOption[];
  category: string;
  difficulty: number;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  analysis?: string;
  correctAnswer?: string[];
}

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
}

export const fetchDailyQuiz = async (): Promise<ApiResponse<DailyQuizQuestion[]>> => {
  const res = await apiClient.get('/h5/quiz/daily');
  return res.data;
};

export const submitAnswer = async (
  questionId: number,
  answer: string[],
): Promise<ApiResponse<SubmitAnswerResult>> => {
  const res = await apiClient.post('/h5/quiz/submit', { questionId, answer });
  return res.data;
};
