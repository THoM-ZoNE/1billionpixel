"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WalletRow = {
  address: string;
  totalQuota: number;
  skipSignature: boolean;
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
  onSave,
}: {
  address: string;
  current: number;
  onSave: (a: string, q: number) => void;
}) {
  const [val, setVal] = useState(String(current ?? 0));

  return (
    <div style={{ display: "flex", gap: 4 }}>
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
    </div>
  );
}

// ─── WalletTable ──────────────────────────────────────────────────────────────

function WalletTable({
  wallets,
  token,
  onRefresh,
}: {
  wallets: WalletRow[];
  token: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSkipSig = async (address: string, current: boolean) => {
    await fetch(
      `/api/admin/wallets/${encodeURIComponent(address)}/skipSignature`,
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
    if (!confirm("Biztosan törlöd ezt a területet és képét?")) return;
    await fetch(`/api/admin/areas/${areaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    onRefresh();
  };

  const updateQuota = async (address: string, quota: number) => {
    await fetch(
      `/api/admin/wallets/${encodeURIComponent(address)}/quota`,
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

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #333" }}>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Address</th>
          <th style={{ padding: "6px 8px" }}>Kvóta</th>
          <th style={{ padding: "6px 8px" }}>Skip Sign</th>
          <th style={{ padding: "6px 8px" }}>Területek</th>
          <th style={{ padding: "6px 8px" }}>Kvóta állítás</th>
        </tr>
      </thead>
      <tbody>
        {wallets.map((w) => (
          <React.Fragment key={w.address}>
            <tr key={w.address} style={{ borderBottom: "1px solid #222" }}>
              <td
                style={{
                  padding: "6px 8px",
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              >
                {w.address.slice(0, 8)}...{w.address.slice(-6)}
              </td>
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                {((w.totalQuota ?? 0).toLocaleString())}
              </td>

              {/* Skip Signature kapcsoló */}
              <td style={{ textAlign: "center", padding: "6px 8px" }}>
                <button
                  onClick={() => toggleSkipSig(w.address, w.skipSignature)}
                  title={
                    w.skipSignature
                      ? "Sign kötelező visszaállítása"
                      : "Sign ellenőrzés kikapcsolása"
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

              {/* Területek expand gomb */}
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

              {/* Kvóta állítás */}
              <td style={{ padding: "6px 8px" }}>
                <QuotaEditor
                  address={w.address}
                  current={w.totalQuota}
                  onSave={updateQuota}
                />
              </td>
            </tr>

            {/* Expandable területek lista */}
            {expanded === w.address && (
              <tr key={`${w.address}-areas`}>
                <td
                  colSpan={5}
                  style={{ background: "#1a1a1a", padding: "8px 16px" }}
                >
                  {w.areas.length === 0 ? (
                    <span style={{ color: "#666", fontSize: 12 }}>
                      Nincs terület
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
                            title="Terület és kép törlése"
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
  // email/jelszó login state-ek
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

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── Login ──
  const handleLogin = async () => {
    const r = await fetch(`${API}/api/admin/login`, {
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

  // ── Auto-auth ha van mentett token ──
  useEffect(() => {
    if (token) {
      fetch(`${API}/api/admin/wallets`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.ok) setAuthed(true);
        else { localStorage.removeItem("admin_token"); setToken(""); }
      });
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    const res = await fetch(`${API}/api/admin/wallets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
    const data = await res.json();
    setWallets(data.map((w: any) => ({
      ...w,
      totalQuota: Number(w.totalQuota ?? 0),
    })));
  }
  }, [token]);

  const fetchForbidden = useCallback(async () => {
    const res = await fetch(`${API}/api/admin/forbidden`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setForbiddenZones(await res.json());
  }, [token]);

  useEffect(() => {
    if (authed) { fetchWallets(); fetchForbidden(); }
  }, [authed, fetchWallets, fetchForbidden]);

  const createTestWallet = async () => {
    await fetch(`${API}/api/admin/test-wallet`, {
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
    if (!confirm("Biztosan törlöd az összes Forbidden zónát?")) return;
    await fetch(`${API}/api/admin/forbidden`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchForbidden();
  };

  // ── Login képernyő ──
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
          type="password" placeholder="Jelszó"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ padding: "8px 12px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }}
        />
        <button
          onClick={handleLogin}
          style={{ padding: "8px 16px", background: "#14f195", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
        >
          Belépés
        </button>
        {loginMsg && <div style={{ color: "#f87171", fontSize: "0.8rem" }}>{loginMsg}</div>}
      </div>
    </div>
  );

  // ── Admin felület ── (marad az eredeti, csak logout gomb kerül a fejlécbe)
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "monospace", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
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

      {/* ── Teszt Wallet létrehozás ── */}
      <section style={{ marginTop: 32 }}>
        <h3 style={{ color: "#aaa", marginBottom: 12 }}>Teszt Wallet (sign nélkül)</h3>
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

      {/* ── Forbidden Zónák ── */}
      <section style={{ marginTop: 32 }}>
        <h3 style={{ color: "#aaa", marginBottom: 12 }}>Forbidden Zones</h3>
        <button onClick={deleteAllForbidden}
          style={{ padding: "6px 14px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          🗑️ Delete all Forbidden zones
        </button>
        {forbiddenZones.length > 0 && (
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>{forbiddenZones.length} zóna aktív</div>
        )}
      </section>

      {/* ── Wallet lista ── */}
      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h3 style={{ color: "#aaa", margin: 0 }}>Wallet-ek ({wallets.length})</h3>
          <button onClick={fetchWallets}
            style={{ padding: "4px 12px", background: "#222", color: "#aaa", border: "1px solid #444", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            Refresh
          </button>
        </div>
        <WalletTable wallets={wallets} token={token} onRefresh={fetchWallets} />
      </section>
    </div>
  );
}