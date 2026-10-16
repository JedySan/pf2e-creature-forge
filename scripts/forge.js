// Создание актёра в Foundry по спецификации: базовые данные + способности из компендиума + заклинания.
import { computeStats, toActorData } from "./builder.js";

export const MODULE_ID = "pf2e-creature-forge";
export const DEFAULT_FOLDER = "Созданные враги";
// Папки прошлых версий Кузни и PF2e Claude Bridge — их содержимое переносится в общую.
const LEGACY_FOLDERS = ["Кузня существ", "Claude — энкаунтеры"];

export function folderName() {
  try { return game.settings.get(MODULE_ID, "folderName")?.trim() || DEFAULT_FOLDER; } catch { return DEFAULT_FOLDER; }
}

/** Слить старые папки в общую (один раз при запуске, у ГМа). */
export async function migrateLegacyFolders() {
  const target = folderName();
  for (const old of LEGACY_FOLDERS) {
    if (old === target) continue;
    const src = game.folders.find((f) => f.type === "Actor" && f.name === old);
    if (!src) continue;
    const dest = await ensureFolder();
    const actors = game.actors.filter((a) => a.folder?.id === src.id);
    if (actors.length) await Actor.implementation.updateDocuments(actors.map((a) => ({ _id: a.id, folder: dest.id })));
    const hasChildren = game.folders.some((f) => f.folder?.id === src.id);
    if (!hasChildren) await src.delete();
    console.info(`[pf2e-creature-forge] папка «${old}» → «${target}» (${actors.length} актёров)`);
  }
}

const ABILITY_PACKS = ["pf2e.bestiary-ability-glossary-srd", "pf2e.bestiary-family-ability-glossary"];
const SPELL_PACK = "pf2e.spells-srd";

export const TRADITION_RU = { arcane: "Арканные", divine: "Сакральные", occult: "Оккультные", primal: "Природные" };
export const CAST_TYPE_RU = { innate: "врождённые", prepared: "подготовленные", spontaneous: "спонтанные" };

export async function ensureFolder() {
  const name = folderName();
  let folder = game.folders.find((f) => f.type === "Actor" && f.name === name);
  if (!folder) folder = await Folder.create({ name, type: "Actor", color: "#7a3b12" });
  return folder;
}

async function indexOf(packId, fields = []) {
  const pack = game.packs.get(packId);
  if (!pack) return [];
  const idx = await pack.getIndex({ fields });
  return idx.map((e) => ({ ...e, uuid: e.uuid ?? `Compendium.${packId}.Item.${e._id}`, pack: pack.metadata.label }));
}

/** Поиск способностей монстров (глоссарий бестиария, потом все компендиумы действий). */
export async function searchAbilities(query, limit = 30) {
  const q = query.toLowerCase().trim();
  const found = [];
  const seen = new Set();
  const consider = (e) => {
    if (e.type !== "action" || seen.has(e.uuid)) return;
    const names = [e.name, e.originalName, e.flags?.babele?.originalName].filter(Boolean).map((n) => n.toLowerCase());
    if (q && !names.some((n) => n.includes(q))) return;
    seen.add(e.uuid);
    found.push({ uuid: e.uuid, name: e.name, pack: e.pack });
  };
  for (const id of ABILITY_PACKS) (await indexOf(id)).forEach(consider);
  if (found.length < limit) {
    for (const pack of game.packs.filter((p) => p.documentName === "Item" && !ABILITY_PACKS.includes(p.collection))) {
      const idx = await pack.getIndex();
      for (const e of idx) consider({ ...e, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, pack: pack.metadata.label });
      if (found.length >= limit) break;
    }
  }
  return found.slice(0, limit);
}

/** Поиск заклинаний; maxRank — не выше ранга, tradition — только этой традиции. */
export async function searchSpells(query, { maxRank, tradition, limit = 30 } = {}) {
  const q = query.toLowerCase().trim();
  const idx = await indexOf(SPELL_PACK, ["system.level.value", "system.traits.value", "system.traits.traditions"]);
  return idx
    .filter((e) => e.type === "spell")
    .filter((e) => !q || [e.name, e.originalName].filter(Boolean).some((n) => n.toLowerCase().includes(q)))
    .map((e) => {
      const traits = e.system?.traits?.value ?? [];
      return {
        uuid: e.uuid, name: e.name,
        rank: traits.includes("cantrip") ? 0 : e.system?.level?.value,
        traditions: e.system?.traits?.traditions ?? [],
      };
    })
    .filter((e) => maxRank === undefined || e.rank <= maxRank)
    .filter((e) => !tradition || !e.traditions.length || e.traditions.includes(tradition))
    .slice(0, limit);
}

