// Добыча под уровень существа по таблице сокровищ GM Core («Party Treasure by Level», 4 героя).
// Босс: постоянный магический предмет его уровня + расходник его уровня + монеты (~8% бюджета уровня).
// Обычный враг: расходник уровня −1…0 + монеты (~2%). Предметы — обычной редкости, из компендиума pf2e.
import { localizedData } from "./forge.js";

// Бюджет сокровищ за уровень на группу из 4 героев, зм (уровни 1–20).
export const PARTY_TREASURE = [175, 300, 500, 850, 1350, 2000, 2900, 4000, 5700, 8000,
  11500, 16500, 25000, 36500, 54500, 82500, 128000, 208000, 355000, 490000];

const SHARE = { boss: 0.08, regular: 0.02 };
const PERMANENT_TYPES = new Set(["weapon", "armor", "shield", "equipment"]);

/** Сколько монет (зм) положить существу уровня level. Чистая функция. */
export function lootCoins(level, kind = "boss") {
  const L = Math.max(1, Math.min(20, Math.round(Number(level))));
  const gp = PARTY_TREASURE[L - 1] * (SHARE[kind] ?? SHARE.regular);
  return Math.max(1, Math.round(gp / (gp >= 100 ? 10 : 1)) * (gp >= 100 ? 10 : 1));
}

let cachedIndex = null;
async function equipmentIndex() {
  if (cachedIndex) return cachedIndex;
  const pack = game.packs.get("pf2e.equipment-srd");
  if (!pack) throw new Error("Нет компендиума pf2e.equipment-srd");
  cachedIndex = (await pack.getIndex({ fields: ["system.level.value", "system.traits.rarity", "system.traits.value", "type"] }))
    .map((e) => ({ ...e, uuid: e.uuid ?? `Compendium.pf2e.equipment-srd.Item.${e._id}` }));
  return cachedIndex;
}

function pickRandom(list) {
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/** Подобрать предметы: { permanent, consumable } (могут быть null). */
export async function pickLoot(level, kind = "boss") {
  const idx = await equipmentIndex();
  const common = idx.filter((e) => (e.system?.traits?.rarity ?? "common") === "common");
  const L = Math.max(0, Math.min(20, Math.round(Number(level))));
  const consLevels = kind === "boss" ? [L] : [Math.max(0, L - 1), L];
  const consumable = pickRandom(common.filter((e) => e.type === "consumable" && consLevels.includes(e.system?.level?.value)));
  const permanent = kind === "boss"
    ? pickRandom(common.filter((e) => PERMANENT_TYPES.has(e.type) && e.system?.level?.value === L
        && (e.system?.traits?.value ?? []).some((t) => t === "magical" || t === "invested")))
    : null;
  return { permanent, consumable };
}

/** Положить добычу в инвентарь актёра. Возвращает { items: [имена], coins }. */
export async function addLoot(actor, { kind = "boss", level } = {}) {
  const L = level ?? actor.system?.details?.level?.value ?? 1;
  const { permanent, consumable } = await pickLoot(L, kind);
  const docs = [];
  for (const e of [permanent, consumable].filter(Boolean)) {
    const doc = await fromUuid(e.uuid);
    if (!doc) continue;
    const data = await localizedData(doc);
    delete data._id;
    docs.push(data);
  }
  if (docs.length) await actor.createEmbeddedDocuments("Item", docs);
  const coins = lootCoins(L, kind);
  await actor.inventory?.addCoins?.({ gp: coins });
  return { items: docs.map((d) => d.name), coins };
}
