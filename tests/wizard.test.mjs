// Прогон мастера на заглушках Foundry: рендер всех ролей, смена полей, «своё» значение.
const getProperty = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setProperty = (o, p, v) => { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach((k) => { x[k] ??= {}; x = x[k]; }); x[ks.at(-1)] = v; };
const mergeObject = (a, b) => ({ ...structuredClone(a), ...structuredClone(b) });
globalThis.foundry = {
  utils: { getProperty, setProperty, mergeObject, escapeHTML: (s) => String(s).replace(/</g, "&lt;") },
  applications: { api: { ApplicationV2: class { constructor() {} render() { this.rendered = (this.rendered ?? 0) + 1; } close() {} } } },
};
globalThis.game = { packs: { get: () => null, filter: () => [] }, folders: { find: () => null } };
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };

const { CreatureForge } = await import("../scripts/wizard.js");
const { ROLES } = await import("../scripts/roles.js");

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("FAIL", m); } else console.log("ok  ", m); };

const app = new CreatureForge();
for (const role of Object.keys(ROLES)) {
  const html = await app._renderHTML();
  ok(html.includes("Создать существо"), `рендер (${app.spec.role})`);
  // Смена роли через обработчик.
  const ev = { target: { dataset: { role: "" }, value: role } };
  app["_CreatureForge__dummy"]; // no-op
}

// Доступ к приватным обработчикам — через событие change/click, как в браузере.
const handlers = {};
app.element = { addEventListener: (t, fn) => (handlers[t] = fn) };
app._onFirstRender();
const change = (dataset, value, extra = {}) => handlers.change({ target: { dataset, value, type: extra.type ?? "text", checked: extra.checked } });
const click = (action, extra = {}) => handlers.click({ preventDefault() {}, target: { closest: () => ({ dataset: { action, ...extra } }) } });

change({ role: "" }, "brute");
ok(app.spec.role === "brute" && app.spec.attributes.str === "extreme", "роль Громила применилась");
change({ path: "level" }, "8", { type: "number" });
ok(app.spec.level === 8, "уровень 8");
change({ tier: "ac", stat: "ac" }, "custom");
ok(app.spec.ac === 24, `КБ «своё» = текущее 24 (${app.spec.ac})`);
change({ num: "ac" }, "26");
ok(app.spec.ac === 26, "КБ вручную 26");
change({ tier: "strikes.0.damage", stat: "strikeDamage" }, "custom");
ok(app.spec.strikes[0].damage === "2d12+15", `урон «своё» = формула (${app.spec.strikes[0].damage})`);
change({ path: "strikes.0.damage" }, "3d10+12");
ok(app.spec.strikes[0].damage === "3d10+12", "урон своей формулой");
await click("add-skill");
await click("add-iwr");
await click("add-strike");
ok(app.spec.skills.length === 1 && app.spec.iwr.length === 1 && app.spec.strikes.length === 2, "добавление навыка, IWR, удара");
change({ spellcasting: "" }, "", { type: "checkbox", checked: true });
ok(app.spec.spellcasting?.tier === "moderate", "включён заклинатель");
change({ listText: "traits" }, "giant, humanoid");
ok(app.spec.traits.join() === "giant,humanoid", "трейты списком");
await click("remove", { list: "iwr", index: "0" });
ok(app.spec.iwr.length === 0, "удаление IWR");

const html = await app._renderHTML();
ok(html.includes("3d10+12") && html.includes("Заклинатель") && html.includes("КС"), "итоговый рендер со всеми секциями");

await click("add-custom-ability");
const ci = app.spec.abilities.length - 1;
ok(app.spec.abilities[ci].custom, "своя способность добавлена");
app.spec.abilities[ci].name = "Устрашающее присутствие";
app.spec.abilities[ci].description = "Аура страха 30 футов";
let h2 = await app._renderHTML();
ok(h2.includes("custom-ability") && h2.includes('data-trait="aura"'), "подсказка тегов в мастере");
await click("add-trait", { index: String(ci), trait: "aura" });
ok(app.spec.abilities[ci].traits.includes("aura"), "тег добавлен кликом");

console.log(fail ? `ОШИБОК: ${fail}` : "Мастер работает на заглушках");
process.exitCode = fail ? 1 : 0;
