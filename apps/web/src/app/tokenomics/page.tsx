"use client";

export default function TokenomicsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070a",
        color: "white",
        padding: "96px 24px 48px",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "2.25rem",
        }}
      >
        <section style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <p
            style={{
              margin: 0,
              color: "rgba(153,69,255,0.9)",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Tokenomics
          </p>
          <h1
            style={{
              margin: "1rem 0 0.75rem",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              lineHeight: 1.25,
            }}
          >
            1 Token = 1 Pixel
          </h1>
          <p
            style={{
              maxWidth: 720,
              margin: "0 auto",
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.95rem",
              lineHeight: 1.8,
              fontFamily: "monospace",
            }}
          >
            $1BPX is designed around a simple rule: your wallet balance defines how much permanent visual territory you can control on the 1 Billion Pixel canvas.
          </p>
        </section>

        <section
          style={{
            border: "1px solid rgba(153,69,255,0.24)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 20,
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "#c4b5fd",
              fontFamily: '"Press Start 2P", monospace',
              lineHeight: 1.5,
            }}
          >
            Supply
          </h2>
          <div
            style={{
              marginTop: "1.25rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            <div style={cardStyle}>
              <div style={valueStyle}>1,000,000,000</div>
              <div style={labelStyle}>Total supply</div>
            </div>
            <div style={cardStyle}>
              <div style={valueStyle}>1 : 1</div>
              <div style={labelStyle}>Token to pixel ratio</div>
            </div>
            <div style={cardStyle}>
              <div style={valueStyle}>Fixed</div>
              <div style={labelStyle}>No inflation by design</div>
            </div>
          </div>
          <p style={bodyStyle}>
            The total supply is fixed at 1,000,000,000 $1BPX, matching the total number of pixels available on the canvas by design. Every token represents the right to hold one pixel of claimable area. 
          </p>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Launch model</h2>
          <p style={bodyStyle}>
            $1BPX is built for a Pump.fun-style launch flow on Solana, where price discovery happens through a bonding-curve mechanism rather than a private presale process. Pump.fun is widely described as a fair-launch token launchpad on Solana with bonding-curve trading mechanics. [web:70][web:71][web:75]
          </p>
          <p style={bodyStyle}>
            The project team may acquire a portion of supply at launch to fund development, operations, and ecosystem support. That allocation can be locked, gradually distributed, or partially removed from effective circulation through intentional use on tiny canvas claims, depending on treasury policy.
          </p>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Hold to claim</h2>
          <p style={bodyStyle}>
            Users do not spend or burn their $1BPX to claim space. Instead, they hold tokens in their wallet, and that live balance determines the maximum amount of pixel area they can control at any time.
          </p>
          <p style={bodyStyle}>
            If a wallet holds 10,000 tokens, it can control up to 10,000 pixels of area. Claiming is therefore quota-based, not payment-based: the token acts as access capacity for the canvas.
          </p>
        </section>

        <section style={panelStyle}>
        <h2 style={sectionTitle}>At risk system</h2>
        <p style={bodyStyle}>
            To claim space, users must connect a Telegram account for notification
            delivery and bot-side verification. The system checks wallet balances
            on an hourly sync cycle and compares live token holdings against the
            size of each wallet's claimed area.
        </p>
        <p style={bodyStyle}>
            If a wallet balance drops below the claimed pixel count, the area is
            immediately marked as{" "}
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>AT_RISK</span> and
            the owner receives a Telegram alert. The wallet has until the next
            hourly sync to restore the balance.
        </p>
        <p style={bodyStyle}>
            If the balance is still insufficient at the next sync, the system
            applies an <strong style={{ color: "#e9d5ff" }}>
            Proportional Shrink</strong>: the image is scaled down from the
            top-left anchor so the remaining area exactly matches the current token
            balance. The aspect ratio is preserved. The freed space on the right
            and bottom becomes immediately available for others to claim.
        </p>
        <p style={bodyStyle}>
            If the resulting area would fall below{" "}
            <span style={{ color: "#f87171" }}>10 × 10 pixels</span>, the claim
            is fully released instead of shrunk — to keep the canvas clean and
            free of unusable micro-fragments.
        </p>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Why it matters</h2>
          <p style={bodyStyle}>
            This model ties visible canvas ownership directly to live token ownership. Selling tokens does not just change portfolio exposure — it can also reduce the amount of space a wallet is allowed to keep on the public canvas.
          </p>
          <p style={bodyStyle}>
            That creates a clear on-platform utility loop: hold tokens to maintain area, grow holdings to expand area, and risk shrinkage when holdings fall below the amount of claimed space.
          </p>
        </section>
      </div>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 20,
  padding: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(153,69,255,0.18)",
  background: "rgba(153,69,255,0.06)",
  borderRadius: 16,
  padding: "1rem",
};

const valueStyle: React.CSSProperties = {
  color: "#e9d5ff",
  fontWeight: 700,
  fontSize: "1.4rem",
  marginBottom: "0.35rem",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: "0.78rem",
  fontFamily: "monospace",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  color: "#c4b5fd",
  fontSize: "1rem",
  fontFamily: '"Press Start 2P", monospace',
  lineHeight: 1.5,
};

const bodyStyle: React.CSSProperties = {
  margin: "1rem 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: "0.92rem",
  lineHeight: 1.85,
  fontFamily: "monospace",
};