import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export async function auth() {
  return getServerSession(authOptions);
}

