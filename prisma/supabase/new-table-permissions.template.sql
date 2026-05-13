-- Supabase Data API permissions template for new public-schema tables.
-- Prefer regenerating prisma/supabase/public-schema-permissions.sql with:
--   npm run db:permissions:generate
--
-- For raw SQL migrations, paste the matching block below immediately after
-- CREATE TABLE and replace table_name plus the policy predicates.

-- Public-facing content table: anon may read published/public rows only.
grant usage on schema public to anon, authenticated, service_role;

revoke all on table public.table_name from public;
revoke all on table public.table_name from anon;
revoke all on table public.table_name from authenticated;

grant select on table public.table_name to anon;
grant select, insert, update, delete on table public.table_name to authenticated;
grant select, insert, update, delete on table public.table_name to service_role;

alter table public.table_name enable row level security;

drop policy if exists anon_select_public_table_name on public.table_name;
create policy anon_select_public_table_name
on public.table_name
as permissive
for select
to anon
using (is_public = true);

drop policy if exists authenticated_select_public_table_name on public.table_name;
create policy authenticated_select_public_table_name
on public.table_name
as permissive
for select
to authenticated
using (is_public = true);

drop policy if exists service_role_all_table_name on public.table_name;
create policy service_role_all_table_name
on public.table_name
as permissive
for all
to service_role
using (true)
with check (true);

-- ERP/business table: no anon grant; authenticated policies must be row-scoped.
grant usage on schema public to anon, authenticated, service_role;

revoke all on table public.table_name from public;
revoke all on table public.table_name from anon;
revoke all on table public.table_name from authenticated;

grant select, insert, update, delete on table public.table_name to authenticated;
grant select, insert, update, delete on table public.table_name to service_role;

alter table public.table_name enable row level security;

-- Keep authenticated users denied until there is a real ownership/permission
-- predicate. Example only:
-- create policy authenticated_select_own_table_name
-- on public.table_name
-- as permissive
-- for select
-- to authenticated
-- using (owner_id = auth.uid());

drop policy if exists service_role_all_table_name on public.table_name;
create policy service_role_all_table_name
on public.table_name
as permissive
for all
to service_role
using (true)
with check (true);
