"use client";

import dynamic from "next/dynamic";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

export function AppHeader() {
  return (
    <header className="h-14 border-b flex items-center justify-end px-6">
      <UserButton />
    </header>
  );
}
