// Подсказки в листе NPC: рядом с числами — метка тира GM Core для уровня существа,
// плюс сводная строка с ударами и заклинаниями.
import { tierOf, statValue, strikeDamage, spellStats, averageDamage, STAT_TIERS, TIER_RU, TIER_RU_FULL } from "./tables.js";
import { MODULE_ID } from "./forge.js";
import { openRescaleDialog } from "./rescale-ui.js";

function badge(stat, level, value) {
  const t = tierOf(stat, level, value);
  if (!t) return null;
  const el = document.createElement("span");
  el.className = `forge-tier ${t.tier}${t.exact ? "" : " off"}`;
  el.textContent = (t.above ? "↑" : "") + TIER_RU[t.tier];
  const scale = STAT_TIERS[stat].map((tier) => `${TIER_RU_FULL[tier]}: ${stat === "attribute" || stat === "save" || stat === "perception" || stat === "strikeAttack" ? "+" : ""}${statValue(stat, level, tier)}`).join("\n");
  el.title = `Ур. ${level} по GM Core:\n${scale}${t.exact ? "" : "\n(значение между ступенями)"}`;
  return el;
}

/** Тир урона по среднему значению — ближайший в таблице. */
function damageTier(level, avg) {
  let best = null;
  for (const tier of STAT_TIERS.strikeDamage) {
    const a = averageDamage(strikeDamage(level, tier));
    const d = Math.abs(a - avg);
    if (!best || d < best.d) best = { tier, d };
  }
  return best.tier;
}

function spellTier(level, dc) {
  let best = null;
  for (const tier of STAT_TIERS.spell) {
    const d = Math.abs(spellStats(level, tier).dc - dc);
    if (!best || d < best.d) best = { tier, d };
  }
  return best.tier;
}

function avgOfRolls(damageRolls) {
  let sum = 0;
  for (const r of Object.values(damageRolls ?? {})) {
    if (r.category === "persistent") continue;
    const m = String(r.damage).replace(/\s/g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (m) sum += Number(m[1]) * (Number(m[2]) + 1) / 2 + Number(m[3] ?? 0);
    else if (/^\d+$/.test(String(r.damage))) sum += Number(r.damage);
  }
  return Math.floor(sum);
}

function summary(actor) {
  const level = actor.level;
  const parts = [];
  for (const s of (actor.system.actions ?? []).filter((a) => a.type === "strike")) {
    const atk = s.totalModifier;
    const at = tierOf("strikeAttack", level, atk);
    const avg = avgOfRolls(s.item?.system?.damageRolls);
    const dt = avg ? damageTier(level, avg) : null;
    parts.push(`<b>${s.label}</b>: атака ${TIER_RU[at?.tier] ?? "?"} (+${atk})${dt ? `, урон ${TIER_RU[dt]} (≈${avg})` : ""}`);
  }
  for (const e of actor.itemTypes.spellcastingEntry ?? []) {
    const dc = e.statistic?.dc?.value ?? e.system?.spelldc?.dc;
    if (dc) parts.push(`<b>${e.name}</b>: КС ${dc} — ${TIER_RU[spellTier(level, dc)]}`);
  }
  if (!parts.length && !game.user.isGM) return null;
  const el = document.createElement("div");
  el.className = "forge-summary";
  el.style.cssText = "font-size:11px;padding:3px 8px;opacity:.9;border-bottom:1px solid rgba(127,127,127,.4)";
  el.innerHTML = `⚒ Кузня, ур. ${level}` + (parts.length ? ": " + parts.join(" · ") : "");
  if (game.user.isGM) {
    const a = document.createElement("a");
    a.textContent = " · Сменить уровень";
    a.style.cssText = "cursor:pointer;text-decoration:underline;margin-left:4px";
    a.addEventListener("click", (ev) => { ev.preventDefault(); openRescaleDialog(actor); });
    el.append(a);
  }
  return el;
}

const INPUTS = [
  ["system.attributes.ac.value", "ac", (a) => a.system.attributes.ac.value],
  ["system.attributes.hp.max", "hp", (a) => a.system.attributes.hp.max],
  ["system.saves.fortitude.value", "save", (a) => a.saves?.fortitude?.mod],
  ["system.saves.reflex.value", "save", (a) => a.saves?.reflex?.mod],
  ["system.saves.will.value", "save", (a) => a.saves?.will?.mod],
  ["system.perception.mod", "perception", (a) => a.perception?.mod],
  ...["str", "dex", "con", "int", "wis", "cha"].map((k) => [`system.abilities.${k}.mod`, "attribute", (a) => a.system.abilities?.[k]?.mod]),
];

export function registerSheetHints() {
  Hooks.on("renderActorSheet", (app, html) => {
    const actor = app.actor ?? app.document;
    if (actor?.type !== "npc") return;
    if (!game.settings.get(MODULE_ID, "sheetHints")) return;
    const root = html instanceof HTMLElement ? html : html?.[0] ?? app.element?.[0] ?? app.element;
    if (!root?.querySelector) return;
    root.querySelectorAll(".forge-tier, .forge-summary").forEach((e) => e.remove());

    const level = actor.level;
    for (const [name, stat, getter] of INPUTS) {
      const input = root.querySelector(`input[name="${name}"]`);
      if (!input) continue;
      const b = badge(stat, level, Number(getter(actor) ?? input.value));
      if (b) input.after(b);
    }

    const sum = summary(actor);
    const content = root.querySelector(".window-content") ?? root;
    if (sum) content.prepend(sum);
  });
}
