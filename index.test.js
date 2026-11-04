import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLog, analyze, pickSign, horoscope } from './index.js';

const S = '\x1f';
const line = (day, hour, msg) => `1700000000${S}${day} ${String(hour).padStart(2, '0')}${S}${msg}`;

test('parseLog keeps messages containing the separator and drops junk lines', () => {
  const raw = [line(5, 16, `ship it${S}now`), 'garbage', line(9, 10, 'bad day')].join('\n');
  const commits = parseLog(raw);
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0], { ts: 1700000000, day: 5, hour: 16, msg: `ship it${S}now` });
});

test('analyze returns null for no commits', () => {
  assert.equal(analyze([]), null);
});

test('night owls become The Midnight Merger', () => {
  const commits = parseLog([line(2, 3, 'refactor auth flow'), line(3, 2, 'add retry logic'), line(4, 14, 'update deps')].join('\n'));
  assert.equal(pickSign(analyze(commits)).name, 'The Midnight Merger');
});

test('terse fixers lose to nobody but their own trait', () => {
  const commits = parseLog([line(2, 11, 'fix'), line(3, 11, 'fix bug'), line(4, 11, 'oops')].join('\n'));
  const { name } = pickSign(analyze(commits));
  assert.ok(['The Serial Fixer', 'The Haiku Poet'].includes(name));
});

test('balanced history is The Steady Shipper', () => {
  const msg = 'add pagination to the orders endpoint'; // ~37 chars: neither haiku nor novel
  const commits = parseLog([1, 2, 3, 4].map((d) => line(d, 11, msg)).join('\n'));
  assert.equal(pickSign(analyze(commits)).name, 'The Steady Shipper');
});

test('horoscope is deterministic per seed', () => {
  const stats = analyze(parseLog(line(2, 11, 'add pagination to the orders endpoint')));
  assert.deepEqual(horoscope(stats, 'abc:2026-11-05'), horoscope(stats, 'abc:2026-11-05'));
  assert.ok(horoscope(stats, 'x').luckyNumber < 100);
});
