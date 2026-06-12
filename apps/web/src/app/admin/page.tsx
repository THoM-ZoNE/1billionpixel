"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WalletRow = {
  address: string;
  telegramHandle: string | null;
  totalQuota: number;
  availableQuota: number;
  bonusPixels: number;  
  penaltyPixels: number;
  manualOverride: boolean;
  skipSignature: boolean;
  violationCount: number;   
  bannedAt: string | null;
  areas: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    imageUrl?: string;
    status: string;
  }[];
};

type ForbiddenZone = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

// ─── QuotaEditor ──────────────────────────────────────────────────────────────

function QuotaEditor({
  address,
  current,
  manualOverride,
  onSave,
  onResetOverride,
}: {
  address: string;
  current: number;
  manualOverride: boolean;
  onSave: (a: string, q: number) => void;
  onResetOverride: (a: string) => void;
}) {
  const [val, setVal] = useState(String(current ?? 0));

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{
          width: 90,
          padding: "2px 6px",
          background: "#222",
          border: "1px solid #444",
          color: "#fff",
          borderRadius: 4,
          fontSize: 12,
        }}
        type="number"
      />
      <button
        onClick={() => onSave(address, Number(val))}
        style={{
          padding: "2px 8px",
          background: "#14f195",
          color: "#000",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        ✓
      </button>
      <button
        onClick={() => onResetOverride(address)}
        title={manualOverride ? "Manual mode — click to enable auto-sync" : "Auto-sync active"}
        style={{
          fontSize: 18, background: "none", border: "none",
          cursor: manualOverride ? "pointer" : "default",
          opacity: manualOverride ? 1 : 0.3,
          padding: "2px 4px",
        }}
      >
        {manualOverride ? "🔒" : "🔄"}
      </button>
    </div>
  );
}

// ─── WalletTable ──────────────────────────────────────────────────────────────

function WalletTable({
  wallets,
  token,
  onRefresh,
  apiUrl,
}: {
  wallets: WalletRow[];
  token: string;
  onRefresh: () => void;
  apiUrl: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSkipSig = async (address: string, current: boolean) => {
    await fetch(
      `${apiUrl}/admin/wallets/${encodeURIComponent(address)}/skipSignature`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skipSignature: !current }),
      }
    );
    onRefresh();
  };

  const deleteArea = async (areaId: string) => {
    if (!confirm("Are you sure you want to delete this area and image?")) return;
    await fetch(`${apiUrl}/admin/areas/${areaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    onRefresh();
  };

const moderateArea = async (areaId: string, walletAddress: string, violationCount: number) => {
  // Az action-t automatikusan a violationCount alapján ajánljuk, de admin dönt
  const suggestedAction = violationCount === 0 ? "warn" : violationCount === 1 ? "punish" : "ban";
  const action = window.prompt(
    `Moderation action for this area:\n` +
    `Wallet violations so far: ${violationCount}\n\n` +
    `Options: warn (quota back) | punish (quota lost) | ban (wallet banned)\n` +
    `Suggested: ${suggestedAction}`,
    suggestedAction
  );
  if (!action || !["warn", "punish", "ban"].includes(action)) return;

  const res = await fetch(`${apiUrl}/admin/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ areaId, action }),
  });
  const data = await res.json();
  alert(data.message ?? data.error);
  onRefresh();
};

