// Мастер «Кузня существ» (ApplicationV2 без шаблонов: HTML собирается здесь же).
import { computeStats } from "./builder.js";
import { ROLES, applyRole, emptySpec, maxSpellRank } from "./roles.js";
import { STAT_TIERS, TIER_RU_FULL, MIN_LEVEL, MAX_LEVEL, hpRange } from "./tables.js";
import { createCreature, searchAbilities, searchSpells, TRADITION_RU, CAST_TYPE_RU } from "./forge.js";
import { roleAbilities } from "./role-abilities.js";
import { TEMPLATES } from "./templates.js";
import { ACTION_TYPES, COMMON_TRAITS, suggestTraits, normalizeTraits } from "./abilities.js";
import { ATTR_RU, SAVE_RU, SKILL_RU, SIZE_RU, RARITY_RU, DAMAGE_RU, IWR_KIND_RU, IWR_TYPES, TRADITION_LIST } from "./labels.js";

const { ApplicationV2 } = foundry.applications.api;
const esc = (s) => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);

function options(map, selected) {
  return Object.entries(map).map(([v, l]) => `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(l)}</option>`).join("");
}

/** Трейты способностей pf2e: ключ → русское название (из системы, если она загружена). */
function traitLabels() {
  const cfg = globalThis.CONFIG?.PF2E?.actionTraits ?? {};
  return Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, game.i18n.localize(v)]));
}

function tierOptions(stat, selected) {
  const map = Object.fromEntries(STAT_TIERS[stat].map((t) => [t, TIER_RU_FULL[t]]));
  const isCustom = typeof selected === "number";
  return options(map, selected) + `<option value="custom"${isCustom ? " selected" : ""}>Своё</option>`;
}

