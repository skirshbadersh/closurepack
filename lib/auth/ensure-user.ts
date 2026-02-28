"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/types";

/**
 * Ensures the current Clerk user has a matching row in the users table.
 * If not, creates a tenant and user row automatically (first-time setup).
 *
 * Returns the user row or null if not authenticated.
 */
export async function ensureUser(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = createAdminClient();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (existingUser) return existingUser as User;

  // First-time user — create tenant + user
  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? "unknown@example.com";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  // Create a slug from the name (lowercase, hyphenated, with random suffix)
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: `${name}'s Workspace`, slug })
    .select()
    .single();

  if (tenantError) {
    console.error("Failed to create tenant:", tenantError.message);
    return null;
  }

  // Create user linked to tenant
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      tenant_id: tenant.id,
      clerk_id: clerkUser.id,
      email,
      role: "admin",
    })
    .select()
    .single();

  if (userError) {
    console.error("Failed to create user:", userError.message);
    // Clean up orphaned tenant
    await supabase.from("tenants").delete().eq("id", tenant.id);
    return null;
  }

  return newUser as User;
}
