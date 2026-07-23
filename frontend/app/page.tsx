"use client";

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { GraduationCap, BookOpen, Shield, Search, PenTool, Wrench } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();

  const roles = [
    { name: t('role.student', { defaultValue: 'Student' }), path: '/courses', icon: GraduationCap, desc: t('role.student.desc', { defaultValue: 'Access enrolled courses and track progress' }) },
    { name: t('role.educator', { defaultValue: 'Educator' }), path: '/curriculum', icon: BookOpen, desc: t('role.educator.desc', { defaultValue: 'Manage curriculum and monitor students' }) },
    { name: t('role.admin', { defaultValue: 'Admin' }), path: '/health', icon: Shield, desc: t('role.admin.desc', { defaultValue: 'System health and hub management' }) },
    { name: t('role.learner', { defaultValue: 'Learner' }), path: '/catalog', icon: Search, desc: t('role.learner.desc', { defaultValue: 'Browse available courses and materials' }) },
    { name: t('role.creator', { defaultValue: 'Creator' }), path: '/studio', icon: PenTool, desc: t('role.creator.desc', { defaultValue: 'Create and edit course content' }) },
  ];

  return (
    <main className="min-h-screen p-6 sm:p-12 md:p-24 bg-surface text-text-primary">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Asala Hub</h1>
          <p className="text-xl text-text-secondary">{t('home.subtitle', { defaultValue: 'Select your role to continue' })}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.path}
                href={role.path}
                className="flex flex-col gap-4 p-6 min-h-[44px] rounded-xl border border-border bg-surface hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="flex items-center gap-3 text-primary">
                  <Icon className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">{role.name}</h2>
                </div>
                <p className="text-sm text-text-secondary">{role.desc}</p>
              </Link>
            );
          })}

          <Link
            href="/dev/test-harness"
            className="flex flex-col gap-4 p-6 min-h-[44px] rounded-xl border border-border bg-surface hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <div className="flex items-center gap-3 text-secondary">
              <Wrench className="w-6 h-6" />
              <h2 className="text-xl font-semibold">{t('role.dev', { defaultValue: 'Test Harness (Dev)' })}</h2>
            </div>
            <p className="text-sm text-text-secondary">{t('role.dev.desc', { defaultValue: 'Developer tools and component testing' })}</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
