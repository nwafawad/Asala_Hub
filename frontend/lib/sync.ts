import { db } from "./db";
import { getStoredToken } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_RETRY_COUNT = 5;

let isSyncingInProgress = false;

export async function syncPendingTransactions(): Promise<{ syncedCount: number; errors: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, errors: 0 };
  }

  if (isSyncingInProgress) {
    console.log("[Sync Engine] Sync operation already in progress. Skipping duplicate run.");
    return { syncedCount: 0, errors: 0 };
  }

  const token = getStoredToken();
  if (!token) {
    console.log("[Sync Engine] No auth token found. Skipping sync.");
    return { syncedCount: 0, errors: 0 };
  }

  isSyncingInProgress = true;

  try {
    // Query unsynced transaction logs that haven't exceeded retry attempts
    const pendingLogs = await db.transactionLogs
      .filter((log) => (log.synced_at === null || log.synced_at === undefined) && log.retry_count < MAX_RETRY_COUNT)
      .sortBy("client_timestamp");

    if (pendingLogs.length === 0) {
      return { syncedCount: 0, errors: 0 };
    }

    // Deduplicate transaction logs targeting the same entity_type and entity_id (Keep latest client_timestamp)
    const latestLogsByEntity = new Map<string, typeof pendingLogs[0]>();
    const obsoleteLogIds: string[] = [];

    for (const log of pendingLogs) {
      const key = `${log.entity_type}:${log.entity_id}`;
      const existing = latestLogsByEntity.get(key);
      if (!existing) {
        latestLogsByEntity.set(key, log);
      } else {
        if (new Date(log.client_timestamp) >= new Date(existing.client_timestamp)) {
          obsoleteLogIds.push(existing.id);
          latestLogsByEntity.set(key, log);
        } else {
          obsoleteLogIds.push(log.id);
        }
      }
    }

    // Mark superseded local logs as synced
    if (obsoleteLogIds.length > 0) {
      const nowStr = new Date().toISOString();
      await db.transaction("rw", db.transactionLogs, async () => {
        for (const obsId of obsoleteLogIds) {
          await db.transactionLogs.update(obsId, {
            synced_at: nowStr,
            error_message: "Superseded by newer offline transaction",
          });
        }
      });
    }

    const effectiveLogs = Array.from(latestLogsByEntity.values());

    console.log(`[Sync Engine] Preparing to sync batch of ${effectiveLogs.length} deduplicated transaction(s)...`);

    const payloadBatch = effectiveLogs.map((log) => ({
      transaction_id: log.id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: log.action,
      payload: log.payload,
      client_timestamp: log.client_timestamp,
    }));


    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactions: payloadBatch }),
    });

    if (!response.ok) {
      console.error(`[Sync Engine] HTTP sync failed with status ${response.status}`);
      // Increment retry count for batch
      await db.transaction("rw", db.transactionLogs, async () => {
        for (const log of pendingLogs) {
          await db.transactionLogs.update(log.id, {
            retry_count: log.retry_count + 1,
            error_message: `HTTP ${response.status}`,
          });
        }
      });
      return { syncedCount: 0, errors: pendingLogs.length };
    }

    const data = await response.json();
    const results: Array<{
      transaction_id: string;
      status: "accepted" | "rejected";
      synced_at?: string;
      error?: string;
    }> = data.results || [];

    let syncedCount = 0;
    let errors = 0;

    const pendingLogsMap = new Map(pendingLogs.map((l) => [l.id, l]));

    await db.transaction("rw", [db.submissions, db.transactionLogs], async () => {
      const now = new Date().toISOString();

      for (const res of results) {
        const log = pendingLogsMap.get(res.transaction_id);

        if (res.status === "accepted") {
          syncedCount++;
          const syncedTimestamp = res.synced_at || now;

          await db.transactionLogs.update(res.transaction_id, {
            synced_at: syncedTimestamp,
            error_message: null,
          });

          if (log && log.entity_type === "submission") {
            await db.submissions.update(log.entity_id, {
              sync_status: "synced",
              updated_at: syncedTimestamp,
            });
          }
        } else {
          errors++;
          if (log) {
            await db.transactionLogs.update(res.transaction_id, {
              retry_count: log.retry_count + 1,
              error_message: res.error || "Server rejected transaction",
            });
          }
        }
      }
    });

    console.log(`[Sync Engine] Batch sync complete. Synced: ${syncedCount}, Errors: ${errors}`);
    return { syncedCount, errors };
  } catch (err: any) {
    console.error("[Sync Engine] Network error during batch sync:", err);
    return { syncedCount: 0, errors: 1 };
  } finally {
    isSyncingInProgress = false;
  }
}
