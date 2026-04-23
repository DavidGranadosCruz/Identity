import * as React from "react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-[1320px] space-y-16 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        {children}
      </main>
    </div>
  );
}



