"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const NAV_LINKS = ["Features"];

export function FloatingNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrolled(window.scrollY > 60);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-pill::before{content:"";position:absolute;top:0;left:16px;right:16px;height:1px;background:rgba(255,255,255,0.18);border-radius:999px;pointer-events:none}
        .nav-link{position:relative;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.55);letter-spacing:0.02em;cursor:pointer;transition:color 0.2s ease;padding:4px 0;text-decoration:none;background:none;border:none}
        .nav-link:hover{color:#fff}
        .nav-link::after{content:"";position:absolute;bottom:-2px;left:50%;width:0;height:1.5px;background:rgba(255,255,255,0.50);border-radius:1px;transform:translateX(-50%);transition:width 0.25s ease}
        .nav-link:hover::after{width:100%}
        .nb-btn-login{background:transparent;border:1px solid rgba(255,255,255,0.20);color:rgba(255,255,255,0.80);border-radius:999px;padding:8px 18px;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:border-color 0.2s ease,color 0.2s ease,background 0.2s ease}
        .nb-btn-login:hover{border-color:rgba(255,255,255,0.40);color:#fff;background:rgba(255,255,255,0.05)}
        .nb-btn-signup{background:#fff;color:#0a0a14;border:none;border-radius:999px;padding:8px 20px;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s ease,transform 0.15s ease}
        .nb-btn-signup:hover{background:rgba(255,255,255,0.88);transform:scale(1.02)}
        .nb-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
        .nb-hamburger span{display:block;width:20px;height:1.5px;background:rgba(255,255,255,0.70);border-radius:1px;transition:transform 0.3s ease,opacity 0.3s ease}
        .nb-hamburger.open span:nth-child(1){transform:rotate(45deg) translate(4.5px,4.5px)}
        .nb-hamburger.open span:nth-child(2){opacity:0}
        .nb-hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(4.5px,-4.5px)}
        @media(max-width:767px){.nb-center-links{display:none!important}.nb-desktop-buttons{display:none!important}.nb-hamburger{display:flex}}
        .nb-mobile-overlay{position:fixed;inset:0;z-index:9998;background:rgba(5,5,15,0.92);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;opacity:0;pointer-events:none;transition:opacity 0.3s ease}
        .nb-mobile-overlay.open{opacity:1;pointer-events:auto}
        .nb-mobile-overlay button.nb-mob-link{font-family:Inter,system-ui,sans-serif;font-size:18px;font-weight:500;color:rgba(255,255,255,0.70);background:none;border:none;cursor:pointer;letter-spacing:0.02em;transition:color 0.2s ease}
        .nb-mobile-overlay button.nb-mob-link:hover{color:#fff}
      ` }} />

      <nav
        className="nav-pill"
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "32px",
          minWidth: "640px",
          maxWidth: "90vw",
          height: "56px",
          borderRadius: "999px",
          padding: "0 8px 0 24px",
          background: scrolled ? "rgba(10, 10, 20, 0.65)" : "rgba(10, 10, 20, 0.45)",
          backdropFilter: scrolled ? "blur(36px) saturate(180%)" : "blur(28px) saturate(180%)",
          WebkitBackdropFilter: scrolled ? "blur(36px) saturate(180%)" : "blur(28px) saturate(180%)",
          border: scrolled ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexShrink: 0 }}
          onClick={() => router.push("/landing")}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#00F5C4",
              boxShadow: "0 0 8px rgba(0, 245, 196, 0.5)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "0.10em",
              color: "rgba(255, 255, 255, 0.90)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Veritas
          </span>
        </div>

        <div className="nb-center-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {NAV_LINKS.map((label) => (
            <span
              key={label}
              className="nav-link"
              onClick={() => {
                const id = label.toLowerCase().replace(/\s+/g, "-");
                const el = document.getElementById(id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="nb-desktop-buttons" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button className="nb-btn-login" onClick={() => router.push("/")}>Dashboard</button>
        </div>

        <button
          className={`nb-hamburger ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      <div className={`nb-mobile-overlay ${mobileMenuOpen ? "open" : ""}`}>
        {NAV_LINKS.map((label) => (
          <button key={label} className="nb-mob-link" onClick={() => {
            setMobileMenuOpen(false);
            const id = label.toLowerCase().replace(/\s+/g, "-");
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}>
            {label}
          </button>
        ))}
        <div style={{ width: "60px", height: "1px", background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />
        <button className="nb-btn-login" style={{ fontSize: "16px", padding: "12px 32px" }}
          onClick={() => { setMobileMenuOpen(false); router.push("/"); }}>Dashboard</button>
      </div>
    </>
  );
}
