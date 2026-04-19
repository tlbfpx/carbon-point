// Standard API response wrapper matching the backend Result<T>
export interface Result<T = unknown> {
  code: number;
  data: T;
  message?: string;
}
