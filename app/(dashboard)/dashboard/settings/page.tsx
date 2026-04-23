import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/dashboard/new-recreation?panel=defaults");
}
