import assert from "node:assert";
import { suggestTraits, normalizeTraits, customAbilityData } from "../scripts/abilities.js";

const s1 = suggestTraits("Устрашающее присутствие", "Аура 30 футов: существа должны пройти спасбросок Воли или станут напуганы", "passive");
assert.ok(["aura", "emotion", "fear", "mental"].every((t) => s1.includes(t)), s1);
const s2 = suggestTraits("Ядовитый плевок", "Плюёт ядом", "2");
assert.ok(s2.includes("poison") && !s2.includes("aura"), s2);
assert.deepEqual(normalizeTraits(["Аура", "emotion", " Страх "], { aura: "Аура", emotion: "Эмоция", fear: "Страх" }), ["aura", "emotion", "fear"]);
const d = customAbilityData({ name: "Приливная волна", actions: "2", description: "Волна воды бьёт всех в конусе" });
assert.equal(d.system.actions.value, 2);
assert.equal(d.system.actionType.value, "action");
assert.ok(d.system.traits.value.includes("water"), "теги подобраны сами");
const r = customAbilityData({ name: "Ответный хлест", actions: "reaction", traits: ["attack"], description: "x" });
assert.equal(r.system.actionType.value, "reaction");
assert.equal(r.system.actions.value, null);
assert.deepEqual(r.system.traits.value, ["attack"]);
console.log("Свои способности и теги — ок");
