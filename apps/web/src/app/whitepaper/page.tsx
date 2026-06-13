import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whitepaper — 1BillionPixel.fun",
  description:
    "The full whitepaper for 1BillionPixel.fun — a Solana-based digital ownership project built around the 1 token = 1 pixel rule.",
};

const sections = [
  {
    id: "overview",
    label: "Overview",
    title: "Overview",
    content: [
      "1BillionPixel.fun is a Solana-based digital ownership project that reimagines the cultural logic of the Million Dollar Homepage for Web3. The original Million Dollar Homepage became famous by turning a fixed pixel grid into scarce internet real estate, where each purchased block represented visible space on a shared digital surface. 1BillionPixel.fun takes that same simple and explainable idea and upgrades it into a live, token-backed capsule where ownership is tied to on-chain participation rather than a one-time ad placement.",
      "Instead of selling static ad inventory once, 1BillionPixel.fun creates a persistent digital territory layer where users and communities can claim, maintain, and defend visible space through token ownership. The project is designed to be easy to understand at first glance, but strong enough to support long-term community identity, social rivalry, and evolving on-chain coordination.",
    ],
  },
  {
    id: "inspiration",
    label: "Inspiration",
    title: "Inspiration and Narrative",
    content: [
      "In 2005, Alex Tew launched the Million Dollar Homepage, a website built on a one million pixel grid where each pixel was sold for one dollar, creating one of the internet's best-known experiments in digital scarcity and viral monetization. Its brilliance came from simplicity: a finite visual surface, a clear ownership unit, and a social incentive to be seen.",
      "1BillionPixel.fun carries that concept into a new era. Instead of a static webpage frozen in time, it introduces a living capsule on Solana where every claimed area is backed by a token balance and where the visual state of the project can evolve continuously as participants join, expand, reduce, or lose territory. The result is not just a tribute to an old internet legend, but a programmable, community-native version of it for the age of Web3.",
    ],
  },
  {
    id: "vision",
    label: "Vision",
    title: "Vision",
    content: [
      "The project's vision is to turn abstract token ownership into visible digital presence. Many crypto tokens are hard to explain outside their own ecosystems, but 1BillionPixel.fun uses a direct, visual rule: if a participant holds tokens, they can claim territory; if they reduce their holdings, that territory eventually shrinks.",
      "This creates a stronger emotional and social connection than a standard token dashboard or speculative chart. A wallet balance becomes a visible footprint inside a shared capsule, and that footprint becomes part of a larger collective story shaped by creators, communities, memes, and coordinated campaigns.",
    ],
  },
  {
    id: "mechanics",
    label: "Core Mechanics",
    title: "Core Mechanics",
    highlight: "1 token = 1 pixel of claimable quota",
    content: [
      "The foundational rule of the system is simple: 1 token equals 1 pixel of claimable quota. In practical terms, a wallet's 1BPX balance determines how many pixels that wallet is entitled to occupy inside the capsule at any given time.",
      "Users connect a Solana wallet, verify eligibility, and claim territory within the capsule up to the limit supported by their token balance. The token is not consumed when territory is claimed; instead, the claim remains valid only as long as the wallet continues to hold enough 1BPX to back the area it controls.",
      "This model turns ownership into an active state rather than a one-off purchase. It encourages long-term holding, makes territory visibly scarce, and creates a natural relationship between market participation and digital presence.",
    ],
  },
  {
    id: "blockchain",
    label: "Blockchain & Launch",
    title: "Blockchain and Launch Infrastructure",
    content: [
      "1BillionPixel.fun runs on the Solana blockchain, which provides the speed and low transaction costs needed for a system that may involve many users, frequent claim updates, and constant balance verification. Solana serves as the settlement and ownership layer for the project's token and wallet interactions.",
      "The 1BPX token is launched through Pump.fun, a Solana-native token launch platform built around immediate tradability and a transparent bonding curve model. This is an important distinction: the project is not only based on Solana as infrastructure, but also enters the market through a launch environment that is already familiar to Solana-native, meme-driven, and community-first audiences.",
      "Pump.fun is designed so newly created tokens can begin trading immediately without the creator manually seeding a traditional liquidity pool, because the platform initializes a bonding curve market from the start. That makes it a strong fit for 1BillionPixel.fun, whose concept depends on quick community formation, easy onboarding, and visible momentum around a culturally simple idea.",
    ],
  },
  {
    id: "tokenomics",
    label: "Tokenomics",
    title: "Tokenomics",
    content: [
      "1BPX is a utility token designed around spatial rights inside the capsule. Its purpose is not to grant equity, revenue share, or passive yield, but to define how much visible territory a wallet can claim and maintain on the platform.",
      "The token follows the Pump.fun launch model rather than a custom presale or private allocation structure. Pump.fun emphasizes fair-launch mechanics, immediate tradability, and price discovery through a bonding curve, with tokens entering the market in a way that does not require manual liquidity provisioning by the creator.",
      "There is no dedicated team allocation. The builder and any future contributors participate under the same broad market conditions as the community, and development support comes in part from AI models that help accelerate coding, testing, iteration, and documentation workflows.",
      "Because Pump.fun uses a bonding curve mechanism, the token's early price formation is dynamic: buyers move the curve upward as demand increases, and sellers move it downward through the same market path. As the token matures, the surrounding market structure can evolve beyond the initial bonding curve phase, but the platform logic of 1BPX remains constant: token ownership maps to pixel quota, and quota maps to visible territory.",
    ],
  },
  {
    id: "claiming",
    label: "Claiming & Risk",
    title: "Claiming, Risk, and Territory Adjustment",
    content: [
      "When a user claims area in the capsule, the backend records the claimed region and links it to the user's wallet. The system then continuously or periodically checks whether that wallet still holds enough 1BPX to support the claimed pixel count.",
      "If the wallet balance drops below the required quota, the area enters an at-risk state. During that time, the owner can restore the missing balance and keep the full territory. If the shortfall remains unresolved after the relevant sync cycle, the claimed area is reduced to the size supported by the current token balance, and the excess pixels are released back into the capsule.",
      "This mechanism is one of the project's most important differentiators. It ensures that territory ownership remains alive, enforceable, and directly tied to current on-chain token holdings rather than historical snapshots or manual moderation.",
    ],
  },
  {
    id: "verification",
    label: "Verification",
    title: "Verification and Identity Layer",
    content: [
      "Wallet ownership alone is enough to support basic pixel claims, but the long-term roadmap of 1BillionPixel.fun goes further than individual ownership. The project is designed to evolve toward organized, community-level competition, which means verified social identity becomes increasingly important.",
      "Telegram verification is integrated into the claim section as an important participation step. Users are encouraged to verify through the project's Telegram-linked flow before or during area claiming, so wallet-based territory can be associated with recognizable people, groups, and coordinated campaigns.",
      "This verification layer helps reduce abuse, improves accountability in social competition, creates a stronger bridge between wallet activity and community presence, and lays the foundation for future group-based mechanics.",
    ],
  },
  {
    id: "cvc",
    label: "Community vs Community",
    title: "Community vs Community",
    content: [
      "A major long-term expansion path for 1BillionPixel.fun is the development of Community vs Community (CvC). In this model, the capsule is no longer just a map of individual holders, but a battlefield of collective presence where communities compete to gain, defend, and grow their territory.",
      "This changes the meaning of ownership. A claimed area stops being only a personal digital footprint and becomes part of a group strategy, social identity, and reputation layer. The stronger and more active a community is, the more effectively it can organize territory acquisition, defend existing land, and project visible dominance inside the capsule.",
      "CvC gives the project a durable reason for repeat engagement. Instead of the capsule becoming static after launch, it can remain dynamic through campaigns, rivalries, alliances, raids, and community-driven pushes for spatial expansion.",
    ],
  },
  {
    id: "technology",
    label: "Technology",
    title: "Technology and Operations",
    content: [
      "The application stack combines a Solana-based ownership layer with a web application that manages claiming, rendering, verification, and account synchronization. The backend is responsible for monitoring token balances, storing claim data, and updating risk states when a wallet falls below its supported quota.",
      "A hybrid verification system using token event monitoring and periodic reconciliation is important for reliability. It allows the project to react quickly to token movements while also maintaining a safety net that catches missed events or delayed updates.",
      "Development is intentionally lean and iterative. AI models are used as productivity tools in development and documentation, helping the project move quickly without requiring a pre-reserved team token allocation.",
    ],
  },
  {
    id: "roadmap",
    label: "Roadmap",
    title: "Roadmap",
    phases: [
      {
        phase: "Phase 1",
        title: "Launch and Core Claiming",
        text: "Launch 1BPX on Pump.fun, activate the core capsule experience, and enable users to connect wallets, acquire tokens, and claim territory according to the 1 token = 1 pixel quota rule. This phase establishes the essential market, visual, and verification logic that defines the project.",
      },
      {
        phase: "Phase 2",
        title: "Verified Participation",
        text: "Introduce stronger identity and participation tooling around the claim process, with Telegram verification becoming a recommended or integrated step for users who want to establish recognized presence inside the ecosystem.",
      },
      {
        phase: "Phase 3",
        title: "Community Formation",
        text: "As more territory is claimed, the roadmap shifts toward the social organization of area owners. Holders begin to cluster into communities, coordinate claiming strategies, and develop recognizable visual and territorial identities inside the capsule.",
      },
      {
        phase: "Phase 4",
        title: "Community vs Community",
        text: "The long-term focus is the rollout of CvC mechanics, where communities can actively compete for influence and visible dominance across the capsule — including territory contests, coordinated campaigns, competitive events, and reputation systems.",
      },
    ],
  },
  {
    id: "risks",
    label: "Risks",
    title: "Risks and Disclaimers",
    isWarning: true,
    content: [
      "1BillionPixel.fun is an experimental Web3 project and participation involves technical, market, and platform-level risks. Solana network conditions, wallet security issues, claim synchronization problems, and third-party service dependencies can all affect user experience or availability.",
      "Because 1BPX launches through Pump.fun, early trading behavior is also shaped by the dynamics of bonding curve markets, which can be volatile and highly sentiment-driven. Participants should understand that price behavior, community growth, and territory competition are emergent outcomes of open market and social activity, not guaranteed results.",
      "The token is intended strictly as a utility instrument for claiming and maintaining space within the capsule. It does not represent equity, profit rights, or a promise of future returns, and this document is informational rather than financial or legal advice.",
    ],
  },
];

