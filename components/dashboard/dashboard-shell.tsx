"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6 lg:px-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
