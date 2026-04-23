"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function DashboardTopbar() {
  return (
    <header className="glass-surface sticky top-4 z-20 rounded-2xl">
      <div className="mx-auto flex h-16 w-full max-w-[1220px] items-center justify-end gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </header>
  );
}

