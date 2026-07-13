import { describe, it, expect } from 'vitest';
import { buildRange, buildSearchFilter, searchableColumns } from '../src/data/query.js';

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
