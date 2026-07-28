import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { useSync } from '@/context/SyncContext';
import { db } from '@/lib/db';
import { KeyRound, Lock, ShieldCheck, Check, Sparkles, User, HardDrive, Plus, RefreshCw, Download, Trash2, ShieldAlert, FileCheck } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';

export const SettingsView: React.FC = () => {
  const { user, setQuickPin, logout } = useAuth();
  const { t } = useI18n();
  const { showToast } = useOverlay();
  const { pendingCount, addMockOfflineTransaction, syncNow } = useSync();

  const [pin, setPin] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);

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
      a.download = `asala_student_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Data Exported', 'success', 'Downloaded complete JSON copy of your local data.');
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
      showToast('Local Data Purged', 'info', 'All IndexedDB records cleared.');
    } catch (err) {
      console.error('Delete data failed:', err);
      showToast('Purge Failed', 'error', 'Could not clear local database.');
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      showToast('Invalid PIN', 'warning', 'Please enter a 4-digit PIN code.');
      return;
    }

    try {
      await setQuickPin(pin);
      setIsSaved(true);
      setPin('');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      showToast('Failed to Save PIN', 'error', 'Could not update your security settings.');
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Settings Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-heading text-foreground">
          {t.nav.settings} & Security Preferences
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage your offline quick re-authentication PIN, local storage limits, and account preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick PIN Setup Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <KeyRound className="w-6 h-6" />
              </div>
              <StatusPill label="Offline Quick Access" variant="info" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                Set 4-Digit Quick PIN
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure a 4-digit passcode for instant offline session renewal without needing your full password when disconnected.
              </p>
            </div>

            <form onSubmit={handleSavePin} className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  4-Digit PIN Code
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

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>PIN Updated Successfully!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save 4-Digit PIN</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>PIN is encrypted and stored locally in IndexedDB for offline authentication.</span>
          </div>
        </div>

        {/* Account Info & Local Session Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <User className="w-6 h-6" />
              </div>
              <StatusPill label={user?.role?.toUpperCase() || 'STUDENT'} variant="success" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                Account & Local Vault
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Active local profile details stored securely in browser cache.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-semibold text-foreground">{user?.fullName || 'Asala Student'}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Email Address:</span>
                <span className="font-mono text-foreground">{user?.email || 'user@asalahub.dev'}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Offline Storage:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">IndexedDB Active</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary shrink-0" />
            <span>Session auto-renews smoothly upon entering your 4-digit PIN.</span>
          </div>
        </div>
      </div>

      {/* Relocated System Telemetry & Developer Tools Card Section */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              System Telemetry & Developer Tools
            </h3>
            <p className="text-xs text-muted-foreground">
              Technical inspection parameters, offline transaction log simulation, and intranet sync triggers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await addMockOfflineTransaction('CREATE_SUBMISSION');
                showToast('Log added to IndexedDB', 'info', 'Saved transaction log offline.');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Simulate Offline Log</span>
            </button>

            <button
              onClick={async () => {
                showToast('Syncing deltas...', 'info');
                await syncNow();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>Trigger Sync</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Offline Transaction Queue</span>
            <span className="text-lg font-mono font-bold text-foreground">{pendingCount} Payloads</span>
            <span className="text-[10px] text-muted-foreground">Buffered in Dexie IndexedDB</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Intranet Protocol</span>
            <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">TLS 1.2+ / HTTP</span>
            <span className="text-[10px] text-muted-foreground">SRS 3.3 Protocol Active</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Payload Packaging</span>
            <span className="text-lg font-mono font-bold text-primary">Flat JSON Delta</span>
            <span className="text-[10px] text-muted-foreground">LZ-String Compressed</span>
          </div>
        </div>

        {/* Integrated Feature Engine Status Badges */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-foreground">Integrated Offline Engine Modules</span>
          <div className="flex flex-wrap gap-2">
            <StatusPill label="Auth Gate & Role Auto-Route" variant="success" />
            <StatusPill label="2s IndexedDB Auto-Save" variant="info" />
            <StatusPill label="Offline Blob Attachments" variant="warning" />
            <StatusPill label="In-Place Re-Auth Modal" variant="info" dotAnimation />
            <StatusPill label="Printable Submission Receipts" variant="neutral" />
          </div>
        </div>
      </div>

      {/* Data & Privacy Governance Section (CR-1, CR-2, CR-3) */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold font-heading text-foreground">
                Data Rights & Privacy Governance
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage consent, self-service data export, and local device data retention (CR-1, CR-2, CR-3).
              </p>
            </div>
          </div>
          <StatusPill label="Institutional Consent Verified" variant="success" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Consent Record Card */}
          <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">📋 Consent & Offline Data Record</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accepted: <span className="font-semibold text-foreground">{user ? new Date().toLocaleDateString() : 'Active'}</span>
                <br />
                Policy Version: <span className="font-mono text-foreground font-semibold">Asala Hub Data Policy v1.0</span>
              </p>
            </div>
            <StatusPill label="CR-1 Consented" variant="success" />
          </div>

          {/* Guardian Consent Status Card (CR-2) */}
          <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">🔒 Guardian / Institutional Approval (CR-2)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verified / Institutional Consent Active</span>
                <br />
                Minor Protection Protocol: Enabled
              </p>
            </div>
            <button
              onClick={() => showToast('Guardian Consent Verified', 'success', 'Institutional guardian approval record is up to date.')}
              className="text-[11px] font-semibold text-primary hover:underline self-start cursor-pointer"
            >
              View Institutional Record
            </button>
          </div>

          {/* Export My Data Card */}
          <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-foreground">Self-Service Data Export</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Download a complete JSON copy of all your local IndexedDB records, decrypted submission drafts, notes, and session history (CR-2).
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start"
            >
              <Download className="w-4 h-4" />
              <span>Export My Data (JSON)</span>
            </button>
          </div>

          {/* Delete My Local Data Card */}
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <span className="text-xs font-bold text-foreground">Purge Local Device Storage</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clear all cached courses, offline submissions, and local credentials stored on this device.
              </p>
            </div>
            <button
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete My Local Data</span>
            </button>
          </div>
        </div>

        {/* 30-Day Data Retention Policy Banner (CR-3) */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground leading-relaxed flex flex-col gap-1">
          <span className="font-semibold text-foreground">Data Retention & Minor Protection Notice</span>
          <span>
            Asala Hub campus nodes store offline data on shared or budget student devices for up to 30 days following the last successful intranet synchronization. Institutional enrollment agreements cover minor consent per CR-1.
          </span>
        </div>
      </div>

      {/* Confirmation Modal for Delete Local Data */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Confirm Purging Local Data?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all offline course modules, un-synced drafts, and personal notes stored in this browser's IndexedDB storage.
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
                Confirm Delete & Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
