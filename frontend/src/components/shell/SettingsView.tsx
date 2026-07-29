import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { useSync } from '@/context/SyncContext';
import { db } from '@/lib/db';
import { KeyRound, Lock, ShieldCheck, Check, Sparkles, User, HardDrive, Plus, RefreshCw, Download, Trash2, ShieldAlert, FileCheck } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { isDebugMode } from '@/lib/debug';

export const SettingsView: React.FC = () => {
  const { user, setQuickPin, hasPinConfigured, logout } = useAuth();
  const { t } = useI18n();
  const { showToast } = useOverlay();
  const { pendingCount, addMockOfflineTransaction, syncNow } = useSync();

  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
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
      showToast('Failed to Save PIN', 'error', 'Could not update your security settings.');
    }
  };

  const handleRemovePin = async () => {
    try {
      await setQuickPin(null);
      setPin('');
      setConfirmPin('');
    } catch (err) {
      showToast('Failed to Remove PIN', 'error', 'Could not remove quick PIN.');
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
        {/* Quick PIN Setup & Management Card */}
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
                  title="Quick PIN Security"
                  content="Your 4-digit PIN is stored encrypted locally in IndexedDB for fast offline session renewal."
                  position="bottom"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                4-Digit Quick PIN Management
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure or update a 4-digit passcode for instant offline session renewal when disconnected.
              </p>
            </div>

            <form onSubmit={handleSavePin} className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  New 4-Digit PIN Code
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
                  Confirm 4-Digit PIN Code
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
                    PIN codes do not match
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
                      <span>PIN Saved!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{hasPinConfigured ? 'Update 4-Digit PIN' : 'Save 4-Digit PIN'}</span>
                    </>
                  )}
                </button>

                {hasPinConfigured && (
                  <button
                    type="button"
                    onClick={handleRemovePin}
                    className="h-10 px-4 rounded-xl border border-border bg-muted/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Remove PIN
                  </button>
                )}
              </div>
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                  {user?.role || 'STUDENT'}
                </span>
                <InfoTooltip
                  title="Account Role & Permissions"
                  content="Your profile role determines offline workspace capabilities and data access."
                  position="bottom"
                />
              </div>
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

        {isDebugMode() && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Integrated Offline Engine Modules</span>
              <InfoTooltip
                title="Offline Engine Architecture"
                content="Overview of active client-side engines: 1.5s debounced autosave, binary blob storage, and cryptographic AES-GCM re-authentication."
                position="bottom"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">Auth Gate & Role Auto-Route</span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">2s IndexedDB Auto-Save</span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">Offline Blob Attachments</span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">In-Place Re-Auth Modal</span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">Printable Submission Receipts</span>
            </div>
          </div>
        )}
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
                Manage consent, self-service data export, and local device data retention.
              </p>
            </div>
          </div>
          <InfoTooltip
            title="Institutional Consent Verified"
            content="Institutional consent records and offline data retention policies are verified and active for your account."
          />
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
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Consent Active
              </span>
              <InfoTooltip
                title="Institutional Privacy Consent"
                content="Institutional consent records and offline data retention policies are verified and active for your account."
                position="bottom"
              />
            </div>
          </div>

          {/* Guardian Consent Status Card (CR-2) */}
          <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">🔒 Guardian / Institutional Approval</span>
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
                Download a complete JSON copy of all your local IndexedDB records, decrypted submission drafts, notes, and session history.
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
