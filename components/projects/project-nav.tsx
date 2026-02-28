"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Cylinder,
  FileUp,
  Camera,
  FileText,
  Download,
} from "lucide-react";

interface ProjectNavProps {
  projectId: string;
}

const NAV_ITEMS = [
  { label: "Overview", href: "", icon: ClipboardList },
  { label: "Tanks", href: "/tanks", icon: Cylinder },
  { label: "Artifacts", href: "/artifacts", icon: FileUp },
  { label: "Photos", href: "/photos", icon: Camera },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Export", href: "/export", icon: Download },
] as const;

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 border-b mb-6 -mx-6 px-6">
      {NAV_ITEMS.map((item) => {
        const fullPath = `${basePath}${item.href}`;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname.startsWith(fullPath);

        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={fullPath}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
