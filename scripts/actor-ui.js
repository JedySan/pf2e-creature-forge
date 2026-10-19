// Действия Кузни над готовым NPC: шаблоны, добыча, общее меню (уровень / шаблон / добыча).
import { TEMPLATES, templateUpdates } from "./templates.js";
import { addLoot } from "./loot.js";
import { ensureFolder } from "./forge.js";
import { openRescaleDialog } from "./rescale-ui.js";

const esc = (s) => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

async function copyActor(actor, suffix) {
  const data = actor.toObject();
  delete data._id;
  data.name = `${actor.name} (${suffix})`;
  data.folder = (await ensureFolder()).id;
  return Actor.implementation.create(data);
}

/** Наложить шаблон. copy — сначала создать копию. Возвращает { actor, changes }. */
export async function applyTemplate(actor, key, { copy = false } = {}) {
  if (actor?.type !== "npc") throw new Error("Шаблоны накладываются только на NPC");
  const t = TEMPLATES[key];
  if (!t) throw new Error(`Нет шаблона «${key}». Есть: ${Object.keys(TEMPLATES).join(", ")}`);
  const target = copy ? await copyActor(actor, t.label.toLowerCase()) : actor;
  if (t.adjustment) {
    await target.applyAdjustment(t.adjustment);
    return { actor: target, changes: [t.hint] };
  }
  const up = templateUpdates(target._source, target.items.map((i) => i._source), key);
  if (Object.keys(up.actor).length) await target.update(up.actor);
  if (up.items.length) await target.updateEmbeddedDocuments("Item", up.items);
  if (up.create.length) await target.createEmbeddedDocuments("Item", up.create);
  return { actor: target, changes: up.changes };
}

export async function openTemplateDialog(actor) {
  const { DialogV2 } = foundry.applications.api;
  const opts = Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.label)} — ${esc(t.hint)}</option>`).join("");
  const result = await DialogV2.prompt({
    window: { title: `Шаблон: ${actor.name}`, icon: "fa-solid fa-layer-group" },
    content: `
      <div class="form-group"><label>Шаблон</label><select name="key">${opts}</select></div>
      <div class="form-group"><label>Создать копию</label><input type="checkbox" name="copy"></div>`,
    ok: { label: "Наложить", icon: "fa-solid fa-hammer",
      callback: (e, b) => ({ key: b.form.elements.key.value, copy: b.form.elements.copy.checked }) },
    rejectClose: false,
  });
  if (!result) return;
  try {
    const r = await applyTemplate(actor, result.key, { copy: result.copy });
    ui.notifications.info(`Кузня: «${r.actor.name}» — ${TEMPLATES[result.key].label}${r.changes.length ? ": " + r.changes.slice(0, 4).join("; ") : ""}`);
    if (result.copy) r.actor.sheet.render(true);
  } catch (e) {
    ui.notifications.error(`Кузня: ${e.message}`);
  }
}

export async function openLootDialog(actor) {
  const { DialogV2 } = foundry.applications.api;
  const lvl = actor.system.details.level.value;
  const result = await DialogV2.prompt({
    window: { title: `Добыча: ${actor.name}`, icon: "fa-solid fa-coins" },
    content: `
      <p>Предметы обычной редкости из компендиума и монеты по таблице сокровищ GM Core.</p>
      <div class="form-group"><label>Кто это</label><select name="kind">
        <option value="boss">Босс — магический предмет, расходник, монеты</option>
        <option value="regular">Обычный враг — расходник и немного монет</option></select></div>
      <div class="form-group"><label>Уровень добычи</label><input type="number" name="level" value="${lvl}" min="0" max="20"></div>`,
    ok: { label: "Положить", icon: "fa-solid fa-coins",
      callback: (e, b) => ({ kind: b.form.elements.kind.value, level: b.form.elements.level.valueAsNumber }) },
    rejectClose: false,
  });
  if (!result) return;
  try {
    const r = await addLoot(actor, { kind: result.kind, level: Number.isFinite(result.level) ? result.level : lvl });
    ui.notifications.info(`Кузня: «${actor.name}» получил ${[...r.items, `${r.coins} зм`].join(", ")}`);
  } catch (e) {
    ui.notifications.error(`Кузня: ${e.message}`);
  }
}

/** Общее меню Кузни для NPC. */
export async function openForgeMenu(actor) {
  const { DialogV2 } = foundry.applications.api;
  const choice = await DialogV2.wait({
    window: { title: `Кузня: ${actor.name}`, icon: "fa-solid fa-hammer" },
    content: "<p>Что сделать с существом?</p>",
    buttons: [
      { action: "level", label: "Сменить уровень", icon: "fa-solid fa-arrows-up-down" },
      { action: "template", label: "Шаблон", icon: "fa-solid fa-layer-group" },
      { action: "loot", label: "Добыча", icon: "fa-solid fa-coins" },
    ],
    rejectClose: false,
  });
  if (choice === "level") return openRescaleDialog(actor);
  if (choice === "template") return openTemplateDialog(actor);
  if (choice === "loot") return openLootDialog(actor);
}

/** Точки входа: кнопка «Кузня» в шапке листа NPC и пункты меню правого клика в каталоге актёров. */
export function registerActorUI() {
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if (!game.user.isGM || sheet.actor?.type !== "npc") return;
    buttons.unshift({ label: "Кузня", class: "forge-menu", icon: "fa-solid fa-hammer", onclick: () => openForgeMenu(sheet.actor) });
  });
  // Листы на ApplicationV2 — пункт в меню шапки.
  Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
    const actor = app.document ?? app.actor;
    if (!game.user.isGM || !(actor instanceof Actor) || actor.type !== "npc") return;
    controls.unshift({ label: "Кузня существ", icon: "fa-solid fa-hammer", action: "forgeMenu", onClick: () => openForgeMenu(actor) });
  });

  const idOf = (li) => {
    const el = li instanceof HTMLElement ? li : li?.[0];
    return el?.dataset?.entryId ?? el?.dataset?.documentId;
  };
  const entries = [
    ["Кузня: сменить уровень", "fa-arrows-up-down", openRescaleDialog],
    ["Кузня: шаблон", "fa-layer-group", openTemplateDialog],
    ["Кузня: добыча", "fa-coins", openLootDialog],
  ].map(([name, icon, fn]) => ({
    name,
    icon: `<i class="fa-solid ${icon}"></i>`,
    condition: (li) => game.user.isGM && game.actors.get(idOf(li))?.type === "npc",
    callback: (li) => fn(game.actors.get(idOf(li))),
  }));
  Hooks.on("getActorContextOptions", (app, options) => options.push(...entries));       // v13+
  Hooks.on("getActorDirectoryEntryContext", (html, options) => options.push(...entries)); // v12
}
