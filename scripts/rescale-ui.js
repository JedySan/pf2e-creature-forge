// Смена уровня NPC: диалог, применение, точки входа в интерфейсе.
import { rescaleUpdates } from "./rescale.js";
import { ensureFolder } from "./forge.js";

/** Пересчитать NPC на новый уровень. copy=true — создать копию в папке «Созданные враги». */
export async function rescaleActor(actor, level, { copy = false } = {}) {
  if (actor?.type !== "npc") throw new Error("Сменить уровень можно только у NPC");
  level = Math.max(-1, Math.min(24, Math.round(Number(level))));
  let target = actor;
  if (copy) {
    const base = actor.isToken ? actor : actor;
    const data = base.toObject();
    delete data._id;
    data.name = `${actor.name} (ур. ${level})`;
    data.folder = (await ensureFolder()).id;
    target = await Actor.implementation.create(data);
  }
  const up = rescaleUpdates(target._source, target.items.map((i) => i._source), level);
  await target.update(up.actor);
  if (up.items.length) await target.updateEmbeddedDocuments("Item", up.items);
  return { actor: target, from: up.from, to: up.to, changes: up.changes };
}

export async function openRescaleDialog(actor) {
  const { DialogV2 } = foundry.applications.api;
  const lvl = actor.system.details.level.value;
  const result = await DialogV2.prompt({
    window: { title: `Сменить уровень: ${actor.name}`, icon: "fa-solid fa-arrows-up-down" },
    content: `
      <p>Все числа пересчитаются по таблицам GM Core: каждая характеристика сохранит свою ступень
      и ручные поправки. Способности и заклинания остаются как есть.</p>
      <div class="form-group"><label>Новый уровень</label>
        <input type="number" name="level" value="${lvl}" min="-1" max="24" autofocus></div>
      <div class="form-group"><label>Создать копию</label>
        <input type="checkbox" name="copy"></div>`,
    ok: {
      label: "Пересчитать",
      icon: "fa-solid fa-hammer",
      callback: (event, button) => ({
        level: button.form.elements.level.valueAsNumber,
        copy: button.form.elements.copy.checked,
      }),
    },
    rejectClose: false,
  });
  if (!result || !Number.isFinite(result.level)) return;
  try {
    const r = await rescaleActor(actor, result.level, { copy: result.copy });
    ui.notifications.info(`Кузня: «${r.actor.name}» — уровень ${r.from} → ${r.to}`);
    if (result.copy) r.actor.sheet.render(true);
  } catch (e) {
    ui.notifications.error(`Кузня: ${e.message}`);
  }
}

/** Точки входа: шапка листа (старые листы) и меню правого клика в каталоге актёров. */
export function registerRescaleUI() {
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if (!game.user.isGM || sheet.actor?.type !== "npc") return;
    buttons.unshift({ label: "Уровень", class: "forge-rescale", icon: "fa-solid fa-arrows-up-down", onclick: () => openRescaleDialog(sheet.actor) });
  });

  const entry = (getId) => ({
    name: "Сменить уровень (Кузня)",
    icon: '<i class="fa-solid fa-arrows-up-down"></i>',
    condition: (li) => game.user.isGM && game.actors.get(getId(li))?.type === "npc",
    callback: (li) => openRescaleDialog(game.actors.get(getId(li))),
  });
  const idOf = (li) => {
    const el = li instanceof HTMLElement ? li : li?.[0];
    return el?.dataset?.entryId ?? el?.dataset?.documentId;
  };
  Hooks.on("getActorContextOptions", (app, options) => options.push(entry(idOf)));       // v13+
  Hooks.on("getActorDirectoryEntryContext", (html, options) => options.push(entry(idOf))); // v12
}
