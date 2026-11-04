#!/usr/bin/env node
// commitstrology — your git history, read by the stars.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SEP = '\x1f';
const FIX = /\b(fix|fixes|fixed|bug|oops|typo|hotfix|revert)\b/i;
const WIP = /\bwip\b/i;

// Each sign scores 1.0 when its trait hits the "this is clearly you" threshold.
const SIGNS = [
  {
    name: 'The Midnight Merger', glyph: '🌙',
    score: (s) => s.night / 0.15,
    reading: 'You do your best work while the linter sleeps. Your code has the confidence of 2am and the test coverage of 2am.',
  },
  {
    name: 'The Friday Deployer', glyph: '🔥',
    score: (s) => s.fridayPm / 0.1,
    reading: 'You fear nothing, least of all the weekend on-call rotation. Your coworkers light candles when you open a PR at 4:55pm.',
  },
  {
    name: 'The Serial Fixer', glyph: '🩹',
    score: (s) => s.fixes / 0.3,
    reading: 'Every commit is an apology to a previous commit. You are not writing software, you are negotiating with it.',
  },
  {
    name: 'The Weekend Warrior', glyph: '⚔️',
    score: (s) => s.weekend / 0.25,
    reading: 'Saturday is just Friday with fewer meetings. Your side projects have side projects.',
  },
  {
    name: 'The Haiku Poet', glyph: '🍃',
    score: (s) => 12 / Math.max(s.avgLen, 1),
    reading: '"fix". "stuff". "ok". Your commit messages are minimalist art that future-you will not understand.',
  },
  {
    name: 'The Novelist', glyph: '📜',
    score: (s) => s.avgLen / 72,
    reading: 'Your commit messages have chapters, a protagonist, and a twist ending. git log is your memoir.',
  },
];

const STEADY = {
  name: 'The Steady Shipper', glyph: '⭐',
  reading: 'Balanced, punctual, suspiciously well-adjusted. The stars find you boring and that is the highest compliment.',
};

const FORTUNES = [
  'A merge conflict approaches from the west. Accept theirs.',
  'Mercury is in retrograde. So is your dependency tree.',
  'Today a flaky test will pass three times in a row. Do not trust it.',
  'Someone will ask "quick question". It will not be quick.',
  'The bug you seek is in the file you are sure it is not in.',
  'A stranger will star your repo. Do not let it go to your head.',
  'Your next `npm install` will download half the universe. Breathe.',
  'You will finally delete that commented-out code. It was never coming back.',
  'Venus aligns with your terminal. Your aliases have never looked better.',
  'A rubber duck will solve your hardest problem. Listen to it.',
];

const LUCKY_COMMANDS = [
  'git stash', 'git reflog', 'git commit --amend', 'git bisect',
  'git blame (on yourself)', 'git push --force-with-lease', 'git cherry-pick', 'git clean -n',
];

const AVOID = [
  'regex before coffee', 'naming things', 'timezones', 'cache invalidation',
  'touching the legacy module', 'replying-all', 'a "small refactor"', 'force-pushing to main',
];

export function parseLog(raw) {
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ts, when = '', ...rest] = line.split(SEP);
      const [day, hour] = when.split(' ').map(Number);
      return { ts: Number(ts), day, hour, msg: rest.join(SEP).trim() };
    })
    .filter((c) => Number.isFinite(c.ts) && c.day >= 1 && c.day <= 7 && c.hour >= 0 && c.hour <= 23);
}

export function analyze(commits) {
  const n = commits.length;
  if (n === 0) return null;
  const share = (pred) => commits.filter(pred).length / n;
  return {
    total: n,
    night: share((c) => c.hour < 5),
    weekend: share((c) => c.day >= 6),
    fridayPm: share((c) => c.day === 5 && c.hour >= 15),
    fixes: share((c) => FIX.test(c.msg)),
    wip: commits.filter((c) => WIP.test(c.msg)).length,
    avgLen: commits.reduce((sum, c) => sum + c.msg.length, 0) / n,
  };
}

export function pickSign(stats) {
  let best = STEADY;
  let bestScore = 1; // a trait must at least hit its threshold to beat Steady
  for (const sign of SIGNS) {
    const score = sign.score(stats);
    if (score > bestScore) [best, bestScore] = [sign, score];
  }
  return best;
}

// Same repo + same day = same horoscope. The stars are consistent, unlike your tests.
export function horoscope(stats, seed) {
  const bytes = createHash('sha256').update(seed).digest();
  const pick = (list, i) => list[bytes[i] % list.length];
  return {
    sign: pickSign(stats),
    fortune: pick(FORTUNES, 0),
    luckyCommand: pick(LUCKY_COMMANDS, 1),
    avoid: pick(AVOID, 2),
    luckyNumber: bytes.readUInt16BE(3) % 100,
  };
}

const paint = (code, text) =>
  process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text;

const pct = (x) => `${Math.round(x * 100)}%`;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function readCommits() {
  let email = '';
  try { email = git(['config', 'user.email']); } catch { /* no identity set: read everyone's commits */ }
  const args = [
    'log', '--no-merges', '-n', '1000', // ponytail: last 1000 commits only, plenty for a vibe check
    `--pretty=format:%at${SEP}%ad${SEP}%s`, '--date=format:%u %H',
  ];
  if (email) args.push(`--author=${email}`);
  return { commits: parseLog(git(args)), head: git(['rev-parse', 'HEAD']) };
}

function main() {
  let data;
  try {
    data = readCommits();
  } catch {
    console.error('🔭 The stars cannot see a git repo here. Run me inside one (with at least one commit).');
    process.exit(1);
  }

  const stats = analyze(data.commits);
  if (!stats) {
    console.error('🔭 No commits by you in this repo. The stars need something to read.');
    process.exit(1);
  }

  const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD; your horoscope follows your timezone, not UTC's
  const h = horoscope(stats, `${data.head}:${today}`);

  console.log(`
${paint('2', `✦ commitstrology · ${today} · read from ${stats.total} commits ✦`)}

  ${h.sign.glyph}  ${paint('1;35', h.sign.name)}
  ${h.sign.reading}

  ${paint('1', 'Your chart')}
    night commits      ${pct(stats.night)}
    weekend commits    ${pct(stats.weekend)}
    friday after 3pm   ${pct(stats.fridayPm)}
    "fix" commits      ${pct(stats.fixes)}
    avg message        ${Math.round(stats.avgLen)} chars${stats.wip ? `   (${stats.wip} WIPs, we saw those)` : ''}

  ${paint('1', 'Today')}
    🔮 ${h.fortune}
    🍀 Lucky command: ${paint('36', h.luckyCommand)}
    🔢 Lucky number:  ${h.luckyNumber}
    🚫 Avoid:         ${h.avoid}
`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) main();
