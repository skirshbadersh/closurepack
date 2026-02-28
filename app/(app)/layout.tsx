import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AppSidebar } from "@/components/app-sidebar";
import { ensureUser } from "@/lib/auth/ensure-user";

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
        <header className="h-14 border-b flex items-center justify-end px-6">
          <UserButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
