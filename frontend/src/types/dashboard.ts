import { IndexedDBUser, CachedCourse, CachedModule, TransactionLog } from '@/lib/db';

export interface DashboardStats {
  courseCount: number;
  completedModules: number;
  totalModules: number;
  submissionCount: number;
  completionRate: number;
}

export interface DashboardViewProps {
  user: IndexedDBUser | null;
  isOnline: boolean;
  isLoading: boolean;
  stats: DashboardStats;
  t: any;
  onNavigate: (tab: string) => void;
}
