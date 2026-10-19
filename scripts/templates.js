// Шаблоны существ: накладываются на готового NPC одной кнопкой.
// Элитный/Слабый — родная корректировка pf2e (actor.applyAdjustment).
// Остальные — трейты, иммунитеты/слабости/сопротивления по таблице GM Core, чувства, скорости,
// доп. урон к ударам и готовые способности с тегами.
// templateUpdates — чистая функция (тестируется без Foundry).
import { statValue } from "./tables.js";
import { customAbilityData } from "./abilities.js";

/** Доп. урон стихии к ударам по уровню. */
export function elementalDie(level) {
  const L = Number(level);
  return L >= 15 ? "3d6" : L >= 10 ? "2d6" : L >= 5 ? "1d6" : "1d4";
}

export const TEMPLATES = {
  elite: { label: "Элитный", hint: "+2 к КБ, атакам, КС, спасброскам, навыкам и урону, больше HP (правила GM Core).", adjustment: "elite" },
  weak: { label: "Слабый", hint: "−2 ко всему, меньше HP (правила GM Core).", adjustment: "weak" },
  undead: {
    label: "Нежить",
    hint: "Восставший мертвец: трейт нежити, иммунитеты нежити, слабость к жизненной силе, тёмное зрение.",
    traits: ["undead", "mindless"],
    immunities: ["death-effects", "disease", "paralyzed", "poison", "sleep", "unconscious"],
    weaknesses: [{ type: "vitality", tier: "max" }],
    senses: ["darkvision"],
    abilities: [{ name: "Исцеление пустотой", actions: "passive", traits: ["void"],
      description: "Урон пустотой лечит существо, а жизненная сила ранит." }],
  },
  aquatic: {
    label: "Водное",
    hint: "Обитатель глубин: амфибия, скорость плавания как наземная, сопротивление холоду.",
    traits: ["amphibious", "water"],
    resistances: [{ type: "cold", tier: "min" }],
    speeds: { swim: "land" },
    abilities: [{ name: "Глубинный рывок", actions: "1", traits: ["move", "water"],
      description: "Существо Плывёт дважды. Только в воде." }],
  },
  fiery: {
    label: "Огненное",
    hint: "Пылающее: иммунитет к огню, слабость к холоду, удары обжигают.",
    traits: ["fire"],
    immunities: ["fire"],
    weaknesses: [{ type: "cold", tier: "max" }],
    strikeExtra: "fire",
  },
  icy: {
    label: "Ледяное",
    hint: "Морозное: иммунитет к холоду, слабость к огню, удары леденят.",
    traits: ["cold"],
    immunities: ["cold"],
    weaknesses: [{ type: "fire", tier: "max" }],
    strikeExtra: "cold",
  },
  shadow: {
    label: "Теневое",
    hint: "Порождение теней: тёмное зрение, сопротивление пустоте, прячется во мраке.",
    traits: ["shadow"],
    resistances: [{ type: "void", tier: "min" }],
    weaknesses: [{ type: "holy", tier: "min" }],
    senses: ["darkvision"],
    abilities: [{ name: "Слиться с тенью", actions: "1", traits: ["concentrate", "darkness"],
      description: "В тусклом свете или темноте существо Прячется, даже если за ним наблюдают." }],
  },
};

/**
 * Изменения для наложения шаблона (кроме Элитного/Слабого).
 * src — actor._source, items — _source предметов. Возвращает { actor, items, create, changes }.
 */
export function templateUpdates(src, items, key) {
  const t = TEMPLATES[key];
  if (!t || t.adjustment) throw new Error(`Шаблон «${key}» применяется корректировкой pf2e`);
  const s = src.system;
  const level = Number(s.details?.level?.value ?? 1);
  const u = {};
  const changes = [];

  if (t.traits?.length) {
    const cur = s.traits?.value ?? [];
    const next = [...new Set([...cur, ...t.traits])];
    if (next.length !== cur.length) { u["system.traits.value"] = next; changes.push(`Трейты: +${t.traits.filter((x) => !cur.includes(x)).join(", ")}`); }
  }

  if (t.immunities?.length) {
    const cur = s.attributes?.immunities ?? [];
    const add = t.immunities.filter((type) => !cur.some((x) => x.type === type)).map((type) => ({ type }));
    if (add.length) { u["system.attributes.immunities"] = [...cur, ...add]; changes.push(`Иммунитеты: ${add.map((x) => x.type).join(", ")}`); }
  }

  for (const kind of ["weaknesses", "resistances"]) {
    if (!t[kind]?.length) continue;
    const cur = [...(s.attributes?.[kind] ?? [])];
    let touched = false;
    for (const w of t[kind]) {
      const value = statValue("iwr", level, w.tier);
      const i = cur.findIndex((x) => x.type === w.type);
      if (i >= 0) { if ((cur[i].value ?? 0) >= value) continue; cur[i] = { ...cur[i], value }; }
      else cur.push({ type: w.type, value });
      touched = true;
      changes.push(`${kind === "weaknesses" ? "Слабость" : "Сопротивление"}: ${w.type} ${value}`);
    }
    if (touched) u[`system.attributes.${kind}`] = cur;
  }

  if (t.senses?.length) {
    const cur = s.perception?.senses ?? [];
    const add = t.senses.filter((type) => !cur.some((x) => x.type === type)).map((type) => ({ type }));
    if (add.length) { u["system.perception.senses"] = [...cur, ...add]; changes.push(`Чувства: ${add.map((x) => x.type).join(", ")}`); }
  }

  if (t.speeds) {
    const land = Number(s.attributes?.speed?.value ?? 25);
    const cur = [...(s.attributes?.speed?.otherSpeeds ?? [])];
    for (const [type, v] of Object.entries(t.speeds)) {
      const value = v === "land" ? land : Number(v);
      const i = cur.findIndex((x) => x.type === type);
      if (i >= 0 && cur[i].value >= value) continue;
      if (i >= 0) cur[i] = { ...cur[i], value }; else cur.push({ type, value });
      changes.push(`Скорость (${type}): ${value} фт`);
    }
    u["system.attributes.speed.otherSpeeds"] = cur;
  }

  const itemUpdates = [];
  if (t.strikeExtra) {
    const die = elementalDie(level);
    for (const it of items.filter((i) => i.type === "melee")) {
      const rolls = it.system?.damageRolls ?? {};
      if (Object.values(rolls).some((r) => r.damageType === t.strikeExtra && r.category !== "persistent")) continue;
      const id = `forge${key}`;
      itemUpdates.push({ _id: it._id, [`system.damageRolls.${id}`]: { damage: die, damageType: t.strikeExtra, category: null } });
      changes.push(`${it.name}: +${die} ${t.strikeExtra}`);
    }
  }

  const names = new Set(items.map((i) => i.name));
  const create = (t.abilities ?? []).filter((a) => !names.has(a.name))
    .map((a) => customAbilityData({ custom: true, ...a }, level));
  for (const c of create) changes.push(`Способность: ${c.name}`);

  return { actor: u, items: itemUpdates, create, changes };
}
