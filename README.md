# commitstrology

## Overview

Your daily horoscope, read from your git history. 🔮

Run it inside any repo. It reads your commits (when you commit, how often you write "fix", how long your messages are) and gives you a **commit sign**, a chart, and today's fortune.

```bash
npx github:Iamyashsiwach/commitstrology
```

```
✦ commitstrology · 2026-11-05 · read from 412 commits ✦

  🌙  The Midnight Merger
  You do your best work while the linter sleeps...

  Today
    🔮 The bug you seek is in the file you are sure it is not in.
    🍀 Lucky command: git reflog
    🚫 Avoid:         a "small refactor"
```

The signs: 🌙 Midnight Merger · 🔥 Friday Deployer · 🩹 Serial Fixer · ⚔️ Weekend Warrior · 🍃 Haiku Poet · 📜 Novelist · ⭐ Steady Shipper.

Same repo on the same day gives the same reading. The stars are consistent, unlike your tests.

## System Architecture

One zero-dependency Node file (`index.js`, Node 18+). The steps run as a straight pipeline:

1. **Read.** It runs `git log` with `execFileSync` (no shell), limited to your `user.email` and your last 1000 non-merge commits. Each commit comes back as timestamp, weekday + hour (in your local commit timezone), and subject.
2. **Parse → analyze.** These are pure functions. They turn raw lines into commits, then commits into ratios: night, weekend, Friday afternoon, fix commits, average message length.
3. **Sign.** Every sign scores 1.0 at its trait threshold. The highest score above 1.0 wins; if none gets there, you are the Steady Shipper.
4. **Fortune.** A SHA-256 of `HEAD + today's date` picks the fortune, lucky command, lucky number and thing to avoid. It's deterministic, and no randomness gets stored anywhere.

Nothing leaves your machine: no network calls, no telemetry. Tests use `node --test`.
