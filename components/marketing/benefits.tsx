"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function MarketingBenefits() {
  const { t } = useAppPreferences();
  const benefits = [
    t("landing.benefit1"),
    t("landing.benefit2"),
    t("landing.benefit3"),
    t("landing.benefit4"),
    t("landing.benefit5"),
    t("landing.benefit6"),
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {benefits.map((benefit, index) => (
        <motion.div
          key={benefit}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.34, delay: index * 0.04 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="rounded-full bg-[var(--surface-muted)] p-1 text-[var(--primary)]">
                  <Check className="size-4" />
                </span>
                {benefit}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">{t("landing.benefitDefault")}</CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
