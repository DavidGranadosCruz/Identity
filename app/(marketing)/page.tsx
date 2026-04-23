"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { MarketingBenefits } from "@/components/marketing/benefits";
import { MarketingFaq } from "@/components/marketing/faq";
import { MarketingFlow } from "@/components/marketing/flow";
import { MarketingHero } from "@/components/marketing/hero";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export default function MarketingHomePage() {
  const { t } = useAppPreferences();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.76]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -48]);
  const introOpacity = useTransform(scrollYProgress, [0.2, 0.48], [0, 1]);
  const introY = useTransform(scrollYProgress, [0.2, 0.48], [26, 0]);

  return (
    <>
      <section ref={trackRef} className="relative h-[190vh] md:h-[175vh]">
        <div className="sticky top-20 space-y-6">
          <motion.div style={{ scale: heroScale, y: heroY }}>
            <MarketingHero />
          </motion.div>

          <motion.div
            style={{ opacity: introOpacity, y: introY }}
            className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)]/84 p-5 text-center backdrop-blur-[16px]"
          >
            <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {t("landing.storyIntroTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t("landing.storyIntroBody")}</p>
          </motion.div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t("landing.howItWorks")}</h2>
        <MarketingFlow />
      </section>

      <section className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t("landing.whyIdentity")}</h2>
        <MarketingBenefits />
      </section>

      <section className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t("landing.faq")}</h2>
        <MarketingFaq />
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[0_36px_120px_-70px_rgba(2,8,23,0.52)] backdrop-blur-[20px]">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h3 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t("landing.ctaTitle")}</h3>
          <p className="text-sm text-[var(--muted-foreground)] md:text-base">{t("landing.ctaDescription")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/register">{t("landing.ctaPrimary")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/generation-history">{t("landing.ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
