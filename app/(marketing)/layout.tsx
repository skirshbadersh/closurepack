import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-5 w-5 text-primary" />
          <span>ClosurePack</span>
        </Link>
        <nav className="flex items-center gap-4">
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/projects">
              <Button size="sm">Dashboard</Button>
            </Link>
          </SignedIn>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
