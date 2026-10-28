-- profiles_update_own lets a member update their own row, but without column
-- grants that includes plan_slug, subscription_ends_at, ads_points, xp,
-- agent_status, drama_access_ends_at, referred_by... straight from the browser.
-- Members may only edit their display name and avatar; everything else is
-- written server-side with the service role.

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;