/** Найти документ по uuid или по имени (точное, иначе первое совпадение). */
async function resolveItem(ref, searcher) {
  if (ref.uuid) return fromUuid(ref.uuid);
  if (!ref.name) return null;
  const hits = await searcher(ref.name);
  const exact = hits.find((h) => h.name.toLowerCase() === ref.name.toLowerCase());
  const hit = exact ?? hits[0];
  return hit ? fromUuid(hit.uuid) : null;
}

/**
 * Создать существо. Возвращает { actor, stats, warnings, missing }.
 * missing — способности/заклинания, которые не нашлись в компендиумах.
 */
export async function createCreature(spec, { openSheet = true } = {}) {
  const stats = computeStats(spec);
  const folder = await ensureFolder();
  const data = toActorData({ ...stats, spec });
  data.folder = folder.id;
  const actor = await Actor.implementation.create(data);
  const missing = [];

  // Способности: выбранные + рекомендованные ролью (по имени, если найдутся).
  const abilityRefs = [...(spec.abilities ?? [])];
  for (const name of spec.roleAbilities ?? []) {
    if (!abilityRefs.some((a) => a.fromRole)) abilityRefs.push({ name, fromRole: true, optional: true });
  }
  const abilityDocs = [];
  let roleAbilityAdded = false;
  for (const ref of abilityRefs) {
    if (ref.fromRole && roleAbilityAdded) continue;
    const doc = await resolveItem(ref, (q) => searchAbilities(q, 5));
    if (doc) {
      abilityDocs.push(doc.toObject());
      if (ref.fromRole) roleAbilityAdded = true;
    } else if (!ref.optional) {
      missing.push(ref.name ?? ref.uuid);
    }
  }
  if (abilityDocs.length) {
    abilityDocs.forEach((d) => delete d._id);
    await actor.createEmbeddedDocuments("Item", abilityDocs);
  }

  if (stats.spellcasting) await addSpellcasting(actor, stats.spellcasting, missing);

  if (openSheet) actor.sheet.render(true);
  return { actor, stats, warnings: stats.warnings, missing };
}

async function addSpellcasting(actor, sc, missing) {
  const type = sc.type ?? "innate";
  const [entry] = await actor.createEmbeddedDocuments("Item", [{
    name: `${TRADITION_RU[sc.tradition] ?? sc.tradition} ${CAST_TYPE_RU[type] ?? type} заклинания`,
    type: "spellcastingEntry",
    system: {
      tradition: { value: sc.tradition ?? "arcane" },
      prepared: { value: type },
      ability: { value: sc.attribute ?? "cha" },
      spelldc: { value: sc.attack, dc: sc.dc },
      showSlotlessLevels: { value: false },
    },
  }]);

  const spellData = [];
  for (const ref of sc.spells ?? []) {
    const doc = await resolveItem(ref, (q) => searchSpells(q, { limit: 5 }));
    if (!doc) { missing.push(ref.name ?? ref.uuid); continue; }
    const d = doc.toObject();
    delete d._id;
    const baseRank = d.system.traits?.value?.includes("cantrip") ? 0 : d.system.level?.value ?? 1;
    const rank = Math.max(baseRank, Number(ref.rank ?? baseRank));
    d.system.location = { value: entry.id };
    if (rank > baseRank && baseRank > 0) d.system.location.heightenedLevel = rank;
    if (type === "innate" && baseRank > 0) d.system.location.uses = { value: 1, max: 1 };
    d.flags = { ...(d.flags ?? {}), "pf2e-creature-forge": { rank } };
    spellData.push(d);
  }
  if (!spellData.length) return;
  const created = await actor.createEmbeddedDocuments("Item", spellData);

  if (type === "prepared" || type === "spontaneous") {
    const slots = {};
    for (const sp of created) {
      const rank = sp.flags?.["pf2e-creature-forge"]?.rank ?? 0;
      const key = `slot${rank}`;
      slots[key] ??= { max: 0, value: 0, prepared: [] };
      if (type === "prepared") {
        slots[key].prepared.push({ id: sp.id, expended: false });
        slots[key].max += 1;
      } else {
        slots[key].max = rank === 0 ? 0 : 3;
        slots[key].value = slots[key].max;
      }
    }
    await entry.update({ "system.slots": slots });
  }
}
