const { computeStats, toActorData } = await import("../scripts/builder.js");
const { applyRole, emptySpec, ROLES, maxSpellRank } = await import("../scripts/roles.js");

let fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log("FAIL", m, JSON.stringify(a), "≠", JSON.stringify(b)); } else console.log("ok  ", m); };

// Все роли собираются на всех уровнях без ошибок.
for (const role of Object.keys(ROLES)) {
  for (let l = -1; l <= 24; l++) {
    try { toActorData(computeStats(applyRole(emptySpec(l), role))); }
    catch (e) { fail++; console.log("FAIL", role, l, e.message); }
  }
}
console.log("ok   все роли × уровни −1…24 собираются");

// Громила 8 уровня — по таблицам.
const brute = computeStats({ ...applyRole(emptySpec(8), "brute"), name: "Огр-вышибала" });
eq(brute.ac, 24, "громила 8: КБ низк. 24");
eq(brute.hp, 169, "громила 8: HP высок. (173–165 → 169)");
eq(brute.saves, { fortitude: 19, reflex: 13, will: 13 }, "громила 8: спасы");
eq(brute.attributes.str, 7, "громила 8: Сил экстр. +7");
eq(brute.strikes[0].attack, 18, "громила 8: атака средн. +18");
eq(brute.strikes[0].damage, "2d12+15", "громила 8: урон экстр.");
eq(brute.perception, 13, "громила 8: Восприятие низк.");

// Заклинатель: КС/атака.
const caster = computeStats(applyRole(emptySpec(10), "spellcaster"));
eq([caster.spellcasting.dc, caster.spellcasting.attack], [29, 21], "заклинатель 10: КС высок. 29 / +21");
eq(maxSpellRank(10, "half"), 5, "ранг заклинаний 10 ур. — 5");
eq(maxSpellRank(10, "half-1"), 4, "маг. боец 10 ур. — 4");

// Ручные числа и IWR.
const custom = computeStats({
  ...emptySpec(5), ac: 23, hp: "high",
  iwr: [{ kind: "resistance", type: "fire", value: "max" }, { kind: "weakness", type: "cold-iron", value: "min" }, { kind: "immunity", type: "poison" }],
  strikes: [{ name: "Пламенный коготь", attack: "high", damage: "high", damageType: "slashing", traits: ["agile"], extra: "1d6 fire" }],
});
eq(custom.ac, 23, "ручное КБ");
eq(custom.iwr, [{ kind: "resistance", type: "fire", value: 8 }, { kind: "weakness", type: "cold-iron", value: 4 }, { kind: "immunity", type: "poison" }], "IWR 5 ур.");
const data = toActorData(custom);
eq(data.items[0].system.damageRolls.extra, { damage: "1d6", damageType: "fire", category: null }, "доп. урон огнём");
eq(data.system.attributes.resistances, [{ type: "fire", value: 8 }], "сопротивление в данных");
eq(data.system.saves.fortitude, { value: 12, saveDetail: "" }, "спас в данных");

// Снайпер: дальний удар с дистанцией.
const sniper = toActorData(computeStats(applyRole(emptySpec(6), "sniper")));
eq(sniper.items[0].system.range, { increment: 60, max: null }, "снайпер: лук 60 фт");

// Предупреждение баланса.
const op = computeStats({ ...emptySpec(5), ac: "extreme", hp: "high", perception: "extreme", saves: { fortitude: "extreme", reflex: "extreme", will: "extreme" } });
eq(op.warnings.length > 0, true, "предупреждение о перекосе");

console.log(fail ? `ОШИБОК: ${fail}` : "Все проверки движка прошли");
process.exitCode = fail ? 1 : 0;
