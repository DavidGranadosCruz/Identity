import * as React from "react";
import { BackHomeLink } from "@/components/auth/back-home-link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-transparent px-6">
      <div className="w-full max-w-md space-y-6">
        <BackHomeLink />
        {children}
      </div>
    </div>
  );
}
