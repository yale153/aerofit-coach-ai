export enum MuscleGroup {
  CHEST = "Petto",
  BACK = "Dorso",
  LEGS = "Gambe",
  SHOULDERS = "Spalle",
  ARMS = "Braccia",
  ABS = "Addome",
  CARDIO = "Cardio",
  FULL_BODY = "Full Body"
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string; // "10-12" or "Failure"
  restSeconds: number;
  description: string;
  tips: string;
  svgContent?: string; // AI Generated SVG code
  isCardioWarmup?: boolean;
  targetWeight?: string; 
  isCompleted?: boolean; // New: Checkbox status
  
  // User performed data
  performedSets?: {
    reps: number;
    weight: number;
  }[];

  // History for Undo functionality
  previousVersions?: Exercise[]; 
}

export interface WorkoutSession {
  id: string;
  dateCreated: string;
  title: string; 
  durationMinutes: number;
  exercises: Exercise[];
  completed: boolean;
  completedDate?: string;
  feedback?: string;
  isQuickSession?: boolean; // New flag for one-off sessions
}

export interface UserStats {
  height: number;
  weight: number;
  goal: string;
  sessionsPerWeek: number;
}

export interface AppState {
  apiKey: string;
  userStats: UserStats;
  currentPlan: WorkoutSession[];
  history: WorkoutSession[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}