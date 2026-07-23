export type UIRole = 'student' | 'educator' | 'admin' | 'learner' | 'creator';

export interface NavItem {
  key: string;
  icon: string;
  href: string;
  mirrorInRTL: boolean;
}

export const NAV_CONFIG: Record<UIRole, NavItem[]> = {
  student: [
    { key: 'nav.courses', icon: 'BookOpen', href: '/courses', mirrorInRTL: false },
    { key: 'nav.assignments', icon: 'FileEdit', href: '/assignments/draft-1', mirrorInRTL: false },
    { key: 'nav.progress', icon: 'BarChart3', href: '/progress', mirrorInRTL: false },
  ],
  educator: [
    { key: 'nav.curriculum', icon: 'LayoutDashboard', href: '/curriculum', mirrorInRTL: false },
    { key: 'nav.gradebook', icon: 'Table', href: '/gradebook', mirrorInRTL: false },
    { key: 'nav.analytics', icon: 'TrendingUp', href: '/analytics', mirrorInRTL: false },
  ],
  admin: [
    { key: 'nav.health', icon: 'Activity', href: '/health', mirrorInRTL: false },
    { key: 'nav.conflicts', icon: 'AlertTriangle', href: '/conflicts', mirrorInRTL: false },
  ],
  learner: [
    { key: 'nav.catalog', icon: 'Search', href: '/catalog', mirrorInRTL: false },
    { key: 'nav.cart', icon: 'ShoppingCart', href: '/cart', mirrorInRTL: false },
    { key: 'nav.orders', icon: 'Package', href: '/confirmation', mirrorInRTL: false },
  ],
  creator: [
    { key: 'nav.studio', icon: 'Film', href: '/studio', mirrorInRTL: false },
    { key: 'nav.earnings', icon: 'DollarSign', href: '/earnings', mirrorInRTL: false },
  ],
};

export type SyncStatus = 'synced' | 'offline' | 'syncing';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface ModalConfig {
  title: string;
  message: string;
  type: 'warning' | 'error';
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}
