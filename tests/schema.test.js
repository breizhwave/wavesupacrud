import { describe, it, expect } from 'vitest';
import { parseOpenApi, parseRpcSchema, primaryKey } from '../src/core/schema.js';

const spec = {
  definitions: {
    posts: {
      required: ['id', 'title'],
      properties: {
        id: {
          type: 'integer',
          format: 'bigint',
          default: "nextval('posts_id_seq'::regclass)",
          description: 'Note:\nThis is a Primary Key.<pk/>',
        },
        title: { type: 'string', format: 'text' },
        status: { type: 'string', format: 'public.post_status', enum: ['draft', 'published'] },
        author_id: {
          type: 'integer',
          format: 'bigint',
          description: 'Note:\nThis is a Foreign Key to `authors.id`.<fk table=\'authors\' column=\'id\'/>',
        },
        published_at: { type: 'string', format: 'timestamp with time zone' },
      },
    },
    authors: {
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Note:\nThis is a Primary Key.<pk/>' },
        name: { type: 'string', format: 'text' },
      },
    },
    secrets: {
      properties: { id: { type: 'integer' } },
    },
  },
};

describe('parseOpenApi', () => {
  it('parses tables sorted by name', () => {
    const schema = parseOpenApi(spec);
    expect(schema.tables.map((t) => t.name)).toEqual(['authors', 'posts', 'secrets']);
  });

  it('filters hidden tables from config', () => {
    const schema = parseOpenApi(spec, { hiddenTables: ['secrets'] });
    expect(schema.tables.map((t) => t.name)).toEqual(['authors', 'posts']);
  });

  it('detects primary keys', () => {
    const posts = parseOpenApi(spec).tables.find((t) => t.name === 'posts');
    expect(posts.primaryKey).toEqual(['id']);
    expect(primaryKey(posts)).toBe('id');
  });

  it('falls back to "id" when no pk is marked', () => {
    const secrets = parseOpenApi(spec).tables.find((t) => t.name === 'secrets');
    expect(primaryKey(secrets)).toBe('id');
  });

  it('parses foreign key references from descriptions', () => {
    const posts = parseOpenApi(spec).tables.find((t) => t.name === 'posts');
    const authorId = posts.columns.find((c) => c.name === 'author_id');
    expect(authorId.references).toEqual({ table: 'authors', column: 'id' });
  });

  it('captures enum values', () => {
    const posts = parseOpenApi(spec).tables.find((t) => t.name === 'posts');
    const status = posts.columns.find((c) => c.name === 'status');
    expect(status.enumValues).toEqual(['draft', 'published']);
  });

  it('treats required columns with defaults as not required for forms', () => {
    const posts = parseOpenApi(spec).tables.find((t) => t.name === 'posts');
    expect(posts.columns.find((c) => c.name === 'id').required).toBe(false);
    expect(posts.columns.find((c) => c.name === 'id').hasDefault).toBe(true);
    expect(posts.columns.find((c) => c.name === 'title').required).toBe(true);
  });
});

const rpcPayload = [
  {
    name: 'posts',
    rls_enabled: true,
    has_select_policy: false,
    columns: [
      { name: 'id', format: 'bigint', is_nullable: false, has_default: true, is_pk: true, enum_values: null, references: null },
      { name: 'title', format: 'character varying(255)', is_nullable: false, has_default: false, is_pk: false, enum_values: null, references: null },
      { name: 'status', format: 'post_status', is_nullable: true, has_default: false, is_pk: false, enum_values: ['draft', 'published'], references: null },
      { name: 'author_id', format: 'uuid', is_nullable: true, has_default: false, is_pk: false, enum_values: null, references: { table: 'authors', column: 'id' } },
      { name: 'meta', format: 'jsonb', is_nullable: true, has_default: false, is_pk: false, enum_values: null, references: null },
      { name: 'views', format: 'integer', is_nullable: true, has_default: false, is_pk: false, enum_values: null, references: null },
      { name: 'is_live', format: 'boolean', is_nullable: true, has_default: false, is_pk: false, enum_values: null, references: null },
    ],
  },
  { name: 'authors', rls_enabled: true, has_select_policy: true, columns: [{ name: 'id', format: 'uuid', is_nullable: false, has_default: true, is_pk: true, enum_values: null, references: null }] },
];

describe('parseRpcSchema', () => {
  const schema = parseRpcSchema(rpcPayload);
  const posts = schema.tables.find((t) => t.name === 'posts');
  const col = (name) => posts.columns.find((c) => c.name === name);

  it('produces the same table shape as parseOpenApi, sorted by name', () => {
    expect(schema.tables.map((t) => t.name)).toEqual(['authors', 'posts']);
    expect(posts.primaryKey).toEqual(['id']);
  });

  it('maps Postgres type names to JSON types and strips length modifiers', () => {
    expect(col('id').type).toBe('integer');
    expect(col('views').type).toBe('integer');
    expect(col('is_live').type).toBe('boolean');
    expect(col('title').type).toBe('string');
    expect(col('title').format).toBe('character varying');
  });

  it('carries required/default/pk/enum/fk facts through', () => {
    expect(col('id').required).toBe(false);
    expect(col('title').required).toBe(true);
    expect(col('status').enumValues).toEqual(['draft', 'published']);
    expect(col('author_id').references).toEqual({ table: 'authors', column: 'id' });
  });

  it('carries RLS visibility facts through, and marks them unknown for OpenAPI', () => {
    expect(posts.rlsEnabled).toBe(true);
    expect(posts.hasSelectPolicy).toBe(false);
    expect(schema.tables.find((t) => t.name === 'authors').hasSelectPolicy).toBe(true);
    const viaOpenApi = parseOpenApi(spec).tables[0];
    expect(viaOpenApi.rlsEnabled).toBeNull();
    expect(viaOpenApi.hasSelectPolicy).toBeNull();
  });

  it('respects hiddenTables and tolerates an empty payload', () => {
    expect(parseRpcSchema(rpcPayload, { hiddenTables: ['authors'] }).tables.map((t) => t.name)).toEqual(['posts']);
    expect(parseRpcSchema(null).tables).toEqual([]);
  });
});
