import { describe, it, expect } from 'vitest';
import { duplicateValues } from '../src/data/mutations.js';

const table = {
  name: 'posts',
  primaryKey: ['id'],
  columns: [
    { name: 'id', isPrimaryKey: true },
    { name: 'title', isPrimaryKey: false },
    { name: 'status', isPrimaryKey: false },
    { name: 'missing_in_row', isPrimaryKey: false },
  ],
};

describe('duplicateValues', () => {
  it('copies every column except primary keys', () => {
    const row = { id: 42, title: 'hello', status: 'draft' };
    expect(duplicateValues(table, row)).toEqual({ title: 'hello', status: 'draft' });
  });

  it('keeps explicit nulls but skips columns absent from the row', () => {
    const row = { id: 1, title: null, status: 'live' };
    const values = duplicateValues(table, row);
    expect(values).toEqual({ title: null, status: 'live' });
    expect('missing_in_row' in values).toBe(false);
  });
});
