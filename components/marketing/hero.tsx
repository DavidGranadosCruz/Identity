"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function MarketingHero() {
  const { t } = useAppPreferences();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [supportsHover, setSupportsHover] = useState(true);
  const x = useMotionValue(52);
  const y = useMotionValue(42);
  const revealTarget = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 210, damping: 28, mass: 0.5 });
  const smoothY = useSpring(y, { stiffness: 210, damping: 28, mass: 0.5 });
  const revealOpacity = useSpring(revealTarget, { stiffness: 240, damping: 30, mass: 0.5 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (supportsHover) return;
    const route = [
      [42, 38],
      [58, 40],
      [55, 56],
      [45, 62],
    ] as const;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % route.length;
      const [nx, ny] = route[index];
      x.set(nx);
      y.set(ny);
    }, 2200);
    return () => clearInterval(interval);
  }, [supportsHover, x, y]);

  const maskImage = useMotionTemplate`
    radial-gradient(196px 156px at ${smoothX}% ${smoothY}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 38%, rgba(0,0,0,0) 76%),
    radial-gradient(136px 116px at calc(${smoothX}% + 9%) calc(${smoothY}% - 8%), rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 72%),
    radial-gradient(124px 108px at calc(${smoothX}% - 10%) calc(${smoothY}% + 7%), rgba(0,0,0,0.76) 0%, rgba(0,0,0,0) 70%)
  `;

  const frameGlow = useMemo(
    () =>
      "linear-gradient(132deg, color-mix(in srgb, var(--primary) 20%, transparent), transparent 34%, color-mix(in srgb, var(--foreground) 8%, transparent) 100%)",
    [],
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-6 shadow-[0_50px_140px_-86px_rgba(2,8,23,0.55)] backdrop-blur-[22px] md:p-10">
      <div className="pointer-events-none absolute inset-0" style={{ background: frameGlow }} />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--primary)]/18 blur-[86px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[var(--foreground)]/7 blur-[92px]" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">
            <Sparkles className="size-3.5 text-[var(--primary)]" />
            {t("landing.heroBadge")}
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] md:text-6xl">
            {t("landing.heroTitle")}
          </h1>

          <p className="max-w-xl text-base text-[var(--muted-foreground)] md:text-lg">{t("landing.heroDescription")}</p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/register">{t("landing.heroPrimaryCta")}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">{t("landing.heroSecondaryCta")}</Link>
            </Button>
          </div>

          <div className="grid gap-2 pt-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-3">
            <p>{t("landing.heroPointIdentity")}</p>
            <p>{t("landing.heroPointReference")}</p>
            <p>{t("landing.heroPointResult")}</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[560px]">
          <motion.div
            ref={frameRef}
            className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-muted)]"
            onMouseEnter={() => {
              if (!supportsHover) return;
              revealTarget.set(1);
            }}
            onMouseMove={(event) => {
              if (!supportsHover) return;
              const frame = frameRef.current;
              if (!frame) return;
              const box = frame.getBoundingClientRect();
              const px = clamp(((event.clientX - box.left) / box.width) * 100, 8, 92);
              const py = clamp(((event.clientY - box.top) / box.height) * 100, 8, 92);
              x.set(px);
              y.set(py);
              revealTarget.set(1);
            }}
            onMouseLeave={() => {
              if (!supportsHover) return;
              revealTarget.set(0);
              x.set(52);
              y.set(42);
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_10%,color-mix(in_srgb,var(--primary)_17%,transparent),transparent_42%),radial-gradient(circle_at_86%_92%,color-mix(in_srgb,var(--foreground)_12%,transparent),transparent_52%)]" />
            <div className="relative aspect-[2/3] w-full">
              <Image src="/persona1.png" alt={t("generation.beforeAlt")} fill priority className="object-cover" />
              <motion.div
                style={{ WebkitMaskImage: maskImage, maskImage, opacity: revealOpacity }}
                className="absolute inset-0"
              >
                <Image src="/persona2.png" alt={t("generation.afterAlt")} fill priority className="object-cover" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
