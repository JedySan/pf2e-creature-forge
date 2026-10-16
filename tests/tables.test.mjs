// Проверка таблиц: размер, монотонность по уровню и по тиру, средний урон совпадает с книгой.
const T = await import("../scripts/tables.js");
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log("FAIL", msg); } };

for (const [name, table] of Object.entries(T.RAW)) {
  check(table.length === 26, `${name}: ${table.length} строк, ожидалось 26`);
  const w = table[0].length;
  table.forEach((r, i) => check(r.length === w, `${name}: строка уровня ${i - 1} — ${r.length} колонок`));
}

// Числовые таблицы: по уровню не убывают, по тиру (слева направо) не возрастают.
const numeric = ["ATTR", "PERC_SAVES", "SKILLS", "AC", "HP", "IWR", "STRIKE_ATTACK", "SPELL_DC"];
for (const name of numeric) {
  const t = T.RAW[name].map((r) => r.map((x) => (x === "—" ? null : Number(x))));
  for (let c = 0; c < t[0].length; c++) {
    for (let i = 1; i < t.length; i++) {
      if (t[i][c] === null || t[i - 1][c] === null) continue;
      check(t[i][c] >= t[i - 1][c], `${name}: колонка ${c} убывает на уровне ${i - 1}`);
    }
  }
  for (const r of t) for (let c = 1; c < r.length; c++) {
    if (r[c] === null || r[c - 1] === null) continue;
    check(r[c] <= r[c - 1], `${name}: тир ${c} больше тира ${c - 1}: ${r}`);
  }
}

// Средний урон ударов совпадает со скобками в книге.
const BOOK_AVG = {
  1: [8, 6, 5, 4], 5: [20, 16, 13, 11], 10: [33, 26, 22, 17], 15: [45, 36, 30, 24], 20: [58, 44, 37, 29], 24: [68, 52, 44, 35],
};
for (const [lvl, avgs] of Object.entries(BOOK_AVG)) {
  ["extreme", "high", "moderate", "low"].forEach((tier, i) => {
    const f = T.strikeDamage(Number(lvl), tier);
    check(T.averageDamage(f) === avgs[i], `урон ${lvl}/${tier}: ${f} = ${T.averageDamage(f)}, в книге ${avgs[i]}`);
  });
}
// Весь столбец урона: среднее не убывает по уровню.
for (const tier of ["extreme", "high", "moderate", "low"]) {
  let prev = 0;
  for (let l = -1; l <= 24; l++) {
    const a = T.averageDamage(T.strikeDamage(l, tier));
    check(a >= prev, `урон ${tier} убывает на ${l}`);
    prev = a;
  }
}

// Точечные значения из книги.
const eq = (a, b, m) => check(a === b, `${m}: ${a} ≠ ${b}`);
eq(T.statValue("ac", 1, "high"), 16, "КБ 1 высок.");
eq(T.statValue("ac", 15, "extreme"), 40, "КБ 15 экстр.");
eq(T.statValue("save", 13, "high"), 26, "Спас 13 высок.");
eq(T.statValue("perception", -1, "terrible"), 0, "Восприятие −1 ужасн.");
eq(T.statValue("hp", 1, "high"), 25, "HP 1 высок. (26–24)");
eq(T.statValue("hp", 15, "moderate"), 275, "HP 15 средн. (279–271)");
eq(T.statValue("strikeAttack", 15, "high"), 30, "Атака 15 высок.");
eq(T.statValue("attribute", 0, "extreme"), 3, "Хар-ка 0 экстр. → высок.");
eq(T.statValue("attribute", 24, "extreme"), 13, "Хар-ка 24 экстр.");
eq(T.statValue("skill", 1, "low"), 4, "Навык 1 низк.");
eq(T.spellStats(1, "high").dc, 17, "КС закл. 1 высок.");
eq(T.spellStats(1, "high").attack, 9, "Атака закл. 1 высок.");
eq(T.spellStats(24, "extreme").attack, 44, "Атака закл. 24 экстр.");
eq(T.statValue("iwr", 15, "max"), 18, "IWR 15 макс.");
eq(T.areaDamage(10, "limited"), "11d6", "Площадь 10 огранич.");

// Обратное определение тира.
eq(T.tierOf("ac", 15, 37).tier, "high", "tierOf КБ 37 на 15");
eq(T.tierOf("hp", 15, 275).tier, "moderate", "tierOf HP 275 на 15");
eq(T.tierOf("save", 13, 26).exact, true, "tierOf спас точный");
eq(T.tierOf("ac", 15, 45).above, true, "tierOf выше шкалы");

console.log(fail ? `ОШИБОК: ${fail}` : "Все проверки таблиц прошли");
process.exitCode = fail ? 1 : 0;
