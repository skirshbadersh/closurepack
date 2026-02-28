import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { ensureUser } from "@/lib/auth/ensure-user";

// All app routes require auth + DB access at runtime — never prerender
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await ensureUser();

  // If ensureUser returns null, the user isn't authenticated
  // (shouldn't happen since middleware protects these routes, but just in case)
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
