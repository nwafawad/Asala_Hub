"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useConnectivity } from "@/lib/connectivity-context";
import { useLang } from "@/lib/lang-context";
import { COPY } from "@/lib/copy";
import { getStorageEstimate } from "@/lib/offline-store";

interface SyncStatusStripProps {
  // Option to override state manually (e.g. for demo controls)
  overrideConn?: "online" | "offline" | "syncing" | null;
}

export function SyncStatusStrip({ overrideConn }: SyncStatusStripProps) {
  const { isOnline, syncStatus, lastOnlineAt, pendingSyncCount } = useConnectivity();
  const { lang } = useLang();
  const t = COPY[lang];

  const [quotaWarning, setQuotaWarning] = useState<boolean>(false);

  // FR-18: Storage Quota check
  useEffect(() => {
    async function checkQuota() {
      // TODO: wire to real sync engine storage quota threshold settings
      const est = await getStorageEstimate();
      if (est && est.percentUsed > 85) {
        setQuotaWarning(true);
      } else {
        setQuotaWarning(false);
      }
    }
    checkQuota();
  }, []);

  // Determine active connection visual state
  let effectiveConn: "online" | "offline" | "syncing" = "online";

  if (overrideConn) {
    effectiveConn = overrideConn;
  } else if (!isOnline) {
    effectiveConn = "offline";
  } else if (syncStatus === "syncing") {
    effectiveConn = "syncing";
  } else {
    effectiveConn = "online";
  }

  const isRTL = lang === "ar";

  const STATUS_CONFIG = {
    online: {
      bg: "bg-[#E4EEEC]",
      text: "text-[#1F4E45]",
      border: "border-[#D6DCD9]",
      Icon: Wifi,
      message: t.statusOnline,
    },
    offline: {
      bg: "bg-[#FBF1DE]",
      text: "text-[#8A5A05]",
      border: "border-[#E4E7E4]",
      Icon: WifiOff,
      message: t.statusOffline,
    },
    syncing: {
      bg: "bg-[#E4EEEC]",
      text: "text-[#1F4E45]",
      border: "border-[#D6DCD9]",
      Icon: RefreshCw,
      message: t.statusSyncing,
    },
  };

  const currentConfig = STATUS_CONFIG[effectiveConn];
  const IconComponent = currentConfig.Icon;

  // Format last sync time string
  const formatLastSync = () => {
    if (!lastOnlineAt) return t.minutesAgo;
    const diffMins = Math.max(0, Math.floor((Date.now() - lastOnlineAt.getTime()) / 60000));
    if (diffMins === 0) return "just now";
    return `${diffMins} min ago`;
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      aria-live="polite"
      role="status"
      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-[12.5px] font-medium border-b ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <IconComponent
          size={16}
          className={`shrink-0 ${effectiveConn === "syncing" ? "animate-spin" : ""}`}
          style={{ animationDuration: "1.6s" }}
        />
        <span className="leading-snug truncate">
          {currentConfig.message}
          {pendingSyncCount > 0 && effectiveConn === "offline" && (
            <span className="font-bold ms-1">({pendingSyncCount} queued)</span>
          )}
        </span>
      </div>

      {/* Storage quota warning indicator if quota > 85% */}
      {quotaWarning && (
        <span className="flex items-center gap-1 text-[11px] font-bold bg-[#990000] text-white px-2 py-0.5 rounded shrink-0 me-2">
          <AlertTriangle size={12} /> Storage Nearly Full
        </span>
      )}

      {effectiveConn === "online" && (
        <span className="text-[11px] opacity-80 whitespace-nowrap shrink-0">
          {t.lastSync}: {formatLastSync()}
        </span>
      )}
    </div>
  );
}
