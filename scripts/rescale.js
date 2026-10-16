// Смена уровня готового NPC по таблицам GM Core.
// Каждая характеристика сохраняет ступень (экстр./высок./…) и ручную поправку относительно неё:
// новое = значение ступени на новом уровне + (старое − значение ступени на старом уровне).
// Работает с исходными данными (_source), чтобы не учитывать Элитный/Слабый шаблон дважды.
import { STAT_TIERS, statValue, strikeDamage, spellStats, averageDamage, hpRange } from "./tables.js";

function nearestTier(stat, level, value, tiers = STAT_TIERS[stat]) {
  let best = null;
  for (const t of tiers) {
    const v = statValue(stat, level, t);
    if (v === null || v === undefined) continue;
    const d = Math.abs(value - v);
    if (!best || d < best.d) best = { tier: t, v, d };
  }
  return best;
}

function shift(stat, from, to, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const n = nearestTier(stat, from, value);
  if (!n) return value;
  return statValue(stat, to, n.tier) + (value - n.v);
}

function mid([lo, hi]) {
  return (lo + hi) / 2;
}

/** HP: пропорционально середине ступени. */
function shiftHp(from, to, hp) {
  let best = null;
  for (const t of STAT_TIERS.hp) {
    const m = mid(hpRange(from, t));
    const d = Math.abs(hp - m);
    if (!best || d < best.d) best = { t, m, d };
  }
  return Math.max(1, Math.round(hp / best.m * mid(hpRange(to, best.t))));
}

function avgOf(formula) {
  const f = String(formula).replace(/\s/g, "");
  const m = f.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 + Number(m[3] ?? 0) : null;
}

/** Основной урон удара: ближайшая по среднему ступень → формула той же ступени на новом уровне. */
function shiftDamage(from, to, formula) {
  const avg = avgOf(formula);
  if (avg === null) return formula;
  let best = null;
  for (const t of STAT_TIERS.strikeDamage) {
    const d = Math.abs(averageDamage(strikeDamage(from, t)) - avg);
    if (!best || d < best.d) best = { t, d };
  }
  return strikeDamage(to, best.t);
}

function shiftSpellDc(from, to, dc) {
  let best = null;
  for (const t of STAT_TIERS.spell) {
    const v = spellStats(from, t).dc;
    const d = Math.abs(dc - v);
    if (!best || d < best.d) best = { t, v, d };
  }
  return spellStats(to, best.t).dc + (dc - best.v);
}

function shiftIwr(from, to, value) {
  const n = nearestTier("iwr", from, value);
  return n ? statValue("iwr", to, n.tier) + (value - n.v) : value;
}

/**
 * Посчитать изменения для перевода NPC на новый уровень.
 * src — actor._source (NPC), items — массив _source предметов.
 * Возвращает { actor: update, items: [update], changes: [строки для отчёта] }.
 */
export function rescaleUpdates(src, items, to) {
  const from = Number(src.system.details.level.value);
  const s = src.system;
  const changes = [];
  const u = { "system.details.level.value": to };
  const note = (label, a, b) => { if (a !== b) changes.push(`${label}: ${a} → ${b}`); };

  for (const k of ["str", "dex", "con", "int", "wis", "cha"]) {
    const v = s.abilities?.[k]?.mod;
    if (typeof v === "number") u[`system.abilities.${k}.mod`] = shift("attribute", from, to, v);
  }
  if (typeof s.perception?.mod === "number") {
    u["system.perception.mod"] = shift("perception", from, to, s.perception.mod);
    note("Восприятие", s.perception.mod, u["system.perception.mod"]);
  }
  const ac = s.attributes?.ac?.value;
  if (typeof ac === "number") { u["system.attributes.ac.value"] = shift("ac", from, to, ac); note("КБ", ac, u["system.attributes.ac.value"]); }

  const hpMax = s.attributes?.hp?.max ?? s.attributes?.hp?.value;
  if (typeof hpMax === "number") {
    const nhp = shiftHp(from, to, hpMax);
    u["system.attributes.hp.max"] = nhp;
    u["system.attributes.hp.value"] = nhp;
    note("HP", hpMax, nhp);
  }
  for (const k of ["fortitude", "reflex", "will"]) {
    const v = s.saves?.[k]?.value;
    if (typeof v === "number") { u[`system.saves.${k}.value`] = shift("save", from, to, v); note({ fortitude: "Стойкость", reflex: "Рефлекс", will: "Воля" }[k], v, u[`system.saves.${k}.value`]); }
  }
  for (const [slug, sk] of Object.entries(s.skills ?? {})) {
    if (typeof sk?.base === "number") u[`system.skills.${slug}.base`] = shift("skill", from, to, sk.base);
  }
  for (const kind of ["weaknesses", "resistances"]) {
    const list = s.attributes?.[kind];
    if (Array.isArray(list) && list.some((x) => typeof x.value === "number")) {
      u[`system.attributes.${kind}`] = list.map((x) => (typeof x.value === "number" ? { ...x, value: shiftIwr(from, to, x.value) } : x));
    }
  }

  const itemUpdates = [];
  for (const it of items) {
    if (it.type === "melee") {
      const iu = { _id: it._id };
      const bonus = it.system?.bonus?.value;
      if (typeof bonus === "number") iu["system.bonus.value"] = shift("strikeAttack", from, to, bonus);
      const rolls = it.system?.damageRolls ?? {};
      const mainKey = Object.keys(rolls).find((k) => rolls[k]?.category !== "persistent" && avgOf(rolls[k]?.damage) !== null);
      if (mainKey) iu[`system.damageRolls.${mainKey}.damage`] = shiftDamage(from, to, rolls[mainKey].damage);
      itemUpdates.push(iu);
      changes.push(`${it.name}: +${bonus} → +${iu["system.bonus.value"]}${mainKey ? `, ${rolls[mainKey].damage} → ${iu[`system.damageRolls.${mainKey}.damage`]}` : ""}`);
    } else if (it.type === "spellcastingEntry") {
      const dc = it.system?.spelldc?.dc;
      if (typeof dc === "number") {
        const ndc = shiftSpellDc(from, to, dc);
        const atk = it.system.spelldc.value;
        itemUpdates.push({ _id: it._id, "system.spelldc.dc": ndc, "system.spelldc.value": typeof atk === "number" ? atk + (ndc - dc) : ndc - 8 });
        changes.push(`${it.name}: КС ${dc} → ${ndc}`);
      }
    }
  }

  return { from, to, actor: u, items: itemUpdates, changes };
}
