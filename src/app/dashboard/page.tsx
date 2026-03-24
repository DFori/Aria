// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <DashboardShell
      user={{
        name: session.user?.name ?? "User",
        email: session.user?.email ?? "",
        image: session.user?.image ?? undefined,
      }}
    />
  );
}
