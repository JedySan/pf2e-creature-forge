// Подсказки в листе NPC (по желанию, выключены по умолчанию): рядом с числами — метка тира GM Core.
// Сводная строка над листом убрана — она сдвигала вёрстку; смена уровня — кнопкой в шапке листа.
import { tierOf, statValue, STAT_TIERS, TIER_RU, TIER_RU_FULL } from "./tables.js";
import { MODULE_ID } from "./forge.js";

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

  });
}
