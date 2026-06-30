import assert from 'assert';
import { describe, it } from 'node:test';

import { parsePagination } from './pagination.ts';

void describe('parsePagination', () => {
  void it('returns the default value', () => {
    const { page, limit, offset } = parsePagination({});

    assert.equal(page, 1);
    assert.equal(limit, 10);
    assert.equal(offset, 0);
  });
});
