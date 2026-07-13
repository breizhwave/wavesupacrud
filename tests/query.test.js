import { describe, it, expect } from 'vitest';
import { buildColumnFilters, buildRange, buildSearchFilter, searchableColumns } from '../src/data/query.js';

describe('buildRange', () => {
  it('computes zero-based bounds for page 1', () => {
    expect(buildRange(1, 25)).toEqual({ from: 0, to: 24 });
  });

  it('computes bounds for later pages', () => {
    expect(buildRange(3, 25)).toEqual({ from: 50, to: 74 });
    expect(buildRange(2, 10)).toEqual({ from: 10, to: 19 });
  });
});

const table = {
  name: 'posts',
  columns: [
    { name: 'id', type: 'integer', format: 'bigint', enumValues: null },
    { name: 'uuid_col', type: 'string', format: 'uuid', enumValues: null },
    { name: 'title', type: 'string', format: 'text', enumValues: null },
    { name: 'slug', type: 'string', format: 'character varying', enumValues: null },
    { name: 'status', type: 'string', format: 'status', enumValues: ['a', 'b'] },
  ],
};

describe('searchableColumns', () => {
  it('keeps free-text columns only (no numbers, uuids, enums)', () => {
    expect(searchableColumns(table)).toEqual(['title', 'slug']);
  });
});

describe('buildSearchFilter', () => {
  it('builds an or= ilike filter across searchable columns', () => {
    expect(buildSearchFilter(table, 'hello')).toBe('title.ilike.*hello*,slug.ilike.*hello*');
  });

  it('returns null for empty terms', () => {
    expect(buildSearchFilter(table, '')).toBeNull();
    expect(buildSearchFilter(table, '   ')).toBeNull();
    expect(buildSearchFilter(table, null)).toBeNull();
  });

  it('strips PostgREST syntax characters from the term', () => {
    expect(buildSearchFilter(table, 'a,b%c(d)')).toBe('title.ilike.*a b c d*,slug.ilike.*a b c d*');
  });

  it('returns null when the table has no searchable columns', () => {
    const numeric = { name: 'n', columns: [{ name: 'id', type: 'integer', format: '', enumValues: null }] };
    expect(buildSearchFilter(numeric, 'x')).toBeNull();
  });
});

describe('buildColumnFilters', () => {
  const filterTable = {
    name: 'posts',
    columns: [
      { name: 'id', type: 'integer', format: 'bigint', enumValues: null },
      { name: 'title', type: 'string', format: 'text', enumValues: null },
      { name: 'status', type: 'string', format: 'post_status', enumValues: ['draft', 'published'] },
      { name: 'is_live', type: 'boolean', format: 'boolean', enumValues: null },
      { name: 'author_id', type: 'string', format: 'uuid', enumValues: null },
      { name: 'meta', type: 'string', format: 'jsonb', enumValues: null },
      { name: 'created_at', type: 'string', format: 'timestamp with time zone', enumValues: null },
      { name: 'published_on', type: 'string', format: 'date', enumValues: null },
    ],
  };
  const one = (filters) => buildColumnFilters(filterTable, filters);

  it('uses ilike for free text', () => {
    expect(one({ title: 'hello' })).toEqual([{ column: 'title', op: 'ilike', value: '%hello%' }]);
  });

  it('uses eq for enums and uuids, is for booleans', () => {
    expect(one({ status: 'draft' })).toEqual([{ column: 'status', op: 'eq', value: 'draft' }]);
    expect(one({ author_id: 'abc-123' })).toEqual([{ column: 'author_id', op: 'eq', value: 'abc-123' }]);
    expect(one({ is_live: 'true' })).toEqual([{ column: 'is_live', op: 'is', value: 'true' }]);
  });

  it('supports comparison prefixes on numbers', () => {
    expect(one({ id: '5' })).toEqual([{ column: 'id', op: 'eq', value: '5' }]);
    expect(one({ id: '>10' })).toEqual([{ column: 'id', op: 'gt', value: '10' }]);
    expect(one({ id: '<= -2.5' })).toEqual([{ column: 'id', op: 'lte', value: '-2.5' }]);
    expect(one({ id: 'abc' })).toEqual([]);
  });

  it('expands a plain day on a timestamp column to a day range', () => {
    expect(one({ created_at: '2026-01-31' })).toEqual([
      { column: 'created_at', op: 'gte', value: '2026-01-31' },
      { column: 'created_at', op: 'lt', value: '2026-02-01' },
    ]);
    expect(one({ created_at: '>=2026-01-01' })).toEqual([
      { column: 'created_at', op: 'gte', value: '2026-01-01' },
    ]);
    expect(one({ published_on: '2026-01-31' })).toEqual([
      { column: 'published_on', op: 'eq', value: '2026-01-31' },
    ]);
  });

  it('skips json columns, unknown columns, and blank terms', () => {
    expect(one({ meta: 'x', nope: 'y', title: '  ' })).toEqual([]);
  });
});
