"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Stats {
  claimedPixels: number;
  totalPixels: number;
  percentFilled: string;
  totalWallets: number;
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = () =>
      api.get<Stats>("/canvas/stats").then(setStats).catch(() => {});
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const pct = parseFloat(stats.percentFilled);

  return (
    <div className="statsbar">
      {/* Number row */} 
      <div className="statsbar-grid">
        <StatItem
          label="Pixels Claimed"
          value={stats.claimedPixels.toLocaleString()}
        />
        <StatItem
          label="Pixels Remaining"
          value={(stats.totalPixels - stats.claimedPixels).toLocaleString()}
        />
        <StatItem label="Canvas Filled" value={`${stats.percentFilled}%`} />
        <StatItem
          label="Pixel Owners"
          value={stats.totalWallets.toLocaleString()}
        />
      </div>

      {/* Progress bar */}
      <div className="statsbar-track">
        <div
          className="statsbar-fill"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="statsbar-item">
    <div className="statsbar-value">
      {value}
    </div>
    <div className="statsbar-label">
      {label}
    </div>
  </div>
);
