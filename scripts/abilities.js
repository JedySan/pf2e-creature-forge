// Свои способности существа: данные предмета pf2e и подбор трейтов (тегов).
// Чистые функции — их же используют мастер, создание через API и тесты.

export const ACTION_TYPES = {
  passive: "Пассивная",
  free: "◇ Свободное",
  reaction: "⟲ Реакция",
  1: "◆ 1 действие",
  2: "◆◆ 2 действия",
  3: "◆◆◆ 3 действия",
};

// Частые трейты способностей монстров — для подсказок в мастере.
export const COMMON_TRAITS = [
  "aura", "emotion", "fear", "mental", "visual", "auditory", "linguistic", "olfactory",
  "concentrate", "manipulate", "move", "attack", "flourish", "press", "open",
  "magical", "arcane", "divine", "occult", "primal", "incapacitation", "death", "healing",
  "poison", "disease", "curse", "polymorph", "illusion", "light", "darkness", "sleep",
  "fire", "cold", "electricity", "acid", "sonic", "force", "vitality", "void", "spirit",
  "air", "earth", "water", "wood", "metal", "holy", "unholy", "teleportation", "summon",
];

// Ключевые слова (рус./англ., по началу слова) → трейты.
const KEYWORDS = [
  [/аур|aura/, ["aura"]],
  [/страх|ужас|устраш|пуга|напуг|fear|fright|terror/, ["emotion", "fear", "mental"]],
  [/эмоци|ярост|отчаян|emotion|rage|despair/, ["emotion", "mental"]],
  [/разум|ментал|внушен|очаров|mental|charm|mind/, ["mental"]],
  [/взгляд|видим|увид|gaze|sight|visual/, ["visual"]],
  [/крик|рёв|рев|вой|песн|звук|слыш|roar|howl|song|scream|auditory/, ["auditory"]],
  [/яд|отрав|poison|venom/, ["poison"]],
  [/болезн|зараз|disease/, ["disease"]],
  [/проклят|curse/, ["curse"]],
  [/огон|огн|пламя|пламен|жар|fire|flame|burn/, ["fire"]],
  [/холод|лёд|лед|мороз|cold|ice|frost/, ["cold"]],
  [/молни|электр|гром|lightning|electric|shock/, ["electricity"]],
  [/кислот|acid/, ["acid"]],
  [/вод|волн|прилив|море|wave|tide|water/, ["water"]],
  [/ветер|вихр|воздух|wind|air/, ["air"]],
  [/земл|камен|earth|stone/, ["earth"]],
  [/тьм|тен|darkness|shadow/, ["darkness"]],
  [/свет|сиян|light|radian/, ["light"]],
  [/смерт|убива|death/, ["death"]],
  [/лечен|исцел|heal/, ["healing"]],
  [/телепорт|переме[щс]ает?ся мгновенно|teleport/, ["teleportation"]],
  [/призыв|summon/, ["summon"]],
  [/магическ|магия|magic/, ["magical"]],
];

/** Предложить трейты по названию и описанию. actionType — чтобы не советовать «aura» реакциям и т. п. */
export function suggestTraits(name = "", description = "", actionType = "passive") {
  const text = `${name} ${description}`.toLowerCase().replace(/<[^>]+>/g, " ");
  const out = new Set();
  for (const [re, traits] of KEYWORDS) if (re.test(text)) traits.forEach((t) => out.add(t));
  if (actionType !== "passive") out.delete("aura");
  if (["1", "2", "3"].includes(String(actionType)) && !out.has("aura")) {
    if (/(удар|атак|strike|attack)/.test(text)) out.add("attack");
  }
  return [...out];
}

/**
 * Привести введённые трейты к ключам pf2e: принимает ключи и русские названия.
 * labels — { key: "Русское название" } (в Foundry — из CONFIG.PF2E.actionTraits).
 */
export function normalizeTraits(list, labels = {}) {
  const byLabel = new Map(Object.entries(labels).map(([k, v]) => [String(v).toLowerCase(), k]));
  const out = [];
  for (const raw of list ?? []) {
    const s = String(raw).trim();
    if (!s) continue;
    const low = s.toLowerCase();
    const key = labels[low] !== undefined ? low : byLabel.get(low) ?? low.replace(/\s+/g, "-");
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/** Данные предмета-способности pf2e (type: action) из описания своей способности. */
export function customAbilityData(ab) {
  const at = String(ab.actions ?? "passive");
  const n = ["1", "2", "3"].includes(at) ? Number(at) : null;
  const actionType = n ? "action" : at;
  const traits = ab.traits?.length ? ab.traits : suggestTraits(ab.name, ab.description, at);
  const description = String(ab.description ?? "").trim();
  return {
    name: ab.name || "Способность",
    type: "action",
    img: n === 1 ? "systems/pf2e/icons/actions/OneAction.webp"
      : n === 2 ? "systems/pf2e/icons/actions/TwoActions.webp"
      : n === 3 ? "systems/pf2e/icons/actions/ThreeActions.webp"
      : at === "reaction" ? "systems/pf2e/icons/actions/Reaction.webp"
      : at === "free" ? "systems/pf2e/icons/actions/FreeAction.webp"
      : "systems/pf2e/icons/actions/Passive.webp",
    system: {
      actionType: { value: actionType },
      actions: { value: n },
      category: at === "passive" || at === "reaction" ? "defensive" : "offensive",
      traits: { value: traits, rarity: "common", otherTags: [] },
      description: { value: description.startsWith("<") ? description : description.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("") },
    },
  };
}
