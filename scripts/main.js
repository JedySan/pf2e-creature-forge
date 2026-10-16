// Кузня существ — точка входа.
import { CreatureForge } from "./wizard.js";
import { registerSheetHints } from "./sheet-hints.js";
import { createCreature, searchAbilities, searchSpells, MODULE_ID, DEFAULT_FOLDER, folderName, ensureFolder, migrateLegacyFolders } from "./forge.js";
import { computeStats, toActorData } from "./builder.js";
import { ROLES, applyRole, emptySpec, maxSpellRank } from "./roles.js";
import * as tables from "./tables.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "sheetHints", {
    name: "Подсказки тиров в листе NPC",
    hint: "Рядом с КБ, HP, спасбросками, Восприятием и характеристиками — ступень GM Core для уровня существа.",
    scope: "client", config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, "folderName", {
    name: "Папка для созданных врагов",
    hint: "Сюда кладутся существа из Кузни и монстры, которых импортирует PF2e Claude Bridge.",
    scope: "world", config: true, type: String, default: DEFAULT_FOLDER,
  });
  registerSheetHints();
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  // Публичный API — им пользуется PF2e Claude Bridge (и любые макросы).
  mod.api = {
    /** Открыть мастер; spec — необязательная заготовка (например, от Claude). */
    open: (spec) => new CreatureForge(spec).render(true),
    /** Создать существо без мастера. */
    create: (spec, opts) => createCreature(spec, opts),
    /** Посчитать числа без создания (предпросмотр). */
    preview: (spec) => computeStats(spec),
    applyRole: (spec, role) => applyRole(spec, role),
    emptySpec,
    roles: () => Object.fromEntries(Object.entries(ROLES).map(([k, r]) => [k, { label: r.label, hint: r.hint }])),
    searchAbilities,
    searchSpells,
    maxSpellRank,
    tables,
    toActorData,
    /** Общая папка для созданных врагов (её же использует PF2e Claude Bridge). */
    folderName,
    ensureFolder,
  };

  if (game.users.activeGM?.isSelf) {
    migrateLegacyFolders().catch((e) => console.error("[pf2e-creature-forge] перенос папок", e));
  }
});

// Кнопка в каталоге актёров (только ГМ).
Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".pf2e-forge-open")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pf2e-forge-open";
  btn.innerHTML = '<i class="fa-solid fa-hammer"></i> Кузня существ';
  btn.addEventListener("click", () => new CreatureForge().render(true));
  const target = root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root;
  target.append(btn);
});
