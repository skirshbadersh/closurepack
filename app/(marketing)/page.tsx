import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <Package className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        UST Closure Packages, Done Right
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mb-8">
        Assemble submission-ready closure packages for California CUPAs.
        Guided workflow, document generation, and completeness validation.
      </p>
      <div className="flex gap-4">
        <Link href="/sign-up">
          <Button size="lg">Get Started Free</Button>
        </Link>
        <Link href="/sign-in">
          <Button variant="outline" size="lg">
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
