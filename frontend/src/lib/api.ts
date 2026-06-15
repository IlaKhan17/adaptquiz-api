import axios from "axios";
import type {
  AnswerEvalResponse,
  DocumentItem,
  IngestResponse,
  QuizGenerateRequest,
  QuizListItem,
  QuizResponse,
  SessionListItem,
  SessionReport,
  TokenResponse,
  User,
} from "../types";

const BASE = "/api/v1";

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (email: string, password: string) =>
  api.post<TokenResponse>("/auth/register", { email, password }).then((r) => r.data);

export const login = (email: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api
    .post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    .then((r) => r.data);
};

export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);

// Documents
export const getDocuments = () =>
  api.get<DocumentItem[]>("/documents").then((r) => r.data);

export const ingestDocument = (file: File, subject: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("subject", subject);
  return api.post<IngestResponse>("/ingest", form).then((r) => r.data);
};

// Quizzes
export const getQuizzes = () =>
  api.get<QuizListItem[]>("/quiz").then((r) => r.data);

export const generateQuiz = (req: QuizGenerateRequest) =>
  api.post<QuizResponse>("/quiz/generate", req).then((r) => r.data);

export const getSessionQuiz = (sessionId: string) =>
  api.get<QuizResponse>(`/session/${sessionId}/quiz`).then((r) => r.data);

// Eval
export const submitAnswer = (
  session_id: string,
  question_id: string,
  student_answer: string
) =>
  api
    .post<AnswerEvalResponse>("/eval/answer", { session_id, question_id, student_answer })
    .then((r) => r.data);

// Sessions
export const getSessions = () =>
  api.get<SessionListItem[]>("/session").then((r) => r.data);

export const getSessionReport = (sessionId: string) =>
  api.get<SessionReport>(`/session/${sessionId}/report`).then((r) => r.data);