export class CreatureForge extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "jedysan-kuznya",
    classes: ["pf2e-forge"],
    window: { title: "Кузня существ", resizable: true, icon: "fa-solid fa-hammer" },
    position: { width: 900, height: 820 },
  };

  constructor(spec, options = {}) {
    super(options);
    this.spec = spec ? foundry.utils.mergeObject(emptySpec(spec.level ?? 1), spec, { inplace: false }) : emptySpec(1);
    this.abilityResults = [];
    this.spellResults = [];
    this.busy = false;
  }

  // ---------- рендер ----------

  async _renderHTML() {
    const s = this.spec;
    const st = computeStats(s);
    const lvl = st.level;

    const statRow = (label, stat, path, value, current) => `
      <div class="row">
        <label>${label}</label>
        <select data-tier="${path}" data-stat="${stat}">${tierOptions(stat, current)}</select>
        <input type="number" data-num="${path}" value="${value}">
      </div>`;

    const attrs = Object.keys(ATTR_RU).map((a) => statRow(ATTR_RU[a], "attribute", `attributes.${a}`, st.attributes[a], s.attributes[a])).join("");
    const saves = Object.keys(SAVE_RU).map((k) => statRow(SAVE_RU[k], "save", `saves.${k}`, st.saves[k], s.saves[k])).join("");
    const [hpLo, hpHi] = hpRange(lvl, typeof s.hp === "string" ? s.hp : "moderate");

    const skills = (s.skills ?? []).map((sk, i) => `
      <div class="row">
        <select data-path="skills.${i}.slug">${options(SKILL_RU, sk.slug)}</select>
        <select data-tier="skills.${i}.tier" data-stat="skill">${tierOptions("skill", sk.tier)}</select>
        <input type="number" data-num="skills.${i}.tier" value="${st.skills[i]?.mod ?? 0}">
        <a data-action="remove" data-list="skills" data-index="${i}" title="Убрать">✕</a>
      </div>`).join("");

    const strikes = (s.strikes ?? []).map((sk, i) => {
      const c = st.strikes[i];
      return `
      <div class="strike">
        <div class="row">
          <input type="text" data-path="strikes.${i}.name" value="${esc(sk.name)}" placeholder="Название">
          <label class="check"><input type="checkbox" data-path="strikes.${i}.ranged"${sk.ranged ? " checked" : ""}> дальний</label>
          ${sk.ranged ? `<input type="number" class="short" data-path="strikes.${i}.range" value="${sk.range ?? 30}" title="Шаг дистанции, фт">` : ""}
          <select data-path="strikes.${i}.damageType">${options(DAMAGE_RU, sk.damageType)}</select>
          <a data-action="remove" data-list="strikes" data-index="${i}" title="Убрать">✕</a>
        </div>
        <div class="row">
          <label>Атака</label>
          <select data-tier="strikes.${i}.attack" data-stat="strikeAttack">${tierOptions("strikeAttack", sk.attack)}</select>
          <input type="number" class="short" data-num="strikes.${i}.attack" value="${c.attack}">
          <label>Урон</label>
          <select data-tier="strikes.${i}.damage" data-stat="strikeDamage">${tierOptions("strikeDamage", ["extreme", "high", "moderate", "low"].includes(sk.damage) ? sk.damage : 0)}</select>
          <input type="text" class="dmg" data-path="strikes.${i}.damage" value="${esc(c.damage)}" title="Формула урона">
          <span class="muted">≈${c.average ?? "?"}</span>
        </div>
        <div class="row">
          <input type="text" data-list-text="strikes.${i}.traits" value="${esc((sk.traits ?? []).join(", "))}" placeholder="Трейты: agile, reach-10, finesse, deadly-d10…">
          <input type="text" data-path="strikes.${i}.extra" value="${esc(sk.extra ?? "")}" placeholder="Доп. урон: 1d6 fire, 1d4 persistent bleed">
        </div>
      </div>`;
    }).join("");

    const sc = s.spellcasting;
    const scStats = st.spellcasting;
    const maxRank = maxSpellRank(lvl, s.role === "magicalStriker" ? "half-1" : "half");
    const spells = sc ? (sc.spells ?? []).map((sp, i) => `
      <div class="row">
        <span class="grow">${esc(sp.name ?? sp.uuid)}</span>
        <label>ранг</label>
        <input type="number" class="short" data-path="spellcasting.spells.${i}.rank" value="${sp.rank ?? 1}" min="0" max="10">
        <a data-action="remove" data-list="spellcasting.spells" data-index="${i}" title="Убрать">✕</a>
      </div>`).join("") : "";
    const spellResults = this.spellResults.map((r, i) => `
      <div class="row result"><span class="grow">${esc(r.name)}</span><span class="muted">${r.rank === 0 ? "фокус" : `ранг ${r.rank}`}</span>
      <a data-action="add-spell" data-index="${i}">＋</a></div>`).join("");

    const iwr = (s.iwr ?? []).map((x, i) => `
      <div class="row">
        <select data-path="iwr.${i}.kind">${options(IWR_KIND_RU, x.kind)}</select>
        <input type="text" list="pf2e-forge-iwr-types" data-path="iwr.${i}.type" value="${esc(x.type)}" placeholder="тип">
        ${x.kind === "immunity" ? "" : `<select data-path="iwr.${i}.value">${options({ max: "макс. (узкое)", min: "мин. (широкое)" }, typeof x.value === "number" ? "" : x.value ?? "max")}</select>
          <span class="muted">${st.iwr[i]?.value ?? ""}</span>`}
        <a data-action="remove" data-list="iwr" data-index="${i}" title="Убрать">✕</a>
      </div>`).join("");

    const labels = traitLabels();
    const abilities = (s.abilities ?? []).map((a, i) => {
      if (!a.custom) return `
      <div class="row"><span class="grow">${esc(a.name ?? a.uuid)}</span>
      <a data-action="remove" data-list="abilities" data-index="${i}" title="Убрать">✕</a></div>`;
      const traits = a.traits ?? [];
      const ru = traits.map((t) => labels[t] ?? t).join(", ");
      const unknown = Object.keys(labels).length ? traits.filter((t) => !labels[t]) : [];
      const sugg = suggestTraits(a.name, a.description, a.actions).filter((t) => !traits.includes(t));
      return `
      <div class="custom-ability">
        <div class="row">
          <input type="text" class="grow" data-path="abilities.${i}.name" value="${esc(a.name)}" placeholder="Название способности">
          <select data-path="abilities.${i}.actions">${options(ACTION_TYPES, String(a.actions ?? "passive"))}</select>
          <a data-action="remove" data-list="abilities" data-index="${i}" title="Убрать">✕</a>
        </div>
        <div class="row">
          <input type="text" class="grow" list="pf2e-forge-traits" data-list-text="abilities.${i}.traits" value="${esc(traits.join(", "))}" placeholder="Теги: aura, emotion, fear… (можно по-русски)">
        </div>
        ${ru ? `<div class="muted small">Теги: ${esc(ru)}${unknown.length ? ` · <span class="warn">не знаю: ${esc(unknown.join(", "))}</span>` : ""}</div>` : '<div class="muted small warn">Нет тегов — добавьте или возьмите из подсказки</div>'}
        ${sugg.length ? `<div class="row small">Подсказка: ${sugg.map((t) => `<a class="chip" data-action="add-trait" data-index="${i}" data-trait="${esc(t)}">＋${esc(labels[t] ?? t)}</a>`).join(" ")}</div>` : ""}
        <textarea data-path="abilities.${i}.description" rows="2" placeholder="Что делает способность">${esc(a.description)}</textarea>
      </div>`;
    }).join("");
    const abilityResults = this.abilityResults.map((r, i) => `
      <div class="row result"><span class="grow">${esc(r.name)}</span><span class="muted">${esc(r.pack)}</span>
      <a data-action="add-ability" data-index="${i}">＋</a></div>`).join("");

    const warnings = st.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
    const role = ROLES[s.role] ?? ROLES.balanced;

    return `
    <form class="forge" autocomplete="off">
      <section class="head">
        <div class="row">
          <input type="text" class="name" data-path="name" value="${esc(s.name)}" placeholder="Название">
          <label>Ур.</label><input type="number" class="short" data-path="level" value="${lvl}" min="${MIN_LEVEL}" max="${MAX_LEVEL}">
          <select data-path="size">${options(SIZE_RU, s.size)}</select>
          <select data-path="rarity">${options(RARITY_RU, s.rarity)}</select>
        </div>
        <div class="row">
          <label>Роль</label>
          <select data-role>${options(Object.fromEntries(Object.entries(ROLES).map(([k, r]) => [k, r.label])), s.role)}</select>
          <span class="muted grow">${esc(role.hint)}</span>
        </div>
        <div class="row">
          <input type="text" data-list-text="traits" value="${esc((s.traits ?? []).join(", "))}" placeholder="Трейты (англ.): humanoid, undead, aquatic…">
          <input type="text" data-list-text="languages" value="${esc((s.languages ?? []).join(", "))}" placeholder="Языки: common, draconic…">
          <input type="text" data-list-text="senses" value="${esc((s.senses ?? []).join(", "))}" placeholder="Чувства: darkvision, scent 30…">
        </div>
      </section>

      <div class="cols">
        <section>
          <h3>Характеристики</h3>${attrs}
          <h3>Защита</h3>
          ${statRow("КБ", "ac", "ac", st.ac, s.ac)}
          ${statRow("HP", "hp", "hp", st.hp, s.hp)}
          <div class="muted small">Диапазон HP: ${hpLo}–${hpHi}</div>
          ${saves}
          ${statRow("Восприятие", "perception", "perception", st.perception, s.perception)}
          <h3>Скорости, фт</h3>
          <div class="row speeds">
            ${["land", "fly", "swim", "climb", "burrow"].map((k) => `<label>${{ land: "Пешком", fly: "Полёт", swim: "Плавание", climb: "Лазание", burrow: "Копание" }[k]}</label>
              <input type="number" class="short" data-path="speed.${k}" value="${s.speed?.[k] ?? ""}">`).join("")}
          </div>
          <h3>Навыки <a data-action="add-skill">＋</a></h3>${skills || '<div class="muted small">Нет навыков</div>'}
          <h3>Сопротивления и слабости <a data-action="add-iwr">＋</a></h3>
          ${iwr || '<div class="muted small">Нет</div>'}
          <datalist id="pf2e-forge-traits">${(Object.keys(labels).length ? Object.entries(labels).sort((x, y) => (COMMON_TRAITS.includes(y[0]) - COMMON_TRAITS.includes(x[0])) || x[1].localeCompare(y[1])) : COMMON_TRAITS.map((t) => [t, t])).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join("")}</datalist>
          <datalist id="pf2e-forge-iwr-types">${IWR_TYPES.map((t) => `<option value="${t}">`).join("")}</datalist>
        </section>

        <section>
          <h3>Удары <a data-action="add-strike">＋</a></h3>${strikes || '<div class="muted small">Нет ударов</div>'}

          <h3><label class="check"><input type="checkbox" data-spellcasting${sc ? " checked" : ""}> Заклинатель</label></h3>
          ${sc ? `
            <div class="row">
              <select data-path="spellcasting.tradition">${options(TRADITION_RU, sc.tradition)}</select>
              <select data-path="spellcasting.type">${options(CAST_TYPE_RU, sc.type)}</select>
              <select data-path="spellcasting.tier">${options({ extreme: "Экстремальный", high: "Высокий", moderate: "Средний" }, sc.tier)}</select>
              <select data-path="spellcasting.attribute">${options(ATTR_RU, sc.attribute ?? "cha")}</select>
            </div>
            <div class="muted small">КС ${scStats.dc}, атака ${sign(scStats.attack)} · ранги до ${maxRank} по GM Core</div>
            ${spells}
            <div class="row"><input type="text" class="grow" data-search="spell" placeholder="Найти заклинание…" value="${esc(this.spellQuery ?? "")}"></div>
            ${spellResults}` : ""}

          <h3>Способности</h3>
          ${abilities || '<div class="muted small">Нет</div>'}
          ${(s.roleAbilities ?? []).length ? `<div class="muted small">Роль добавит: ${esc(s.roleAbilities[0])}</div>` : ""}
          <div class="row"><input type="text" class="grow" data-search="ability" placeholder="Найти способность: Захват, Реактивный удар…" value="${esc(this.abilityQuery ?? "")}">
            <button type="button" data-action="add-custom-ability" class="inline">＋ Своя способность</button></div>
          ${abilityResults}
          ${(() => {
            const have = new Set((s.abilities ?? []).map((a) => a.key ?? a.name));
            const sugg = roleAbilities(s.role, s.level).filter((a) => !have.has(a.key) && !have.has(a.name));
            return sugg.length ? `<div class="row small">Готовые для роли «${esc(role.label)}»: ${sugg.map((a) => `<a class="chip" data-action="add-role-ability" data-key="${esc(a.key)}" title="${esc(a.description)}">＋${esc(a.name)}</a>`).join(" ")}</div>` : "";
          })()}

          <h3>Шаблон и добыча</h3>
          <div class="row">
            <label>Шаблон</label>
            <select data-path="template"><option value="">Без шаблона</option>${options(Object.fromEntries(Object.entries(TEMPLATES).map(([k, t]) => [k, t.label])), s.template ?? "")}</select>
          </div>
          ${s.template ? `<div class="muted small">${esc(TEMPLATES[s.template]?.hint)}</div>` : ""}
          <div class="row">
            <label>Добыча</label>
            <select data-path="loot">${options({ "": "Без добычи", boss: "Как боссу: магический предмет, расходник, монеты", regular: "Как обычному врагу: расходник, монеты" }, s.loot ?? "")}</select>
          </div>

          <h3>Описание</h3>
          <textarea data-path="description" rows="3">${esc(s.description)}</textarea>
        </section>
      </div>

      <footer>
        ${warnings ? `<ul class="warnings">${warnings}</ul>` : '<span class="ok">Баланс в порядке</span>'}
        <div class="buttons">
          <button type="button" data-action="reset">Сбросить</button>
          <button type="button" data-action="create" class="primary"${this.busy ? " disabled" : ""}>Создать существо</button>
        </div>
      </footer>
    </form>`;
  }

  _replaceHTML(result, content) {
    const focusPath = content.querySelector(":focus")?.dataset?.search;
    content.innerHTML = result;
    if (focusPath) {
      const el = content.querySelector(`[data-search="${focusPath}"]`);
      el?.focus();
      el?.setSelectionRange?.(el.value.length, el.value.length);
    }
  }

  _onFirstRender() {
    const root = this.element;
    root.addEventListener("change", (ev) => this.#onChange(ev));
    root.addEventListener("click", (ev) => this.#onClick(ev));
    root.addEventListener("input", (ev) => {
      const t = ev.target;
      if (t.dataset.search) this.#onSearch(t.dataset.search, t.value);
    });
  }

  // ---------- состояние ----------

  #set(path, value) {
    foundry.utils.setProperty(this.spec, path, value);
  }

  #onChange(ev) {
    const t = ev.target;
    const d = t.dataset;
    if (d.search) return;

    if (d.role !== undefined) {
      const keep = { name: this.spec.name, level: this.spec.level, size: this.spec.size, rarity: this.spec.rarity, traits: this.spec.traits, languages: this.spec.languages, senses: this.spec.senses, iwr: this.spec.iwr, abilities: this.spec.abilities, description: this.spec.description, template: this.spec.template, loot: this.spec.loot };
      this.spec = { ...applyRole(this.spec, t.value), ...keep };
    } else if (d.spellcasting !== undefined) {
      this.spec.spellcasting = t.checked ? { tradition: "arcane", type: "innate", tier: "moderate", attribute: "cha", spells: [] } : null;
    } else if (d.tier) {
      if (t.value === "custom") {
        // «Своё» — фиксируем текущее посчитанное значение, дальше его правят вручную.
        const stats = computeStats(this.spec);
        const statsPath = d.tier.replace(/^skills\.(\d+)\.tier$/, "skills.$1.mod");
        const current = foundry.utils.getProperty(stats, statsPath);
        this.#set(d.tier, d.stat === "strikeDamage" ? String(current) : Number(current) || 0);
      } else {
        this.#set(d.tier, t.value); // тир урона заменяет и ручную формулу
      }
    } else if (d.num) {
      const n = Number(String(t.value).replace("+", ""));
      if (Number.isFinite(n)) this.#set(d.num, n);
    } else if (d.listText) {
      const list = t.value.split(",").map((x) => x.trim()).filter(Boolean);
      this.#set(d.listText, /^abilities\.\d+\.traits$/.test(d.listText) ? normalizeTraits(list, traitLabels()) : list);
    } else if (d.path) {
      let v = t.type === "checkbox" ? t.checked : t.value;
      if (t.type === "number") v = t.value === "" ? null : Number(t.value);
      this.#set(d.path, v);
    }
    this.render();
  }

  async #onClick(ev) {
    const a = ev.target.closest("[data-action]");
    if (!a) return;
    ev.preventDefault();
    const s = this.spec;
    switch (a.dataset.action) {
      case "add-skill": (s.skills ??= []).push({ slug: "athletics", tier: "moderate" }); break;
      case "add-strike": (s.strikes ??= []).push({ name: "Удар", ranged: false, damageType: "bludgeoning", attack: "moderate", damage: "moderate", traits: [] }); break;
      case "add-iwr": (s.iwr ??= []).push({ kind: "resistance", type: "fire", value: "max" }); break;
      case "remove": {
        const list = foundry.utils.getProperty(s, a.dataset.list);
        list?.splice(Number(a.dataset.index), 1);
        break;
      }
      case "add-ability": {
        const r = this.abilityResults[Number(a.dataset.index)];
        if (r) (s.abilities ??= []).push({ uuid: r.uuid, name: r.name });
        break;
      }
      case "add-role-ability": {
        const ab = roleAbilities(s.role, s.level).find((x) => x.key === a.dataset.key);
        if (ab) (s.abilities ??= []).push(structuredClone(ab));
        break;
      }
      case "add-custom-ability": (s.abilities ??= []).push({ custom: true, name: "", actions: "passive", traits: [], description: "" }); break;
      case "add-trait": {
        const ab = s.abilities?.[Number(a.dataset.index)];
        if (ab && !(ab.traits ??= []).includes(a.dataset.trait)) ab.traits.push(a.dataset.trait);
        break;
      }
      case "add-spell": {
        const r = this.spellResults[Number(a.dataset.index)];
        if (r && s.spellcasting) s.spellcasting.spells.push({ uuid: r.uuid, name: r.name, rank: r.rank });
        break;
      }
      case "reset": this.spec = emptySpec(s.level ?? 1); break;
      case "create": return this.#create();
    }
    this.render();
  }

  #searchTimer = null;
  #onSearch(kind, value) {
    clearTimeout(this.#searchTimer);
    this.#searchTimer = setTimeout(async () => {
      if (kind === "ability") {
        this.abilityQuery = value;
        this.abilityResults = value.trim().length >= 2 ? await searchAbilities(value, 12) : [];
      } else {
        this.spellQuery = value;
        const sc = this.spec.spellcasting;
        const maxRank = maxSpellRank(Number(this.spec.level), this.spec.role === "magicalStriker" ? "half-1" : "half");
        this.spellResults = value.trim().length >= 2 ? await searchSpells(value, { maxRank, tradition: sc?.tradition, limit: 12 }) : [];
      }
      this.render();
    }, 300);
  }

  async #create() {
    this.busy = true;
    this.render();
    try {
      const { actor, warnings, missing } = await createCreature(this.spec);
      ui.notifications.info(`Кузня: создан «${actor.name}»`);
      if (missing.length) ui.notifications.warn(`Не найдено в компендиумах: ${missing.join(", ")}`);
      if (warnings.length) console.info("[jedysan-kuznya]", warnings);
      this.close();
    } catch (e) {
      console.error(e);
      ui.notifications.error(`Кузня: ${e.message}`);
      this.busy = false;
      this.render();
    }
  }
}
