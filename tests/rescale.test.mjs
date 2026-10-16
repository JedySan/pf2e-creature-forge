const { rescaleUpdates } = await import("../scripts/rescale.js");
let fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log("FAIL", m, JSON.stringify(a), "≠", JSON.stringify(b)); } else console.log("ok  ", m); };

// Мародёр-подобный NPC 13 уровня: КБ высок.+1 (34+1), HP средн., атака высок., урон высок.
const src = {
  system: {
    details: { level: { value: 13 } },
    abilities: { str: { mod: 8 }, dex: { mod: 5 }, con: { mod: 5 }, int: { mod: 0 }, wis: { mod: 3 }, cha: { mod: 2 } },
    perception: { mod: 23 },
    attributes: { ac: { value: 35 }, hp: { value: 235, max: 235 }, resistances: [{ type: "cold", value: 16 }] },
    saves: { fortitude: { value: 26 }, reflex: { value: 23 }, will: { value: 20 } },
    skills: { athletics: { base: 27 } },
  },
};
const items = [
  { _id: "a", type: "melee", name: "Трезубец", system: { bonus: { value: 27 }, damageRolls: { m: { damage: "3d10+16", damageType: "piercing" }, b: { damage: "1d6", damageType: "bleed", category: "persistent" } } } },
  { _id: "b", type: "spellcastingEntry", name: "Врождённые", system: { spelldc: { dc: 33, value: 25 } } },
];

const up = rescaleUpdates(src, items, 15);
eq(up.actor["system.details.level.value"], 15, "уровень 15");
eq(up.actor["system.attributes.ac.value"], 38, "КБ высок.+1: 35 → 37+1");
eq(up.actor["system.attributes.hp.max"], 275, "HP средн.: 235 → 275");
eq(up.actor["system.saves.fortitude.value"], 29, "Стойкость высок. 26 → 29");
eq(up.actor["system.perception.mod"], 26, "Восприятие средн. 23 → 26");
eq(up.actor["system.skills.athletics.base"], 30, "Атлетика высок. 27 → 30");
eq(up.actor["system.attributes.resistances"][0].value, 18, "сопротивление макс. 16 → 18");
eq(up.items[0]["system.bonus.value"], 30, "атака высок. 27 → 30");
eq(up.items[0]["system.damageRolls.m.damage"], "3d12+17", "урон высок. → формула 15 ур.");
eq(up.items[0]["system.damageRolls.b.damage"], undefined, "продолж. урон не трогаем");
eq([up.items[1]["system.spelldc.dc"], up.items[1]["system.spelldc.value"]], [36, 28], "КС высок. 33 → 36, атака +3");

// Вниз и обратно — возвращается к исходному.
const down = rescaleUpdates(src, items, 5);
eq(down.actor["system.attributes.ac.value"], 23, "КБ на 5 ур. (высок. 22 +1)");
console.log(fail ? `ОШИБОК: ${fail}` : "Смена уровня считает верно");
process.exitCode = fail ? 1 : 0;
