// Роли-шаблоны по «дорожным картам» GM Core. Всё, что роль не задаёт, — «средний» (moderate).
// Значения — тиры; мастер и Claude дальше правят их как угодно.

export const ROLES = {
  balanced: {
    label: "Сбалансированный",
    hint: "Всё средне — отправная точка для своего существа.",
  },
  brute: {
    label: "Громила",
    hint: "Сильный и живучий, бьёт больно, но неповоротлив и туговат.",
    attributes: { str: "extreme", con: "high", dex: "low", int: "low", wis: "low", cha: "low" },
    perception: "low", ac: "low", hp: "high",
    saves: { fortitude: "high", reflex: "low", will: "low" },
    strike: { attack: "moderate", damage: "extreme" },
  },
  soldier: {
    label: "Солдат",
    hint: "Бронированный боец; стоит дать Реактивный удар.",
    attributes: { str: "high" },
    ac: "high",
    saves: { fortitude: "high" },
    strike: { attack: "high", damage: "high" },
    abilities: ["Реактивный удар", "Reactive Strike", "Attack of Opportunity"],
  },
  skirmisher: {
    label: "Застрельщик",
    hint: "Ловкий и быстрый, бьёт и уходит.",
    attributes: { dex: "high" },
    saves: { fortitude: "low", reflex: "high" },
    speedBonus: 10,
  },
  sniper: {
    label: "Снайпер",
    hint: "Глазастый стрелок: сильные дальние удары, слабый вблизи.",
    attributes: { dex: "high" },
    perception: "high", hp: "low",
    saves: { fortitude: "low", reflex: "high" },
    strike: { attack: "high", damage: "high", ranged: true },
    meleeStrike: { attack: "low", damage: "low" },
  },
  magicalStriker: {
    label: "Магический боец",
    hint: "Бьёт и колдует: высокие удары и немного заклинаний.",
    strike: { attack: "high", damage: "high" },
    spellcasting: { tier: "moderate", type: "innate", rankFormula: "half-1" },
  },
  spellcaster: {
    label: "Заклинатель",
    hint: "Хрупкий, но с мощными заклинаниями.",
    attributes: { cha: "extreme" },
    hp: "low",
    saves: { fortitude: "low", will: "high" },
    strike: { attack: "low", damage: "low" },
    spellcasting: { tier: "high", type: "spontaneous", rankFormula: "half" },
  },
  skillParagon: {
    label: "Мастер навыков",
    hint: "Ловкач и умелец: много хороших навыков и способность, завязанная на них.",
    attributes: { dex: "high" },
    saves: { fortitude: "low", reflex: "high" },
    skills: { acrobatics: "high", stealth: "high", thievery: "high", deception: "moderate", athletics: "moderate" },
  },
};

/** Максимальный ранг заклинаний для уровня по формуле роли. */
export function maxSpellRank(level, formula = "half") {
  const half = Math.ceil(level / 2);
  const r = formula === "half-1" ? half - 1 : half;
  return Math.max(1, Math.min(10, r));
}

/** Применить роль к спецификации: заполняет тиры, не трогая заданное пользователем явно. */
export function applyRole(spec, roleId) {
  const role = ROLES[roleId] ?? ROLES.balanced;
  const s = structuredClone(spec);
  s.role = roleId;
  s.attributes = { str: "moderate", dex: "moderate", con: "moderate", int: "moderate", wis: "moderate", cha: "moderate", ...(role.attributes ?? {}) };
  s.perception = role.perception ?? "moderate";
  s.ac = role.ac ?? "moderate";
  s.hp = role.hp ?? "moderate";
  s.saves = { fortitude: "moderate", reflex: "moderate", will: "moderate", ...(role.saves ?? {}) };

  const st = role.strike ?? { attack: "moderate", damage: "moderate" };
  const strikes = [];
  if (st.ranged) {
    strikes.push({ name: "Лук", ranged: true, range: 60, damageType: "piercing", attack: st.attack, damage: st.damage, traits: [] });
    const m = role.meleeStrike ?? st;
    strikes.push({ name: "Кинжал", ranged: false, damageType: "piercing", attack: m.attack, damage: m.damage, traits: ["agile"] });
  } else {
    strikes.push({ name: "Удар", ranged: false, damageType: "slashing", attack: st.attack, damage: st.damage, traits: [] });
  }
  s.strikes = strikes;

  s.skills = Object.entries(role.skills ?? {}).map(([slug, tier]) => ({ slug, tier }));
  s.speed = { land: 25 + (role.speedBonus ?? 0), ...(s.speed?.fly ? { fly: s.speed.fly } : {}), ...(s.speed?.swim ? { swim: s.speed.swim } : {}) };

  if (role.spellcasting) {
    s.spellcasting = {
      tradition: s.spellcasting?.tradition ?? "arcane",
      type: role.spellcasting.type,
      tier: role.spellcasting.tier,
      attribute: "cha",
      spells: s.spellcasting?.spells ?? [],
    };
  } else {
    s.spellcasting = null;
  }
  s.roleAbilities = role.abilities ?? [];
  return s;
}

export function emptySpec(level = 1) {
  return applyRole({
    name: "Новое существо",
    level,
    size: "med",
    rarity: "common",
    traits: [],
    languages: [],
    senses: [],
    iwr: [],
    abilities: [],
    description: "",
  }, "balanced");
}
