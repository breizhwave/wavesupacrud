import { describe, it, expect } from 'vitest';
import {
  generateDataSql,
  generateRolesSql,
  generateSchemaSql,
  quoteIdent,
  sqlLiteral,
} from '../src/data/backup.js';

describe('sqlLiteral', () => {
  it('escapes strings, passes primitives, handles null', () => {
    expect(sqlLiteral("O'Brien")).toBe("'O''Brien'");
    expect(sqlLiteral(42)).toBe('42');
    expect(sqlLiteral(true)).toBe('true');
    expect(sqlLiteral(null)).toBe('NULL');
    expect(sqlLiteral(undefined)).toBe('NULL');
    expect(sqlLiteral(NaN)).toBe('NULL');
  });

  it('serialises objects as casted json, escaping quotes inside', () => {
    expect(sqlLiteral({ a: "it's" }, { format: 'jsonb' })).toBe('\'{"a":"it\'\'s"}\'::jsonb');
    expect(sqlLiteral([1, 2], { format: 'json' })).toBe("'[1,2]'::json");
  });
});

describe('quoteIdent', () => {
  it('double-quotes and escapes identifiers', () => {
    expect(quoteIdent('posts')).toBe('"posts"');
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });
});

const schema = {
  tables: [
    {
      name: 'posts',
      primaryKey: ['id'],
      rlsEnabled: true,
      columns: [
        { name: 'id', format: 'bigint', nullable: false, isPrimaryKey: true, references: null },
        { name: 'title', format: 'text', nullable: false, references: null },
        { name: 'author_id', format: 'uuid', nullable: true, references: { table: 'authors', column: 'id' } },
        { name: 'meta', format: 'jsonb', nullable: true, references: null },
      ],
    },
  ],
};

const meta = {
  roles: [{ name: 'app_admin', login: true, superuser: false, createdb: false, createrole: false, connection_limit: -1 }],
  enums: [{ name: 'post_status', values: ['draft', 'published'] }],
  defaults: [{ table: 'posts', column: 'id', expression: "nextval('posts_id_seq'::regclass)" }],
  policies: [
    {
      table: 'posts', name: 'admin writes', command: 'insert', permissive: true,
      roles: ['authenticated'], using: null, with_check: "(auth.uid() = 'abc'::uuid)",
    },
  ],
};

describe('generateSchemaSql', () => {
  const sql = generateSchemaSql(schema, meta);

  it('emits enums, tables with defaults/not null/pk, and fks', () => {
    expect(sql).toContain("create type public.\"post_status\" as enum ('draft', 'published');");
    expect(sql).toContain('create table public."posts" (');
    expect(sql).toContain('"id" bigint not null default nextval(\'posts_id_seq\'::regclass)');
    expect(sql).toContain('primary key ("id")');
    expect(sql).toContain('foreign key ("author_id") references public."authors" ("id");');
  });

  it('emits RLS enablement and policy definitions', () => {
    expect(sql).toContain('alter table public."posts" enable row level security;');
    expect(sql).toContain(
      'create policy "admin writes" on public."posts" as permissive for insert to "authenticated" with check ((auth.uid() = \'abc\'::uuid));',
    );
  });
});

describe('generateRolesSql', () => {
  it('emits role stubs with attributes', () => {
    expect(generateRolesSql(meta)).toContain('create role "app_admin" with login;');
  });
});

describe('generateDataSql', () => {
  it('emits typed insert statements per table', () => {
    const sql = generateDataSql(schema, {
      posts: [{ id: 1, title: "it's alive", author_id: null, meta: { tags: ['a'] } }],
    });
    expect(sql).toContain(
      'insert into public."posts" ("id", "title", "author_id", "meta") values (1, \'it\'\'s alive\', NULL, \'{"tags":["a"]}\'::jsonb);',
    );
    expect(sql).toContain('-- posts: 1 row(s)');
  });

  it('notes empty tables without emitting inserts', () => {
    const sql = generateDataSql(schema, { posts: [] });
    expect(sql).toContain('-- posts: 0 row(s)');
    expect(sql).not.toContain('insert into');
  });
});
