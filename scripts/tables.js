// Таблицы GM Core «Building Creatures» (Pathfinder 2e Remaster), уровни −1…24.
// Источник: Archives of Nethys, GM Core — Table 2–1 … 2–12.
// Каждая строка — массив по уровням: индекс = уровень + 1.

export const MIN_LEVEL = -1;
export const MAX_LEVEL = 24;
export const TIERS = ["extreme", "high", "moderate", "low", "terrible"];
export const TIER_RU = { extreme: "экстр.", high: "высок.", moderate: "средн.", low: "низк.", terrible: "ужасн." };
export const TIER_RU_FULL = { extreme: "Экстремальный", high: "Высокий", moderate: "Средний", low: "Низкий", terrible: "Ужасный" };

const rows = (text) => text.trim().split("\n").map((line) => line.trim().split(/\s+/));
const num = (s) => (s === "—" ? null : Number(s));

// ---------- Table 2–1: модификаторы характеристик (extreme, high, moderate, low) ----------
const ATTR = rows(`
—  3  2 0
—  3  2 0
5  4  3 1
5  4  3 1
5  4  3 1
6  5  3 2
6  5  4 2
7  5  4 2
7  6  4 2
7  6  4 3
7  6  4 3
8  7  5 3
8  7  5 3
8  7  5 4
9  8  5 4
9  8  5 4
9  8  6 4
10 9  6 5
10 9  6 5
10 9  6 5
11 10 6 5
11 10 7 6
11 10 7 6
11 10 8 6
11 10 8 6
13 12 9 7
`);

// ---------- Table 2–2 / 2–6: Восприятие и спасброски совпадают (extreme … terrible) ----------
const PERC_SAVES = rows(`
9  8  5  2  0
10 9  6  3  1
11 10 7  4  2
12 11 8  5  3
14 12 9  6  4
15 14 11 8  6
17 15 12 9  7
18 17 14 11 8
20 18 15 12 10
21 19 16 13 11
23 21 18 15 12
24 22 19 16 14
26 24 21 18 15
27 25 22 19 16
29 26 23 20 18
30 28 25 22 19
32 29 26 23 20
33 30 28 25 22
35 32 29 26 23
36 33 30 27 24
38 35 32 29 26
39 36 33 30 27
41 38 35 32 28
43 39 36 33 30
44 40 37 34 31
46 42 38 36 32
`);

// ---------- Table 2–3: навыки (extreme, high, moderate, low-верх, low-низ) ----------
const SKILLS = rows(`
8  5  4  2  1
9  6  5  3  2
10 7  6  4  3
11 8  7  5  4
13 10 9  7  5
15 12 10 8  7
16 13 12 10 8
18 15 13 11 9
20 17 15 13 11
21 18 16 14 12
23 20 18 16 13
25 22 19 17 15
26 23 21 19 16
28 25 22 20 17
30 27 24 22 19
31 28 25 23 20
33 30 27 25 21
35 32 28 26 23
36 33 30 28 24
38 35 31 29 25
40 37 33 31 27
41 38 34 32 28
43 40 36 34 29
45 42 37 35 31
46 43 38 36 32
48 45 40 38 33
`);

// ---------- Table 2–5: КБ (extreme, high, moderate, low) ----------
const AC = rows(`
18 15 14 12
19 16 15 13
19 16 15 13
21 18 17 15
22 19 18 16
24 21 20 18
25 22 21 19
27 24 23 21
28 25 24 22
30 27 26 24
31 28 27 25
33 30 29 27
34 31 30 28
36 33 32 30
37 34 33 31
39 36 35 33
40 37 36 34
42 39 38 36
43 40 39 37
45 42 41 39
46 43 42 40
48 45 44 42
49 46 45 43
51 48 47 45
52 49 48 46
54 51 50 48
`);

// ---------- Table 2–7: HP (high, moderate, low) — диапазоны «от–до» ----------
const HP = rows(`
9   9   8   7   6   5
20  17  16  14  13  11
26  24  21  19  16  14
40  36  32  28  25  21
59  53  48  42  37  31
78  72  63  57  48  42
97  91  78  72  59  53
123 115 99  91  75  67
148 140 119 111 90  82
173 165 139 131 105 97
198 190 159 151 120 112
223 215 179 171 135 127
248 240 199 191 150 142
273 265 219 211 165 157
298 290 239 231 180 172
323 315 259 251 195 187
348 340 279 271 210 202
373 365 299 291 225 217
398 390 319 311 240 232
423 415 339 331 255 247
448 440 359 351 270 262
473 465 379 371 285 277
505 495 405 395 305 295
544 532 436 424 329 317
581 569 466 454 351 339
633 617 508 492 383 367
`);

