import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectivePlanSlug } from "@/lib/membership";
import { planBySlug, type PlanSlug } from "@/lib/plans";

/** Unique paid tiers the member activated (purchase history), lowest → highest. */
export async function getStackedPlanSlugsForEarnings(
  userId: string,
): Promise<PlanSlug[]> {
  const admin = createAdminClient();
  const { data: purchases } = await admin
    .from("wallet_ledger")
    .select("reference_id")
    .eq("user_id", userId)
    .eq("entry_type", "plan_purchase")
    .order("created_at", { ascending: true });

  const seen = new Set<PlanSlug>();
  const slugs: PlanSlug[] = [];
  for (const row of purchases ?? []) {
    const slug = (row.reference_id ?? "") as PlanSlug;
    const plan = planBySlug(slug);
    if (!plan || plan.pricePhp <= 0 || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }

  if (slugs.length > 0) {
    slugs.sort(
      (a, b) =>
        (planBySlug(a)?.episodesPerDay ?? 0) -
        (planBySlug(b)?.episodesPerDay ?? 0),
    );
    return slugs;
  }

  const effective = await getEffectivePlanSlug(userId);
  return [effective];
}

export function maxDailyEpisodesForStack(slugs: PlanSlug[]): number {
  if (slugs.length === 0) return 0;
  return Math.max(...slugs.map((s) => planBySlug(s)?.episodesPerDay ?? 0));
}
