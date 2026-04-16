export function HowItWorks() {
  const steps = [
    { n: "01", title: "Buy $1BPX",       desc: "Purchase tokens on Pump.fun. 1 token = 1 pixel quota." },
    { n: "02", title: "Connect Wallet",  desc: "Link your Solana wallet — Phantom, Backpack, or Solflare." },
    { n: "03", title: "Pick Your Spot",  desc: "Select any free area on the 1 billion pixel canvas." },
    { n: "04", title: "Upload Your Art", desc: "Drop a JPG, PNG, or GIF. Your pixels go live instantly." },
  ];

  return (
    <section className="how-it-works">
      <h2 className="how-it-works-title">HOW IT WORKS</h2>
      <div className="how-it-works-grid">
        {steps.map((s) => (
          <div key={s.n} className="how-it-works-card">
            <span className="how-it-works-number">{s.n}</span>
            <span className="how-it-works-step-title">{s.title}</span>
            <span className="how-it-works-desc">{s.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
