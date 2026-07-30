import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name?: string): string {
  if (!name) return 'AH';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export function isEducatorUser(user: { role?: string; email?: string } | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return role === 'educator' || email.includes('educator') || email.includes('prof') || email.includes('teacher');
}
