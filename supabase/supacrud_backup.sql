-- Supacrud backup metadata function.
--
-- Provides what the browser cannot introspect through PostgREST: role
-- attributes, RLS policy definitions, and column default expressions.
-- The Backup button combines this with the schema RPC and paged data
-- fetches to produce modular roles/schema/data .sql files.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → Run),
-- like supacrud_schema.sql.
--
-- Security notes:
--   * authenticated-only, like supacrud_schema(); reveals structure and
--     policy expressions, never table data — data still goes through RLS.
--   * Role attributes only (no passwords — Postgres never exposes them).

create or replace function public.supacrud_backup_meta()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'roles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', rolname,
        'login', rolcanlogin,
        'superuser', rolsuper,
        'createdb', rolcreatedb,
        'createrole', rolcreaterole,
        'connection_limit', rolconnlimit
      ) order by rolname), '[]'::jsonb)
      from pg_catalog.pg_roles
      where rolname not like 'pg\_%'
    ),
    'enums', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', t.typname,
        'values', (
          select jsonb_agg(en.enumlabel order by en.enumsortorder)
          from pg_catalog.pg_enum en where en.enumtypid = t.oid
        )
      ) order by t.typname), '[]'::jsonb)
      from pg_catalog.pg_type t
      join pg_catalog.pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e'
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', pc.relname,
        'name', pol.polname,
        'command', case pol.polcmd
          when 'r' then 'select' when 'a' then 'insert'
          when 'w' then 'update' when 'd' then 'delete' else 'all' end,
        'permissive', pol.polpermissive,
        'roles', (
          select jsonb_agg(coalesce(pr.rolname, 'public'))
          from unnest(pol.polroles) r(oid)
          left join pg_catalog.pg_roles pr on pr.oid = r.oid
        ),
        'using', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
        'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
      ) order by pc.relname, pol.polname), '[]'::jsonb)
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class pc on pc.oid = pol.polrelid
      join pg_catalog.pg_namespace pn on pn.oid = pc.relnamespace
      where pn.nspname = 'public'
    ),
    'defaults', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'column', a.attname,
        'expression', pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)
      )), '[]'::jsonb)
      from pg_catalog.pg_attrdef ad
      join pg_catalog.pg_class c on c.oid = ad.adrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = ad.adrelid and a.attnum = ad.adnum
      where n.nspname = 'public' and c.relkind = 'r'
    )
  )
$$;

revoke all on function public.supacrud_backup_meta() from public;
revoke all on function public.supacrud_backup_meta() from anon;
grant execute on function public.supacrud_backup_meta() to authenticated;
