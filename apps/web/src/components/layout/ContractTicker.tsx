"use client";
import { useState } from "react";

const CA = "FaWMZQd1JjNn74DxTvdtfeF3N6B3Z7wZRKfKeskqpump";

const SEPARATOR = "◆";

const items = Array(8).fill(null).map((_, i) => (
  `CA: ${CA}`
));

export function ContractTicker() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="ticker-wrap" onClick={handleCopy} title="Click to copy CA">
        <div className="ticker-track">
          {[...Array(2)].map((_, gi) => (
            <span key={gi} className="ticker-group">
              {Array(6).fill(null).map((_, i) => (
                <span key={i} className="ticker-item">
                  <span className="ticker-label">CA</span>
                  <span className="ticker-ca">{CA}</span>
                  <span className="ticker-sep">{SEPARATOR}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        {copied && <span className="ticker-copied">Copied!</span>}
      </div>

      <style>{`
        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          top: 55px;
          background: rgba(20, 241, 149, 0.06);
          border-bottom: 1px solid rgba(20, 241, 149, 0.15);
          height: 28px;
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
          user-select: none;
        }
        .ticker-wrap:hover {
          background: rgba(20, 241, 149, 0.1);
        }
        .ticker-track {
          display: flex;
          white-space: nowrap;
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-wrap:hover .ticker-track {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-group {
          display: inline-flex;
          align-items: center;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 24px;
          font-family: monospace;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }
        .ticker-label {
          color: #14F195;
          font-weight: 700;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
        }
        .ticker-ca {
          color: rgba(255,255,255,0.75);
        }
        .ticker-sep {
          color: rgba(20, 241, 149, 0.4);
          font-size: 0.5rem;
        }
        .ticker-copied {
          position: absolute;
          right: 12px;
          background: #14F195;
          color: #000;
          font-family: monospace;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}