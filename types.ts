
export type Role = 'user' | 'model';
export type ChatMode = 'learning' | 'support' | 'music' | 'organization' | 'deep_research' | 'analytics' | 'polyglot' | 'games' | 'chatpdf' | 'notes';
export type ThemeColor = 
  | 'default' 
  | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' 
  | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' 
  | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' 
  | 'pink' | 'rose';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 string
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isError?: boolean;
  isRetryable?: boolean;
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  mode: ChatMode;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  mode: ChatMode;
  prompt: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  comment: string;
  dueDate: string; // ISO Date string
  priority: 'high' | 'medium' | 'low';
  isCompleted: boolean;
}

export interface Timetable {
  content: string; // Free text representation of the schedule
}

export interface ProfileSnapshot {
  name: string;
  avatarId: string;
  bio: string;
  savedAt: Date;
}

export interface UserProfile {
  name: string;
  avatarId: string; // 'student', 'graduate', 'creative', 'tech', etc.
  bio: string;
  createdAt: Date;
  updatedAt: Date;
  history?: ProfileSnapshot[];
}

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  date: Date;
}

export interface SubjectGrade {
  id: string;
  subject: string;
  grade: number; // Sur 20 ou 100
  maxGrade: number;
  date: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface RecommendedPrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'Etude' | 'Rédaction' | 'Code' | 'Productivité' | 'Bien-être' | 'Langues' | 'Carrière';
  tags: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML content
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}
