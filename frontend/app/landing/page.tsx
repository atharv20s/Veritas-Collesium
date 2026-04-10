"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Shield, Lock, Activity, Cpu, GitBranch, Layers,
} from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Instruction Introspection",
    description: "Parses raw Solana instruction buffers from Jupiter, Raydium, and other DEX routers in real-time to enforce slippage and liquidity constraints before signing.",
  },
  {
    icon: Cpu,
    title: "Multi-Model RL Ensemble",
    description: "Three reinforcement learning architectures (TD3, SAC, PPO) run in parallel with weighted voting to detect anomalous DeFi transactions with zero false negatives.",
  },
  {
    icon: Lock,
    title: "On-Chain Policy Enforcement",
    description: "Anchor smart contracts enforce security policies directly on Solana. Vault-level constraints are immutable and verifiable by any participant.",
  },
  {
    icon: GitBranch,
    title: "Transaction Flow Graph",
    description: "Maps every transaction through the Sentinel pipeline: Agent to Enclave to DEX Router to Target Token. Visualize attack vectors before they execute.",
  },
  {
    icon: Activity,
    title: "Real-Time Risk Scoring",
    description: "Sub-second anomaly detection across token age, liquidity depth, slippage tolerance, and honeypot contract patterns. Every trade is scored before execution.",
  },
  {
    icon: Layers,
    title: "Defense-in-Depth Architecture",
    description: "Rule-based pre-screening, whitelist enforcement, and AI-based anomaly detection operate as independent layers. No single point of failure.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { connected } = useWallet();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <div style={{ background: "#000000" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: "@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}" }} />

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <FloatingNavbar />
        <DottedSurface className="size-full" />

        {/* Noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            opacity: 0.025,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Ambient orb */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(0,245,196,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            paddingBottom: "20vh",
          }}
        >
          <h1
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontSize: "clamp(56px, 9vw, 104px)",
              fontWeight: 800,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              lineHeight: 1.0,
              textAlign: "center",
              width: "100%",
              textShadow: [
                "0 2px 4px rgba(0, 0, 0, 0.5)",
                "0 4px 12px rgba(0, 0, 0, 0.3)",
                "0 0 60px rgba(96, 165, 250, 0.10)",
                "0 0 120px rgba(96, 165, 250, 0.05)",
              ].join(", "),
              margin: 0,
              padding: "0 20px",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            VERITAS
          </h1>

          <p
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontSize: "clamp(12px, 1.4vw, 16px)",
              fontWeight: 400,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.30)",
              marginTop: "12px",
              textTransform: "uppercase",
              textAlign: "center",
              width: "100%",
              pointerEvents: "none",
            }}
          >
            Secure your DeFi agents. We evaluate it.
          </p>

          {/* Wallet Connect + Enter App */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "36px",
              pointerEvents: "auto",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => router.push("/")}
              style={{
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                background: "rgba(255,255,255,0.9)",
                color: "#000",
                border: "none",
                borderRadius: "10px",
                padding: "12px 32px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#fff"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.9)"; }}
            >
              Launch Dashboard
            </button>
            <WalletMultiButton
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
                fontWeight: "500",
                borderRadius: "10px",
                fontSize: "13px",
                padding: "12px 24px",
                height: "auto",
                transition: "all 0.2s",
              }}
            />
          </div>

          {connected && (
            <p style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "10px",
              color: "rgba(0,245,196,0.5)",
              marginTop: "12px",
              letterSpacing: "0.08em",
              pointerEvents: "none",
            }}>
              WALLET CONNECTED
            </p>
          )}
        </div>

        {/* Bottom hint */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "24px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            zIndex: 10,
          }}
        >
          PRESS D FOR DASHBOARD
          <span
            style={{
              display: "inline-block",
              width: "1px",
              height: "12px",
              background: "rgba(255,255,255,0.30)",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          position: "relative",
          padding: "120px 24px 100px",
          maxWidth: "1100px",
          margin: "0 auto",
          scrollMarginTop: "80px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              letterSpacing: "0.25em",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            What powers VERITAS
          </p>
          <h2
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Hardware-secured, RL-optimized
            <br />
            <span style={{ color: "rgba(255,255,255,0.40)" }}>autonomy for AI agent wallets.</span>
          </h2>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                style={{
                  background: "rgba(10, 10, 20, 0.92)",
                  backdropFilter: "blur(40px) saturate(130%)",
                  WebkitBackdropFilter: "blur(40px) saturate(130%)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "16px",
                  padding: "32px 28px",
                  transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
                  cursor: "default",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.18)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(15, 15, 28, 0.95)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.10)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(10, 10, 20, 0.92)";
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(96, 165, 250, 0.08)",
                    border: "1px solid rgba(96, 165, 250, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <Icon style={{ width: "18px", height: "18px", color: "rgba(96, 165, 250, 0.70)" }} />
                </div>
                <h3
                  style={{
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.65)",
                    margin: 0,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