// ---------- Table 2–8: сопротивления/слабости (максимум, минимум) ----------
const IWR = rows(`
1  1
3  1
3  2
5  2
6  3
7  4
8  4
9  5
10 5
11 6
12 6
13 7
14 7
15 8
16 8
17 9
18 9
19 9
19 10
20 10
21 11
22 11
23 12
24 12
25 13
26 13
`);

// ---------- Table 2–9: бонус атаки ударом (extreme, high, moderate, low) ----------
const STRIKE_ATTACK = rows(`
10 8  6  4
10 8  6  4
11 9  7  5
13 11 9  7
14 12 10 8
16 14 12 9
17 15 13 11
19 17 15 12
20 18 16 13
22 20 18 15
23 21 19 16
25 23 21 17
27 24 22 19
28 26 24 20
29 27 25 21
31 29 27 23
32 30 28 24
34 32 30 25
35 33 31 27
37 35 33 28
38 36 34 29
40 38 36 31
41 39 37 32
43 41 39 33
44 42 40 35
46 44 42 36
`);

// ---------- Table 2–10: урон ударом (extreme, high, moderate, low) ----------
const STRIKE_DAMAGE = rows(`
1d6+1   1d4+1   1d4     1d4
1d6+3   1d6+2   1d4+2   1d4+1
1d8+4   1d6+3   1d6+2   1d4+2
1d12+4  1d10+4  1d8+4   1d6+3
1d12+8  1d10+6  1d8+6   1d6+5
2d10+7  2d8+5   2d6+5   2d4+4
2d12+7  2d8+7   2d6+6   2d4+6
2d12+10 2d8+9   2d6+8   2d4+7
2d12+12 2d10+9  2d8+8   2d6+6
2d12+15 2d10+11 2d8+9   2d6+8
2d12+17 2d10+13 2d8+11  2d6+9
2d12+20 2d12+13 2d10+11 2d6+10
2d12+22 2d12+15 2d10+12 2d8+10
3d12+19 3d10+14 3d8+12  3d6+10
3d12+21 3d10+16 3d8+14  3d6+11
3d12+24 3d10+18 3d8+15  3d6+13
3d12+26 3d12+17 3d10+14 3d6+14
3d12+29 3d12+18 3d10+15 3d6+15
3d12+31 3d12+19 3d10+16 3d6+16
3d12+34 3d12+20 3d10+17 3d6+17
4d12+29 4d10+20 4d8+17  4d6+14
4d12+32 4d10+22 4d8+19  4d6+15
4d12+34 4d10+24 4d8+20  4d6+17
4d12+37 4d10+26 4d8+22  4d6+18
4d12+39 4d12+24 4d10+20 4d6+19
4d12+42 4d12+26 4d10+22 4d6+21
`);

// ---------- Table 2–11: КС и атака заклинаний (extreme, high, moderate) — КС; атака = КС − 8 ----------
const SPELL_DC = rows(`
19 16 13
19 16 13
20 17 14
22 18 15
23 20 17
25 21 18
26 22 19
27 24 21
29 25 22
30 26 23
32 28 25
33 29 26
34 30 27
36 32 29
37 33 30
39 34 31
40 36 33
41 37 34
43 38 35
44 40 37
46 41 38
47 42 39
48 44 41
50 45 42
51 46 43
52 48 45
`);

// ---------- Table 2–12: урон по области (неогранич., огранич.) ----------
const AREA_DAMAGE = rows(`
1d4  1d6
1d6  1d10
2d4  2d6
2d6  3d6
2d8  4d6
3d6  5d6
2d10 6d6
4d6  7d6
4d6  8d6
5d6  9d6
5d6  10d6
6d6  11d6
6d6  12d6
5d8  13d6
7d6  14d6
4d12 15d6
6d8  16d6
8d6  17d6
8d6  18d6
9d6  19d6
7d8  20d6
6d10 21d6
10d6 22d6
8d8  23d6
11d6 24d6
11d6 25d6
`);

// ---------- Доступ ----------

function row(table, level) {
  const l = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
  return table[l + 1];
}

