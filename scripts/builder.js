// Ядро: спецификация существа → числа по таблицам → данные NPC pf2e.
// Чистые функции без Foundry — их же использует мастер, подсказки и Claude (через API).
//
// Спецификация (spec):
// {
//   name, level, size: "tiny|sm|med|lg|huge|grg", rarity: "common|uncommon|rare|unique",
//   traits: ["undead", ...], languages: ["common", ...], senses: ["darkvision", "scent 30", ...],
//   description: "текст",
//   attributes: { str|dex|con|int|wis|cha: тир | число },
//   perception, ac, hp: тир | число,
//   saves: { fortitude|reflex|will: тир | число },
//   skills: [{ slug: "athletics", tier: тир | число }],
//   speed: { land: 25, fly?, swim?, climb?, burrow? },
//   strikes: [{ name, ranged, range?, damageType, attack: тир|число, damage: тир|"2d8+5",
//               traits: ["agile", "reach-10"], extra?: "1d6 fire" }],
//   spellcasting: null | { tradition, type: "innate|prepared|spontaneous", tier: тир, attribute,
//                          spells: [{ name | uuid, rank }] },
//   iwr: [{ kind: "immunity|weakness|resistance", type: "fire", value?: "max|min"|число }],
//   abilities: [{ uuid } | { name }],
// }
// Тир: "extreme" | "high" | "moderate" | "low" | "terrible".
import { statValue, strikeDamage, spellStats, averageDamage, hpRange, TIER_RU } from "./tables.js";

const ATTRS = ["str", "dex", "con", "int", "wis", "cha"];
const SAVES = ["fortitude", "reflex", "will"];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Значение: число как есть, тир → по таблице. */
function resolve(stat, level, v, fallback = "moderate") {
  if (isNum(v)) return v;
  return statValue(stat, level, v ?? fallback);
}

export function computeStats(spec) {
  const level = Number(spec.level ?? 1);
  const warnings = [];

  const attributes = Object.fromEntries(ATTRS.map((a) => [a, resolve("attribute", level, spec.attributes?.[a])]));
  const saves = Object.fromEntries(SAVES.map((s) => [s, resolve("save", level, spec.saves?.[s])]));

  const skills = (spec.skills ?? []).map((sk) => ({ slug: sk.slug, mod: resolve("skill", level, sk.tier) }));

  const strikes = (spec.strikes ?? []).map((st) => {
    const attack = resolve("strikeAttack", level, st.attack);
    let damage = st.damage ?? "moderate";
    if (["extreme", "high", "moderate", "low"].includes(damage)) damage = strikeDamage(level, damage);
    return {
      name: st.name || "Удар",
      ranged: !!st.ranged,
      range: st.ranged ? Number(st.range) || 30 : null,
      attack,
      damage,
      average: averageDamage(damage),
      damageType: st.damageType || "bludgeoning",
      traits: (st.traits ?? []).filter(Boolean),
      extra: st.extra || null,
    };
  });

  let spellcasting = null;
  if (spec.spellcasting) {
    const sc = spec.spellcasting;
    const { dc, attack } = spellStats(level, ["extreme", "high", "moderate"].includes(sc.tier) ? sc.tier : "moderate");
    spellcasting = { ...sc, dc, attack };
  }

  const iwr = (spec.iwr ?? []).map((x) => {
    if (x.kind === "immunity") return { kind: "immunity", type: x.type };
    const value = isNum(x.value) ? x.value : statValue("iwr", level, x.value === "min" ? "min" : "max");
    return { kind: x.kind, type: x.type, value };
  });

  const out = {
    name: spec.name || "Существо",
    level,
    size: spec.size || "med",
    rarity: spec.rarity || "common",
    traits: spec.traits ?? [],
    languages: spec.languages ?? [],
    senses: spec.senses ?? [],
    description: spec.description ?? "",
    attributes,
    perception: resolve("perception", level, spec.perception),
    ac: resolve("ac", level, spec.ac),
    hp: resolve("hp", level, spec.hp),
    saves,
    skills,
    speed: { land: 25, ...(spec.speed ?? {}) },
    strikes,
    spellcasting,
    iwr,
    abilities: spec.abilities ?? [],
    roleAbilities: spec.roleAbilities ?? [],
  };

  // Баланс по GM Core: экстремальные значения должны компенсироваться низкими.
  const tiers = [
    spec.perception, spec.ac, spec.hp,
    ...SAVES.map((s) => spec.saves?.[s]),
    ...(spec.strikes ?? []).flatMap((s) => [s.attack, s.damage]),
  ].filter((t) => typeof t === "string");
  const extremes = tiers.filter((t) => t === "extreme").length;
  const weak = tiers.filter((t) => t === "low" || t === "terrible").length;
  if (extremes > weak + 1) warnings.push(`Экстремальных значений ${extremes}, а низких ${weak} — существо может оказаться сильнее своего уровня.`);
  if (weak > extremes + 4) warnings.push(`Много низких значений (${weak}) — существо может оказаться слабее своего уровня.`);
  if (!strikes.length && !spellcasting) warnings.push("У существа нет ни ударов, ни заклинаний.");
  if (isNum(spec.hp)) {
    const [lo] = hpRange(level, "low");
    const [, hi] = hpRange(level, "high");
    if (spec.hp < lo || spec.hp > hi) warnings.push(`HP ${spec.hp} вне шкалы уровня ${level} (${lo}–${hi}).`);
  }
  out.warnings = warnings;
  return out;
}

