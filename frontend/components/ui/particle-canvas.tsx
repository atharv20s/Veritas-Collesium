"use client";

import { useEffect, useRef } from "react";

interface ParticleCanvasProps {
  disableCursor?: boolean;
}

export function ParticleCanvas({ disableCursor = false }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current!;
    if (!c) return;

    const ctx = c.getContext("2d")!;
    let animId: number;
    let halfW: number;
    let halfH: number;
    let diagonal: number;

    const resizeCanvas = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      halfW = c.width / 2;
      halfH = c.height / 2;
      diagonal = Math.sqrt(halfW * halfW + halfH * halfH);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const TAU = Math.PI * 2;
    const sq = (x: number) => x * x;

    const opts = {
      particles: 280,
      baseSize: 3,
      addedSize: 2,
      maxSize: 6,
      baseLight: 5,
      addedLight: 25,
      baseAngSpeed: 0.0008,
      addedAngSpeed: 0.0012,
      baseVariedAng: 0.0004,
      addedVariedAng: 0.0006,
      // Attractor orbits wide — near the screen edges
      srcBaseAng: -0.008,
      srcVariedAng: 0.004,
      srcBaseDist: 350,
      srcVariedDist: 150,
      colorTpl: "hsla(hue,80%,light%,0.8)",
    };

    let tick = 0;

    // Source attractor — orbits wide
    const source = {
      x: 0, y: 0,
      rad: Math.random() * TAU,
      mouseControlled: false,
      step() {
        if (!this.mouseControlled) {
          const ang = opts.srcBaseAng + Math.sin(this.rad * 6 + tick / 100) * opts.srcVariedAng;
          this.rad += ang;
          const dist = opts.srcBaseDist + Math.sin(this.rad * 5 + tick / 100) * opts.srcVariedDist;
          this.x = dist * Math.cos(this.rad);
          this.y = dist * Math.sin(this.rad);
        }
      },
    };

    // Particle type
    interface P {
      dist: number;
      rad: number;
      baseAng: number;
      variedAng: number;
      size: number;
    }
    const particles: P[] = [];

    function makeParticle(): P {
      // Bias distribution toward edges: use pow to push particles outward
      // Mix of edge-biased and uniform particles
      const edgeBias = Math.random() < 0.6;
      let dist: number;
      if (edgeBias) {
        // Pow bias — more particles at larger radii
        dist = (0.3 + Math.pow(Math.random(), 0.6) * 0.7) * diagonal;
      } else {
        // Some near center too for depth
        dist = Math.random() * diagonal * 0.5;
      }

      return {
        dist,
        rad: Math.random() * TAU,
        baseAng: opts.baseAngSpeed + opts.addedAngSpeed * Math.random(),
        variedAng: opts.baseVariedAng + opts.addedVariedAng * Math.random(),
        size: opts.baseSize + opts.addedSize * Math.random(),
      };
    }

    function stepParticle(p: P) {
      p.rad += p.baseAng + p.variedAng * Math.sin(p.rad * 7 + tick / 100);
      const x = p.dist * Math.cos(p.rad);
      const y = p.dist * Math.sin(p.rad);
      const sqDist = sq(x - source.x) + sq(y - source.y);
      const sizeProp = Math.sqrt(diagonal) / Math.sqrt(Math.max(sqDist, 1));

      ctx.fillStyle = opts.colorTpl
        .replace("hue", String((p.rad / TAU) * 360 + tick))
        .replace("light", String(opts.baseLight + Math.min(sizeProp, 3) * opts.addedLight));
      ctx.beginPath();
      ctx.arc(x, y, Math.min(p.size * Math.min(sizeProp, 2), opts.maxSize), 0, TAU);
      ctx.fill();
    }

    function anim() {
      animId = requestAnimationFrame(anim);
      tick++;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,.1)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "lighter";

      if (particles.length < opts.particles) particles.push(makeParticle());

      ctx.save();
      ctx.translate(halfW, halfH);
      source.step();
      particles.forEach(stepParticle);
      ctx.restore();
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    anim();

    const onMove = (e: MouseEvent) => {
      if (disableCursor) return;
      const r = c.getBoundingClientRect();
      source.x = e.clientX - r.left - halfW;
      source.y = e.clientY - r.top - halfH;
      source.mouseControlled = true;
    };
    const onLeave = (e: MouseEvent) => {
      if (disableCursor) return;
      const r = c.getBoundingClientRect();
      source.x = e.clientX - r.left - halfW;
      source.y = e.clientY - r.top - halfH;
      source.rad = Math.atan2(source.y, source.x);
      source.mouseControlled = false;
    };

    if (!disableCursor) {
      c.addEventListener("mousemove", onMove);
      c.addEventListener("mouseleave", onLeave);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      c.removeEventListener("mousemove", onMove);
      c.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animId);
    };
  }, [disableCursor]);

  return <canvas ref={canvasRef} className="w-full h-full bg-black block" />;
}