function pick(table, level, tier, tiers) {
  const r = row(table, level);
  const i = tiers.indexOf(tier);
  if (i < 0) throw new Error(`Нет уровня «${tier}» для этой характеристики (доступно: ${tiers.join(", ")})`);
  return r[i];
}

export const STAT_TIERS = {
  attribute: ["extreme", "high", "moderate", "low"],
  perception: TIERS,
  save: TIERS,
  skill: ["extreme", "high", "moderate", "low"],
  ac: ["extreme", "high", "moderate", "low"],
  hp: ["high", "moderate", "low"],
  strikeAttack: ["extreme", "high", "moderate", "low"],
  strikeDamage: ["extreme", "high", "moderate", "low"],
  spell: ["extreme", "high", "moderate"],
  iwr: ["max", "min"],
  area: ["unlimited", "limited"],
};

/** Значение характеристики по таблице. Для HP — середина диапазона. */
export function statValue(stat, level, tier) {
  const t = STAT_TIERS[stat];
  switch (stat) {
    case "attribute": {
      let v = num(pick(ATTR, level, tier, t));
      // На уровнях −1/0 экстремального значения нет — берём высокое.
      if (v === null) v = num(pick(ATTR, level, "high", t));
      return v;
    }
    case "perception":
    case "save": return num(pick(PERC_SAVES, level, tier, t));
    case "skill": return num(pick(SKILLS, level, tier, t));
    case "ac": return num(pick(AC, level, tier, t));
    case "strikeAttack": return num(pick(STRIKE_ATTACK, level, tier, t));
    case "hp": {
      const r = row(HP, level).map(Number);
      const i = t.indexOf(tier);
      if (i < 0) throw new Error(`Нет уровня «${tier}» для HP`);
      return Math.round((r[i * 2] + r[i * 2 + 1]) / 2);
    }
    case "iwr": return num(pick(IWR, level, tier, t));
    default: throw new Error(`Неизвестная характеристика: ${stat}`);
  }
}

/** Диапазон HP для уровня и тира: [от, до]. */
export function hpRange(level, tier) {
  const r = row(HP, level).map(Number);
  const i = STAT_TIERS.hp.indexOf(tier);
  return [r[i * 2 + 1], r[i * 2]];
}

export function strikeDamage(level, tier) {
  return pick(STRIKE_DAMAGE, level, tier, STAT_TIERS.strikeDamage);
}

export function spellStats(level, tier) {
  const dc = num(pick(SPELL_DC, level, tier, STAT_TIERS.spell));
  return { dc, attack: dc - 8 };
}

export function areaDamage(level, tier = "limited") {
  return pick(AREA_DAMAGE, level, tier, STAT_TIERS.area);
}

/** Средний урон формулы вида «2d8+5». */
export function averageDamage(formula) {
  const m = String(formula).match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!m) return null;
  const [, n, d, plus] = m.map(Number);
  return Math.floor(n * (d + 1) / 2 + (plus || 0));
}

/**
 * Обратное: к какому тиру ближе значение для уровня (для подсказок в листе).
 * Возвращает { tier, exact } — exact=false, если значение между тирами или вне шкалы.
 */
export function tierOf(stat, level, value) {
  const tiers = STAT_TIERS[stat];
  if (!tiers || value === null || value === undefined || Number.isNaN(value)) return null;
  if (stat === "hp") {
    for (const t of tiers) {
      const [lo, hi] = hpRange(level, t);
      if (value >= lo && value <= hi) return { tier: t, exact: true };
    }
    const top = hpRange(level, "high")[1];
    if (value > top) return { tier: "extreme", exact: false, above: true };
  }
  let best = null;
  for (const t of tiers) {
    const v = stat === "hp" ? statValue("hp", level, t) : statValue(stat, level, t);
    const diff = Math.abs(value - v);
    if (!best || diff < best.diff) best = { tier: t, diff, v };
  }
  const topValue = statValue(stat, level, tiers[0] === "extreme" && stat === "attribute" && level < 1 ? "high" : tiers[0]);
  return { tier: best.tier, exact: best.diff === 0, above: value > topValue || undefined };
}

// Сырые таблицы — для тестов и отладки.
export const RAW = { ATTR, PERC_SAVES, SKILLS, AC, HP, IWR, STRIKE_ATTACK, STRIKE_DAMAGE, SPELL_DC, AREA_DAMAGE };