/** Краткое описание тира для текста. */
export function tierLabel(v) {
  return typeof v === "string" ? TIER_RU[v] ?? v : "своё";
}

const SPEED_TYPES = ["fly", "swim", "climb", "burrow"];

/** Данные pf2e NPC (source) без способностей из компендиума и заклинаний — их добавляет forge.js. */
export function toActorData(stats, { img } = {}) {
  const items = stats.strikes.map((st) => {
    const damageRolls = { main: { damage: st.damage, damageType: st.damageType, category: null } };
    if (st.extra) {
      const m = String(st.extra).trim().match(/^(\S+)\s+(?:(persistent|продолж\.?)\s+)?(\S+)$/i);
      if (m) damageRolls.extra = { damage: m[1], damageType: m[3], category: m[2] ? "persistent" : null };
    }
    return {
      name: st.name,
      type: "melee",
      img: st.ranged ? "systems/pf2e/icons/default-icons/ranged.svg" : "systems/pf2e/icons/default-icons/melee.svg",
      system: {
        bonus: { value: st.attack },
        damageRolls,
        traits: { value: st.traits, config: {} },
        attackEffects: { value: [] },
        range: st.ranged ? { increment: st.range, max: null } : null,
        description: { value: "" },
      },
    };
  });

  const otherSpeeds = SPEED_TYPES.filter((t) => Number(stats.speed[t]) > 0).map((t) => ({ type: t, value: Number(stats.speed[t]) }));

  const senses = stats.senses.map((s) => {
    const [type, range] = String(s).trim().split(/\s+/);
    return range ? { type, range: Number(range), acuity: "imprecise" } : { type };
  });

  return {
    name: stats.name,
    type: "npc",
    img: img ?? "systems/pf2e/icons/default-icons/npc.svg",
    system: {
      details: {
        level: { value: stats.level },
        publicNotes: stats.description ? `<p>${stats.description}</p>` : "",
        languages: { value: stats.languages, details: "" },
        blurb: "",
      },
      abilities: Object.fromEntries(Object.entries(stats.attributes).map(([k, v]) => [k, { mod: v }])),
      perception: { mod: stats.perception, senses, details: "", vision: true },
      attributes: {
        ac: { value: stats.ac, details: "" },
        hp: { value: stats.hp, max: stats.hp, temp: 0, details: "" },
        speed: { value: Number(stats.speed.land) || 0, otherSpeeds, details: "" },
        immunities: stats.iwr.filter((x) => x.kind === "immunity").map((x) => ({ type: x.type })),
        weaknesses: stats.iwr.filter((x) => x.kind === "weakness").map((x) => ({ type: x.type, value: x.value })),
        resistances: stats.iwr.filter((x) => x.kind === "resistance").map((x) => ({ type: x.type, value: x.value })),
      },
      saves: Object.fromEntries(Object.entries(stats.saves).map(([k, v]) => [k, { value: v, saveDetail: "" }])),
      skills: Object.fromEntries(stats.skills.map((s) => [s.slug, { base: s.mod }])),
      traits: { value: stats.traits, rarity: stats.rarity, size: { value: stats.size } },
    },
    items,
    flags: { "pf2e-creature-forge": { spec: stats.spec ?? null, version: 1 } },
  };
}
