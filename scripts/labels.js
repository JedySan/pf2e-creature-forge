// Русские подписи для интерфейса.

export const ATTR_RU = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" };
export const SAVE_RU = { fortitude: "Стойкость", reflex: "Рефлекс", will: "Воля" };

export const SKILL_RU = {
  acrobatics: "Акробатика", arcana: "Аркана", athletics: "Атлетика", crafting: "Ремесло",
  deception: "Обман", diplomacy: "Дипломатия", intimidation: "Запугивание", medicine: "Медицина",
  nature: "Природа", occultism: "Оккультизм", performance: "Выступление", religion: "Религия",
  society: "Общество", stealth: "Скрытность", survival: "Выживание", thievery: "Воровство",
};

export const SIZE_RU = { tiny: "Крошечный", sm: "Маленький", med: "Средний", lg: "Большой", huge: "Огромный", grg: "Исполинский" };
export const RARITY_RU = { common: "Обычный", uncommon: "Необычный", rare: "Редкий", unique: "Уникальный" };

export const DAMAGE_RU = {
  slashing: "рубящий", piercing: "колющий", bludgeoning: "дробящий",
  fire: "огонь", cold: "холод", electricity: "электричество", acid: "кислота", sonic: "звук",
  poison: "яд", mental: "ментальный", force: "сила", vitality: "жизненная сила", void: "пустота",
  spirit: "дух", bleed: "кровотечение",
};

export const IWR_KIND_RU = { resistance: "Сопротивление", weakness: "Слабость", immunity: "Иммунитет" };

// Частые типы для IWR (плюс любой свой в поле ввода).
export const IWR_TYPES = [
  "physical", "slashing", "piercing", "bludgeoning", "fire", "cold", "electricity", "acid", "sonic",
  "poison", "mental", "force", "vitality", "void", "spirit", "bleed", "precision", "critical-hits",
  "cold-iron", "silver", "holy", "unholy", "spells", "magical", "area-damage", "splash-damage",
  "death-effects", "disease", "paralyzed", "sleep", "fear-effects", "emotion",
];

export const TRADITION_LIST = ["arcane", "divine", "occult", "primal"];