// ─── shared styles ────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 20,
  padding: "1.75rem",
};

const warningPanelStyle: React.CSSProperties = {
  border: "1px solid rgba(248,113,113,0.25)",
  background: "rgba(248,113,113,0.04)",
  borderRadius: 20,
  padding: "1.75rem",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 1.25rem",
  color: "#c4b5fd",
  fontSize: "1rem",
  fontFamily: '"Press Start 2P", monospace',
  lineHeight: 1.5,
};

const warningSectionTitle: React.CSSProperties = {
  ...sectionTitle,
  color: "#fca5a5",
};

const bodyStyle: React.CSSProperties = {
  margin: "0 0 0.9rem",
  color: "rgba(255,255,255,0.58)",
  fontSize: "0.92rem",
  lineHeight: 1.9,
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const highlightBoxStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(153,69,255,0.10)",
  border: "1px solid rgba(153,69,255,0.32)",
  borderRadius: 12,
  padding: "0.6rem 1.1rem",
  marginBottom: "1.25rem",
  color: "#a78bfa",
  fontFamily: '"Press Start 2P", monospace',
  fontSize: "0.78rem",
  lineHeight: 1.6,
};

// ─── component ────────────────────────────────────────────────────────────────

export default function WhitepaperPage() {
  const tocItems = sections.map((s) => ({ id: s.id, label: s.label }));
  tocItems.push({ id: "closing", label: "Closing" });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070a",
        color: "white",
        padding: "96px 24px 64px",
      }}
    >
      <style>{`
        .toc-link {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.45rem 0.6rem;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(255,255,255,0.5);
          font-size: 0.82rem;
          font-family: monospace;
          transition: color 0.15s, background 0.15s;
        }
        .toc-link:hover {
          color: #c4b5fd;
          background: rgba(153,69,255,0.08);
        }
        .wp-cta {
          display: inline-block;
          background: #9945FF;
          color: white;
          font-family: "Press Start 2P", monospace;
          font-size: 0.7rem;
          padding: 0.9rem 2rem;
          border-radius: 12px;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: background 0.15s;
        }
        .wp-cta:hover {
          background: #7c3aed;
        }
      `}</style>

      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            Official Document
          </p>
          <h1
            style={{
              margin: "1rem 0 0.75rem",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
              lineHeight: 1.3,
            }}
          >
            White<span style={{ color: "#9945FF" }}>paper</span>
          </h1>
          <p
            style={{
              maxWidth: 680,
              margin: "0 auto 1.5rem",
              color: "rgba(255,255,255,0.50)",
              fontSize: "0.93rem",
              lineHeight: 1.85,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            A complete overview of 1BillionPixel.fun — its mechanics, vision,
            tokenomics, and long-term roadmap.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            {["$1BPX", "Solana", "Pump.fun", "Web3"].map((chip) => (
              <span
                key={chip}
                style={{
                  border: "1px solid rgba(153,69,255,0.28)",
                  background: "rgba(153,69,255,0.07)",
                  borderRadius: 9999,
                  padding: "0.3rem 0.85rem",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  color: "#c4b5fd",
                  letterSpacing: "0.06em",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        {/* ── Table of contents ────────────────────────────────────────────── */}
        <section
          style={{
            border: "1px solid rgba(153,69,255,0.18)",
            background: "rgba(153,69,255,0.04)",
            borderRadius: 20,
            padding: "1.5rem",
          }}
        >
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.7rem",
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Contents
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.35rem",
            }}
          >
            {tocItems.map((item, i) => (
              <a key={item.id} href={`#${item.id}`} className="toc-link">
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(153,69,255,0.6)",
                    minWidth: "1.4rem",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        {sections.map((s) => {
          const isWarning = (s as { isWarning?: boolean }).isWarning;
          const phases = (
            s as {
              phases?: { phase: string; title: string; text: string }[];
            }
          ).phases;

          return (
            <section
              key={s.id}
              id={s.id}
              style={{
                ...(isWarning ? warningPanelStyle : panelStyle),
                scrollMarginTop: "6rem",
              }}
            >
              <h2 style={isWarning ? warningSectionTitle : sectionTitle}>
                {s.title}
              </h2>

              {"highlight" in s && s.highlight && (
                <div style={highlightBoxStyle}>{s.highlight}</div>
              )}

              {"content" in s &&
                s.content?.map((para, i) => (
                  <p key={i} style={bodyStyle}>
                    {para}
                  </p>
                ))}

              {phases && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {phases.map((ph, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          paddingTop: "0.15rem",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: "2px solid rgba(153,69,255,0.5)",
                            background: "rgba(153,69,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.55rem",
                            fontFamily: "monospace",
                            color: "#c4b5fd",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </div>
                        {idx < phases.length - 1 && (
                          <div
                            style={{
                              width: 1,
                              flex: 1,
                              minHeight: 28,
                              background:
                                "linear-gradient(to bottom, rgba(153,69,255,0.3), rgba(153,69,255,0.05))",
                              marginTop: 4,
                            }}
                          />
                        )}
                      </div>

                      <div style={{ flex: 1, paddingBottom: "0.5rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            marginBottom: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontFamily: "monospace",
                              color: "rgba(153,69,255,0.8)",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {ph.phase}
                          </span>
                          <span
                            style={{
                              color: "#e9d5ff",
                              fontSize: "0.88rem",
                              fontWeight: 600,
                              fontFamily: "system-ui, -apple-system, sans-serif",
                            }}
                          >
                            {ph.title}
                          </span>
                        </div>
                        <p style={{ ...bodyStyle, margin: 0 }}>{ph.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* ── Closing ──────────────────────────────────────────────────────── */}
        <section
          id="closing"
          style={{
            border: "1px solid rgba(153,69,255,0.35)",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(153,69,255,0.12) 0%, rgba(153,69,255,0.03) 70%)",
            borderRadius: 20,
            padding: "2.5rem 1.75rem",
            textAlign: "center",
            scrollMarginTop: "6rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.7rem",
              fontFamily: "monospace",
              color: "rgba(153,69,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Closing Statement
          </p>
          <h2
            style={{
              margin: "0 0 1.25rem",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "clamp(0.95rem, 2.5vw, 1.3rem)",
              lineHeight: 1.5,
              color: "white",
            }}
          >
            Every Pixel Is a Statement
          </h2>
          <p
            style={{
              maxWidth: 580,
              margin: "0 auto 2rem",
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.92rem",
              lineHeight: 1.9,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            1BillionPixel.fun is an experiment in collective ownership, creative
            expression, and on-chain coordination. Every pixel is a statement.
            Every token is a commitment. We are building something
            permanent — together.
          </p>
          <a
            href="https://pump.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="wp-cta"
          >
            Claim Your Pixels →
          </a>
        </section>
      </div>
    </main>
  );
}