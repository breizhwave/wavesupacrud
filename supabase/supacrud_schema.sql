-- Supacrud schema introspection function.
--
-- Newer Supabase projects restrict the PostgREST OpenAPI endpoint
-- (GET /rest/v1/) to the service_role key, which Supacrud never uses.
-- This function exposes the same table/column metadata to *authenticated*
-- users via RPC instead. Run it once in the Supabase SQL editor
-- (Dashboard → SQL Editor → paste → Run).
--
-- Security notes:
--   * SECURITY DEFINER so it can read pg_catalog consistently, with an
--     empty search_path (pg_catalog is always implicitly searched).
--   * Execution is revoked from anon: only signed-in users can list the
--     schema, and it reveals structure only — data access still goes
--     through RLS as usual.

create or replace function public.supacrud_schema()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(tbl order by tbl->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'name', cls.relname,
      'rls_enabled', cls.relrowsecurity,
      -- true when at least one SELECT (or ALL) policy applies to signed-in
      -- users; lets the UI say "RLS is blocking reads" instead of showing
      -- an unexplained empty table. polroles = {0} means PUBLIC.
      'has_select_policy', exists (
        select 1
        from pg_catalog.pg_policy pol
        where pol.polrelid = cls.oid
          and pol.polcmd in ('r', '*')
          and (0 = any (pol.polroles)
               or 'authenticated'::regrole::oid = any (pol.polroles))
      ),
      'columns', (
        select jsonb_agg(jsonb_build_object(
          'name', att.attname,
          'format', pg_catalog.format_type(att.atttypid, att.atttypmod),
          'is_nullable', not att.attnotnull,
          'has_default', att.atthasdef or att.attidentity <> '' or att.attgenerated <> '',
          'is_pk', exists (
            select 1 from pg_catalog.pg_index idx
            where idx.indrelid = cls.oid
              and idx.indisprimary
              and att.attnum = any (idx.indkey)
          ),
          'enum_values', (
            select jsonb_agg(enm.enumlabel order by enm.enumsortorder)
            from pg_catalog.pg_enum enm
            where enm.enumtypid = att.atttypid
          ),
          'references', (
            select jsonb_build_object('table', rcls.relname, 'column', ratt.attname)
            from pg_catalog.pg_constraint con
            join pg_catalog.pg_class rcls on rcls.oid = con.confrelid
            join pg_catalog.pg_attribute ratt
              on ratt.attrelid = con.confrelid
             and ratt.attnum = con.confkey[pg_catalog.array_position(con.conkey, att.attnum)]
            where con.conrelid = cls.oid
              and con.contype = 'f'
              and att.attnum = any (con.conkey)
            limit 1
          )
        ) order by att.attnum)
        from pg_catalog.pg_attribute att
        where att.attrelid = cls.oid
          and att.attnum > 0
          and not att.attisdropped
      )
    ) as tbl
    from pg_catalog.pg_class cls
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relkind = 'r'
  ) tables
$$;

revoke all on function public.supacrud_schema() from public;
revoke all on function public.supacrud_schema() from anon;
grant execute on function public.supacrud_schema() to authenticated;
