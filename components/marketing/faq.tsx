"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function MarketingFaq() {
  const { t } = useAppPreferences();
  const faq = [
    { q: t("landing.faqQ1"), a: t("landing.faqA1") },
    { q: t("landing.faqQ2"), a: t("landing.faqA2") },
    { q: t("landing.faqQ3"), a: t("landing.faqA3") },
    { q: t("landing.faqQ4"), a: t("landing.faqA4") },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {faq.map((item, index) => (
        <motion.div
          key={item.q}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">{item.a}</CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
