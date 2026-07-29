'use client';

import React, { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { BulkUserImportResponse } from '@/types/admin';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  X,
  Users,
} from 'lucide-react';

interface BulkUserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUserImportModal: React.FC<BulkUserImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { bulkImportUsers } = useAdminApi();
  const { showToast } = useOverlay();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<BulkUserImportResponse | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast('Invalid File', 'error', 'Please select a valid CSV file (.csv).');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast('Invalid File', 'error', 'Please upload a valid CSV file (.csv).');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const data = await bulkImportUsers(selectedFile);
      setResult(data);
      showToast('Bulk Import Processed', 'success', data.message);
      onSuccess();
    } catch (err: any) {
      showToast('Import Failed', 'error', err?.response?.data?.detail || 'Failed to process bulk CSV file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSampleCSV = () => {
    const csvContent =
      'full_name,email,role,preferred_language\n' +
      'Zainab Hassan,zainab.hassan@asala.edu,student,en\n' +
      'Omar Farooq,omar.farooq@asala.edu,educator,ar\n' +
      'Fatima Al-Zahra,fatima.zahra@asala.edu,student,en\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'asala_student_roster_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllCredentials = () => {
    if (!result || result.created_users.length === 0) return;

    let csvText = 'Full Name,Email,Role,Temporary Password\n';
    result.created_users.forEach(u => {
      csvText += `"${u.full_name}","${u.email}","${u.role}","${u.temporary_password}"\n`;
    });

    navigator.clipboard.writeText(csvText);
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2000);
  };

  const handleResetModal = () => {
    setSelectedFile(null);
    setResult(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && handleResetModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl p-6 shadow-2xl z-50 overflow-y-auto animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-foreground">
                  Bulk Account Import (CSV)
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  Upload a student/educator roster CSV to batch-create accounts with temporary passwords.
                </Dialog.Description>
              </div>
            </div>

            <button
              onClick={handleResetModal}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!result ? (
            <div className="flex flex-col gap-5">
              {/* Sample Download Bar */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Required CSV Headers: <code className="font-mono text-foreground font-semibold">full_name, email, role</code></span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Sample Template</span>
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-purple-500/50 rounded-2xl p-8 text-center bg-muted/20 hover:bg-purple-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-foreground font-mono">{selectedFile.name}</span>
                    <span className="text-[11px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-foreground">Click to browse or drop your CSV file here</span>
                    <span className="text-[11px] text-muted-foreground">Supports .csv format with UTF-8 encoding</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedFile || isUploading}
                  onClick={handleUpload}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Roster...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload & Process CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Results Summary Package */
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total Rows</span>
                  <span className="text-xl font-bold text-foreground font-mono">{result.total_rows}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Created Accounts</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{result.success_count}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Skipped / Failed</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{result.skipped_count}</span>
                </div>
              </div>

              {/* Created Users List */}
              {result.created_users.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Provisioned Accounts ({result.created_users.length})
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyAllCredentials}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      {isCopiedAll ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied CSV!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-purple-600" />
                          <span>Copy Credentials (CSV)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl border border-border max-h-48 overflow-y-auto divide-y divide-border text-xs bg-background">
                    {result.created_users.map(u => (
                      <div key={u.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">{u.full_name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px] font-semibold capitalize">
                            {u.role}
                          </span>
                          <span className="font-mono font-bold text-xs bg-muted px-2 py-1 rounded border border-border">
                            {u.temporary_password}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped / Error Rows List */}
              {result.errors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Skipped Rows ({result.errors.length})
                  </span>

                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 max-h-36 overflow-y-auto divide-y divide-rose-500/10 text-xs">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300">
                        <span className="font-mono text-[11px] font-bold">
                          Row {err.row_number}: {err.email || 'N/A'}
                        </span>
                        <span className="text-[11px] font-medium">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Import Another File
                </button>

                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
