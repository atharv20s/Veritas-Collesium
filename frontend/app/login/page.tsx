"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, Zap, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { walletLogin, isAuthenticated, isLoading } = useAuth();
  const { connected, publicKey } = useWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loginCalled = useRef(false);

  // Trigger walletLogin as soon as wallet connects
  useEffect(() => {
    if (connected && publicKey && !loginCalled.current) {
      loginCalled.current = true;
      walletLogin(publicKey.toString());
    }
    if (!connected) {
      loginCalled.current = false;
    }
  }, [connected, publicKey, walletLogin]);

  // Redirect once authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let ps: P[] = [];
    let raf = 0;

    const make = (): P => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.3 + 0.05,
      o: Math.random() * 0.3 + 0.1,
    });

    const init = () => {
      ps = Array.from({ length: Math.floor((canvas.width * canvas.height) / 9000) }, make);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) Object.assign(p, make());
        ctx.fillStyle = `rgba(96,165,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.5);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => { setSize(); init(); };
    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="fixed inset-0 bg-[#030303] text-white overflow-hidden">
      {/* Animated grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(96,165,250,0.15) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(96,165,250,0.15) 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }}
      />

      {/* Blue particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />

      {/* Soft glow center */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(50%_50%_at_50%_50%,rgba(96,165,250,0.08),transparent_70%)]" />

      {/* Header */}
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-8 py-5 z-10 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-xs tracking-[0.2em] uppercase text-white/50 font-medium">VERITAS ENCLAVE</span>
        </div>
        <span className="text-[10px] text-white/20 tracking-widest uppercase">Solana Security Protocol</span>
      </header>

      {/* Centered card */}
      <div className="h-full w-full flex items-center justify-center px-4 relative z-20">
        <div
          className="w-full max-w-md"
          style={{
            opacity: 0,
            transform: "translateY(24px)",
            animation: "fadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.3s forwards"
          }}
        >
          <style>{`@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* Logo block */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
              <Lock className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white/90">
              Veritas
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full ml-1.5 mb-0.5" />
            </h1>
            <p className="text-sm text-white/30 mt-2">Secure your DeFi Agents. We evaluate it.</p>
          </div>

          {/* Card */}
          <div className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.07] shadow-2xl p-8 space-y-6">
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["RL Anomaly Detection", "On-chain Verification", "Instruction Introspection"].map((f) => (
                <span key={f} className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/80">
                  {f}
                </span>
              ))}
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Wallet connect button */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs text-white/30 text-center">
                Connect your Solana wallet to access the VERITAS security layer
              </p>
              <WalletMultiButton
                style={{
                  background: "rgba(255,255,255,0.9)",
                  color: "#000",
                  fontWeight: "600",
                  borderRadius: "10px",
                  fontSize: "13px",
                  padding: "12px 28px",
                  height: "auto",
                  width: "100%",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              />

              {connected && publicKey && (
                <div className="flex items-center gap-2 text-xs text-green-400/80">
                  <Zap className="w-3.5 h-3.5" />
                  Connected — redirecting to Enclave...
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06]" />

            <p className="text-[10px] text-white/15 text-center leading-relaxed">
              No backend required. Auth is derived cryptographically from your wallet signature on the Solana network.
            </p>
          </div>

          {/* Supported wallets hint */}
          <p className="text-center text-[10px] text-white/20 mt-5">
            Supports Phantom · Solflare · and all standard wallets
          </p>
        </div>
      </div>
    </section>
  );
}