const unbanWallet = async (address: string) => {
  if (!confirm(`Unban wallet ${address.slice(0, 8)}...?`)) return;
  await fetch(`${apiUrl}/admin/wallets/${encodeURIComponent(address)}/unban`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  onRefresh();
};

  const updateQuota = async (address: string, quota: number) => {
    await fetch(
      `${apiUrl}/admin/wallets/${encodeURIComponent(address)}/quota`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quota: quota }),
      }
    );
    onRefresh();
  };

  const giveBonus = async (address: string) => {
  const input = window.prompt(
    `Give bonus pixels to ${address.slice(0, 8)}...\n\nEnter pixel amount:`,
    "100000"
  );
  if (!input || isNaN(Number(input))) return;

  const reason = window.prompt("Reason (optional, sent in DM):", "") ?? "";

  const res = await fetch(
    `${apiUrl}/admin/wallets/${encodeURIComponent(address)}/bonus`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pixels: Number(input), reason }),
    }
  );
  const data = await res.json();
  alert(data.error ? `❌ ${data.error}` : `✅ Bonus added: ${Number(input).toLocaleString()} px`);
  onRefresh();
};
const resetOverride = async (address: string) => {
  const res = await fetch(
    `${apiUrl}/admin/wallets/${encodeURIComponent(address)}/reset-override`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json();
  alert(data.error ? `❌ ${data.error}` : `✅ Auto-sync enabled`);
  onRefresh();
};
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #333" }}>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Address</th>
          <th style={{ padding: "6px 8px" }}>Token</th>
          <th style={{ padding: "6px 8px" }}>Available</th>
          <th style={{ padding: "6px 8px" }}>Skip Sign</th>
          <th style={{ padding: "6px 8px" }}>Areas</th>
          <th style={{ padding: "6px 8px" }}>Set quota</th>
          <th style={{ padding: "6px 8px" }}>Bonus</th>
          <th style={{ padding: "6px 8px" }}>Violations</th>
          <th style={{ padding: "6px 8px" }}>Ban</th>
        </tr>
      </thead>
      <tbody>
        {wallets.map((w) => (
          <React.Fragment key={w.address}>
            <tr key={w.address} style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11 }}>
              <div>{w.address.slice(0, 8)}...{w.address.slice(-6)}</div>
              {w.telegramHandle && (
                <div style={{ color: "#64b5f6", fontSize: 10, marginTop: 2 }}>
                  {w.telegramHandle}
                </div>
              )}
            </td>
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                {((w.totalQuota ?? 0).toLocaleString())}
              </td>
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
              <span style={{ color: w.availableQuota > 0 ? "#14f195" : "#666" }}>
                {(w.availableQuota ?? 0).toLocaleString()}
              </span>
            </td>
              {/* Skip Signature toggle */}
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                <button
                  onClick={() => toggleSkipSig(w.address, w.skipSignature)}
                  title={
                    w.skipSignature
                      ? "Restore sign requirement"
                      : "Disable sign verification"
                  }
                  style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: w.skipSignature ? "#14f195" : "#444",
                    color: w.skipSignature ? "#000" : "#aaa",
                    fontWeight: "bold",
                  }}
                >
                  {w.skipSignature ? "✓ Skip" : "Sign"}
                </button>
              </td>

              {/* Areas expand button */}
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                <button
                  onClick={() =>
                    setExpanded(expanded === w.address ? null : w.address)
                  }
                  style={{
                    background: "none",
                    border: "1px solid #555",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    color: "#aaa",
                    fontSize: 12,
                  }}
                >
                  {w.areas.length} db {expanded === w.address ? "▲" : "▼"}
                </button>
              </td>

              {/* Set quota */}
              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                <QuotaEditor
                  address={w.address}
                  current={w.totalQuota}
                  manualOverride={w.manualOverride}
                  onSave={updateQuota}
                  onResetOverride={resetOverride}
                />
              </td>
              {/* Bonus */}
              <td style={{ textAlign: "right", padding: "6px 8px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, color: "#a3e635" }}>
                {w.bonusPixels > 0 ? `+${w.bonusPixels.toLocaleString()}` : "—"}
                </span>
              <button
                onClick={() => giveBonus(w.address)}
                title="Give bonus pixels"
                style={{
                  padding: "2px 8px",
                  background: "#14532d",
                  color: "#86efac",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                🎁
              </button>
              </div>
            </td>
              {/* Violations */}
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                <span style={{
                  color: w.violationCount === 0 ? "#666" : w.violationCount === 1 ? "#f59e0b" : "#f87171",
                  fontWeight: "bold"
                }}>
                  {w.violationCount}x
                </span>
              </td>

              {/* Ban status */}
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                {w.bannedAt ? (
                  <button
                    onClick={() => unbanWallet(w.address)}
                    title="Click to unban"
                    style={{ padding: "2px 8px", background: "#7f1d1d", color: "#fca5a5",
                            border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                  >
                    🚫 Banned
                  </button>
                ) : (
                  <span style={{ color: "#444", fontSize: 11 }}>—</span>
                )}
              </td>
            </tr>

            {/* Expandable areas list */}
            {expanded === w.address && (
              <tr key={`${w.address}-areas`}>
                <td
                  colSpan={9}
                  style={{ background: "#1a1a1a", padding: "8px 16px" }}
                >
                  {w.areas.length === 0 ? (
                    <span style={{ color: "#666", fontSize: 12 }}>
                      No areas
                    </span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {w.areas.map((area) => (
                        <div
                          key={area.id}
                          style={{
                            border: "1px solid #333",
                            borderRadius: 6,
                            padding: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#111",
                          }}
                        >
                          {area.imageUrl && (
                            <img
                              src={area.imageUrl}
                              alt=""
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 4,
                              }}
                            />
                          )}
                          <div style={{ fontSize: 11, color: "#888" }}>
                            <div>
                              x:{area.x} y:{area.y}
                            </div>
                            <div>
                              {area.width}×{area.height}px
                            </div>
                            <div
                              style={{
                                color:
                                  area.status === "ACTIVE"
                                    ? "#14f195"
                                    : "#f59e0b",
                              }}
                            >
                              {area.status}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteArea(area.id)}
                            title="Delete area and image"
                            style={{
                              background: "#7f1d1d",
                              border: "none",
                              borderRadius: 4,
                              color: "#fca5a5",
                              cursor: "pointer",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            🗑️
                          </button>
                          <button
                          onClick={() => moderateArea(area.id, w.address, w.violationCount)}
                          title="Moderate (remove image + sanction)"
                          style={{
                            background: "#78350f",
                            border: "none",
                            borderRadius: 4,
                            color: "#fcd34d",
                            cursor: "pointer",
                            padding: "4px 8px",
                            fontSize: 12,
                          }}
                        >
                          ⚠️
                        </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  // email/password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""
  );
  const [loginMsg, setLoginMsg] = useState("");

  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [forbiddenZones, setForbiddenZones] = useState<ForbiddenZone[]>([]);
  const [testAddress, setTestAddress] = useState("");
  const [testQuota, setTestQuota] = useState("10000000");
  const [search, setSearch] = useState("");
  const filteredWallets = wallets.filter((w) => {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
    w.address.toLowerCase().includes(q) ||
    (w.telegramHandle ?? "").toLowerCase().includes(q)
  );
});

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── Login ──
  const handleLogin = async () => {
    const r = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) {
      const { token: t } = await r.json();
      localStorage.setItem("admin_token", t);
      setToken(t);
      setAuthed(true);
    } else {
      const err = await r.json();
      setLoginMsg(`❌ ${err.error}`);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
    setAuthed(false);
  };

  // ── Auto-auth if there is a saved token ──
  useEffect(() => {
    if (token) {
      fetch(`${API}/admin/wallets`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.ok) setAuthed(true);
        else { localStorage.removeItem("admin_token"); setToken(""); }
      });
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    const res = await fetch(`${API}/admin/wallets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
    const data = await res.json();
    setWallets(data.map((w: any) => ({
      ...w,
      totalQuota: Number(w.totalQuota ?? 0),
      availableQuota: Number(w.availableQuota ?? 0),
      bonusPixels:   Number(w.bonusPixels   ?? 0),
      penaltyPixels: Number(w.penaltyPixels ?? 0),
      manualOverride: w.manualOverride ?? false,
    })));
  }
  }, [token]);

  const fetchForbidden = useCallback(async () => {
    const res = await fetch(`${API}/admin/forbidden`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setForbiddenZones(await res.json());
  }, [token]);

  useEffect(() => {
    if (authed) { fetchWallets(); fetchForbidden(); }
  }, [authed, fetchWallets, fetchForbidden]);

  const createTestWallet = async () => {
    await fetch(`${API}/admin/test-wallet`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        address: testAddress,
        quota: Number(testQuota),
        skipSignature: true,
      }),
    });
    fetchWallets();
  };

  const deleteAllForbidden = async () => {
    if (!confirm("Are you sure you want to delete all Forbidden zones?")) return;
    await fetch(`${API}/admin/forbidden`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchForbidden();
  };

  // ── Login screen ──
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      <div style={{ background: "#0f1a0f", border: "1px solid rgba(20,241,149,0.2)", borderRadius: 12, padding: "2rem", width: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ color: "#14f195", margin: 0 }}>ADMIN LOGIN</h2>
        <input
          type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
          style={{ padding: "8px 12px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }}
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ padding: "8px 12px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }}
        />
        <button
          onClick={handleLogin}
          style={{ padding: "8px 16px", background: "#14f195", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
        >
          Log in
        </button>
        {loginMsg && <div style={{ color: "#f87171", fontSize: "0.8rem" }}>{loginMsg}</div>}
      </div>
    </div>
  );

  // ── Admin panel ── (stays the same, only logout button is added to the header)
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "monospace", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingTop: 50 }}>
        <h1 style={{ color: "#14f195", margin: 0 }}>1BP ADMIN</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/" style={{ color: "#888", fontSize: 13 }}>← Back to main page</a>
          <button
            onClick={logout}
            style={{ padding: "4px 12px", background: "#1a1a1a", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Test Wallet creation ── */}
      <section style={{ marginTop: 32 }}>
        <h3 style={{ color: "#aaa", marginBottom: 12 }}>Test Wallet (signless)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={testAddress} onChange={e => setTestAddress(e.target.value)} placeholder="Wallet address"
            style={{ padding: "6px 10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 13, width: 340 }} />
          <input value={testQuota} onChange={e => setTestQuota(e.target.value)} type="number"
            style={{ padding: "6px 10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 13, width: 130 }} />
          <button onClick={createTestWallet}
            style={{ padding: "6px 16px", background: "#14f195", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
            Create
          </button>
        </div>
      </section>

      {/* ── Forbidden Zones ── */}
      <section style={{ marginTop: 32 }}>
        <h3 style={{ color: "#aaa", marginBottom: 12 }}>Forbidden Zones</h3>
        <button onClick={deleteAllForbidden}
          style={{ padding: "6px 14px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          🗑️ Delete all Forbidden zones
        </button>
        {forbiddenZones.length > 0 && (
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>{forbiddenZones.length} active zones</div>
        )}
      </section>

      {/* ── Wallet list ── */}
<section style={{ marginTop: 32 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
    <h3 style={{ color: "#aaa", margin: 0 }}>
      Wallet list ({filteredWallets.length}/{wallets.length})  {/* ← szűrt/összes */}
    </h3>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="🔍 Wallet address or @telegramID..."
      style={{
        padding: "4px 10px",
        background: "#111",
        border: "1px solid #333",
        color: "#fff",
        borderRadius: 6,
        fontSize: 12,
        width: 260,
      }}
    />
    {search && (
      <button
        onClick={() => setSearch("")}
        style={{ padding: "4px 8px", background: "#222", color: "#aaa",
          border: "1px solid #444", borderRadius: 6, cursor: "pointer", fontSize: 11 }}
      >
        ✕ Clear
      </button>
    )}
    <button
      onClick={fetchWallets}
      style={{ padding: "4px 12px", background: "#222", color: "#aaa",
        border: "1px solid #444", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
    >
      Refresh
    </button>
  </div>
  {/* ← filteredWallets-et kap, nem wallets-et */}
  <WalletTable wallets={filteredWallets} token={token} onRefresh={fetchWallets} apiUrl={API}/>
</section>
    </div>
  );
}
