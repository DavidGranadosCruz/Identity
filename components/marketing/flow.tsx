"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function MarketingFlow() {
  const { t } = useAppPreferences();
  const steps = [
    { title: t("landing.flowTitle1"), description: t("landing.flowDescription1") },
    { title: t("landing.flowTitle2"), description: t("landing.flowDescription2") },
    { title: t("landing.flowTitle3"), description: t("landing.flowDescription3") },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.36, delay: index * 0.08 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>{t("landing.flowFoot")}</span>
              <ArrowRight className="size-4 text-[var(--muted)]" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
