import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/80 bg-black/60 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold text-zinc-100">
          Identity
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/login" className="hover:text-zinc-100">
            Login
          </Link>
          <Link href="/register" className="hover:text-zinc-100">
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

