'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { db } from '@/lib/db';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Check,
  Sparkles,
  User,
  HardDrive,
  Download,
  Trash2,
  ShieldAlert,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export const SettingsView: React.FC = () => {
  const { user, setQuickPin, hasPinConfigured, logout } = useAuth();
  const { t } = useI18n();
  const { showToast } = useOverlay();

  // Active Tab: 'profile' | 'storage'
  const [activeTab, setActiveTab] = useState<'profile' | 'storage'>('profile');

  // PIN Form State
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);

  // Storage Metrics State
  const [storageMetrics, setStorageMetrics] = useState({
    usedMb: 12.4,
    quotaMb: 500,
    usagePercent: 2.5,
    pendingItems: 0,
  });

  const loadStorageInfo = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quota = Math.round(((estimate.quota || 524288000) / (1024 * 1024)) * 10) / 10;
        const pct = Math.round((used / Math.max(quota, 1)) * 100);
        const pendingCount = await db.transactionLogs.where('status').equals('pending').count();

        setStorageMetrics({
          usedMb: used,
          quotaMb: quota,
          usagePercent: pct,
          pendingItems: pendingCount,
        });
      }
    } catch (err) {
      console.error('Error loading storage estimate:', err);
    }
  };

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const handleExportData = async () => {
    try {
      const [submissions, modules, usersList, logs] = await Promise.all([
        db.cachedSubmissions.toArray(),
        db.cachedModules.toArray(),
        db.users.toArray(),
        db.transactionLogs.toArray(),
      ]);

      const exportObject = {
        exportDate: new Date().toISOString(),
        userProfile: user,
        submissions,
        studyNotes: modules.filter(m => m.userNotes).map(m => ({ moduleId: m.id, title: m.title, notes: m.userNotes })),
        transactionLogs: logs,
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asala_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Data Exported', 'success', 'Downloaded complete copy of your local data.');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export Failed', 'error', 'Could not export local data.');
    }
  };

  const handleDeleteLocalData = async () => {
    try {
      await logout();
      localStorage.clear();
      sessionStorage.clear();
      await db.delete();
      showToast('Local Data Purged', 'info', 'All local records cleared.');
    } catch (err) {
      console.error('Delete data failed:', err);
      showToast('Purge Failed', 'error', 'Could not clear local storage.');
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      showToast('Invalid Passcode', 'warning', 'Please enter a 4-digit PIN code.');
      return;
    }

    if (pin !== confirmPin) {
      showToast('PIN Mismatch', 'warning', 'The 4-digit PIN codes do not match.');
      return;
    }

    try {
      await setQuickPin(pin);
      setIsSaved(true);
      setPin('');
      setConfirmPin('');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      showToast('Failed to Save Passcode', 'error', 'Could not update your security settings.');
    }
  };

  const handleRemovePin = async () => {
    try {
      await setQuickPin(null);
      setPin('');
      setConfirmPin('');
      showToast('Passcode Removed', 'info', 'Quick passcode unlock disabled.');
    } catch (err) {
      showToast('Failed to Remove Passcode', 'error', 'Could not remove quick passcode.');
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold font-heading text-foreground">
            Account & Security Settings
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage your personal profile, quick offline unlock passcode, and device data preferences.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider shrink-0 self-start md:self-center">
          <User className="w-4 h-4" />
          <span>{user?.role || 'User'}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted border border-border self-start">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4 text-primary" />
          <span>Profile & Passcode Security</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive className="w-4 h-4 text-emerald-500" />
          <span>Device Storage & Privacy</span>
        </button>
      </div>

      {activeTab === 'profile' ? (
        /* Tab 1: Profile & Passcode Security */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Profile Card */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                  Active Profile
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold font-heading text-foreground">
                  Account Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your registered institutional account information.
                </p>
              </div>

              <div className="flex flex-col gap-3.5 pt-2">
                <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="font-semibold text-foreground">{user?.fullName || 'User'}</span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Email Address:</span>
                  <span className="font-mono text-foreground">{user?.email || '—'}</span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                  <span className="text-muted-foreground">System Role:</span>
                  <span className="font-semibold text-primary capitalize">{user?.role || 'Student'}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Session encrypted and authenticated for your active role.</span>
            </div>
          </div>

          {/* Quick PIN Passcode Management Card */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {hasPinConfigured ? 'PIN Active (••••)' : 'No PIN Set'}
                  </span>
                  <InfoTooltip
                    title="Quick PIN Passcode"
                    content="Set a 4-digit passcode for instant offline re-authentication without typing your password."
                    position="bottom"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold font-heading text-foreground">
                  4-Digit Quick Passcode
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fast passcode for instant unlock when offline or reconnecting.
                </p>
              </div>

              <form onSubmit={handleSavePin} className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    New 4-Digit Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Confirm Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {confirmPin.length > 0 && confirmPin !== pin && (
                    <span className="text-[10px] text-rose-500 font-semibold mt-0.5">
                      Passcode numbers do not match
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={!pin || pin.length < 4 || pin !== confirmPin}
                    className="flex-1 h-10 w-full rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Passcode Saved!</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{hasPinConfigured ? 'Update Passcode' : 'Save Passcode'}</span>
                      </>
                    )}
                  </button>

                  {hasPinConfigured && (
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="h-10 px-4 rounded-xl border border-border bg-muted/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Passcode is securely saved locally for instant unlock.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Storage & Privacy */
        <div className="flex flex-col gap-6">
          {/* Storage Quota Card */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold font-heading text-foreground">
                  Device Storage & Saved Content
                </h3>
              </div>
              <button
                onClick={loadStorageInfo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Refresh Usage</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-primary" />
                  Local Storage Space Used
                </span>
                <span className="font-bold text-foreground">
                  {storageMetrics.usedMb} MB / {storageMetrics.quotaMb} MB ({storageMetrics.usagePercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    storageMetrics.usagePercent > 80
                      ? 'bg-rose-500'
                      : storageMetrics.usagePercent > 50
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.max(storageMetrics.usagePercent, 2)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Data Export & Clear Storage Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Data Card */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Export Personal Data</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download a complete backup copy of your saved study notes, offline drafts, and local activity records.
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start"
              >
                <Download className="w-4 h-4" />
                <span>Export My Data</span>
              </button>
            </div>

            {/* Clear Device Storage Card */}
            <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-bold text-foreground">Clear Device Storage</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reset cached courses, offline submissions, and local credentials stored on this device.
                </p>
              </div>
              <button
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Local Data</span>
              </button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Privacy & Data Governance Notice</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your offline learning progress and drafts are stored locally on your device and synchronized securely with the campus network whenever connected. Local cache retention follows institutional privacy policies.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Local Data */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Confirm Clearing Local Storage?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will remove saved offline modules and personal notes stored on this browser device.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsConfirmDeleteOpen(false);
                  await handleDeleteLocalData();
                }}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirm Clear & Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
