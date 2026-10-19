// Шаблоны, способности ролей, добыча, ауры и КС в тексте при смене уровня.
import assert from "node:assert";
import { templateUpdates, TEMPLATES, elementalDie } from "../scripts/templates.js";
import { roleAbilities, defaultAuraRadius } from "../scripts/role-abilities.js";
import { lootCoins } from "../scripts/loot.js";
import { fixAuraRules, customAbilityData } from "../scripts/abilities.js";
import { rescaleUpdates } from "../scripts/rescale.js";
import { ROLES } from "../scripts/roles.js";

const npc = (level) => ({ system: {
  details: { level: { value: level } }, traits: { value: ["humanoid"] },
  attributes: { immunities: [], weaknesses: [], resistances: [{ type: "cold", value: 2 }], speed: { value: 25, otherSpeeds: [] }, ac: { value: 30 }, hp: { max: 200, value: 200 } },
  perception: { mod: 20, senses: [] }, saves: {}, abilities: {}, skills: {},
} });
const strike = { _id: "s1", type: "melee", name: "Когти", system: { bonus: { value: 20 }, damageRolls: { a: { damage: "2d8+10", damageType: "slashing" } } } };

// Шаблоны
const und = templateUpdates(npc(10), [strike], "undead");
assert.ok(und.actor["system.traits.value"].includes("undead"));
assert.ok(und.actor["system.attributes.immunities"].some((x) => x.type === "poison"));
assert.ok(und.actor["system.attributes.weaknesses"][0].value > 0);
assert.ok(und.create.some((c) => c.name === "Исцеление пустотой" && c.system.traits.value.includes("void")));
const fire = templateUpdates(npc(12), [strike], "fiery");
assert.equal(fire.items[0]["system.damageRolls.forgefiery"].damage, elementalDie(12));
const aq = templateUpdates(npc(5), [], "aquatic");
assert.deepEqual(aq.actor["system.attributes.speed.otherSpeeds"], [{ type: "swim", value: 25 }]);
assert.ok(aq.actor["system.attributes.resistances"].find((r) => r.type === "cold").value > 2, "сопротивление холоду повышено до таблицы");
assert.throws(() => templateUpdates(npc(5), [], "elite"));
for (const k of Object.keys(TEMPLATES).filter((k) => !TEMPLATES[k].adjustment)) templateUpdates(npc(1), [strike], k);

// Способности ролей: у всех ролей, на всех уровнях — с тегами (кроме пустых осознанно) и числами
for (const role of Object.keys(ROLES)) for (const L of [-1, 1, 5, 10, 15, 20, 24]) {
  const list = roleAbilities(role, L);
  assert.ok(list.length, `${role} ${L}`);
  for (const a of list) {
    const d = customAbilityData(a, L);
    assert.ok(!/undefined|NaN/.test(d.system.description.value), `${role} ${L} ${a.name}: ${d.system.description.value}`);
  }
}
const fp = customAbilityData(roleAbilities("brute", 15).find((a) => a.key === "frightful-presence"), 15);
assert.equal(fp.system.rules[0].key, "Aura");
assert.equal(fp.system.rules[0].radius, 60);
assert.equal(defaultAuraRadius(5), 30);

// Аура с радиусом 0 из компендиума
const king = { name: "Устрашающее присутствие", system: { description: { value: "<p>Аура 90 футов</p>" }, rules: [{ key: "Aura", radius: 0 }] } };
assert.ok(fixAuraRules(king, 15));
assert.equal(king.system.rules[0].radius, 90);
const noText = { name: "Frightful Presence", system: { description: { value: "" }, rules: [{ key: "Aura" }] } };
fixAuraRules(noText, 12); assert.equal(noText.system.rules[0].radius, 60);

// Смена уровня: КС в тексте способности и аура
const src = npc(5);
const ability = { _id: "a1", type: "action", name: "Рёв", system: { description: { value: "<p>@Check[will|dc:22] или КС 22.</p>" }, rules: [{ key: "Aura", radius: 0 }] } };
const up = rescaleUpdates(src, [ability], 15);
const iu = up.items.find((x) => x._id === "a1");
assert.ok(/dc:3\d/.test(iu["system.description.value"]) && /КС 3\d/.test(iu["system.description.value"]), iu["system.description.value"]);
assert.ok(iu["system.rules"][0].radius > 0);

// Добыча
assert.equal(lootCoins(15, "boss"), 4360);
assert.ok(lootCoins(1, "regular") >= 1);
assert.ok(lootCoins(24, "boss") > 0 && lootCoins(-1, "boss") > 0);
console.log("Шаблоны, способности ролей, ауры, добыча — ок");
