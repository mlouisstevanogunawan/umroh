"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function StoreNotice() {
  const { syncError } = useStore();
  const [dismissed, setDismissed] = useState("");
  if (!syncError || dismissed === syncError) return null;
  return <div className="sync-toast" role="status"><AlertTriangle size={16} /><span>{syncError}</span><button aria-label="Tutup pemberitahuan" onClick={() => setDismissed(syncError)}><X size={15} /></button></div>;
}
