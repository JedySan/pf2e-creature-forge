// Готовые способности для ролей — с числами под уровень существа (КС, урон по таблицам GM Core).
// Возвращают «свои способности» ({ custom: true, … }), их понимает createCreature и мастер.
// В описаниях — встроенные броски pf2e (@Check, @Damage): в листе по ним можно кликнуть.
import { spellStats, strikeDamage, areaDamage } from "./tables.js";

/** Доп. кость урона «в духе Мощной атаки»: размер кости основного удара, 1/2/3 кости по уровню. */
function extraDice(level, tier = "moderate") {
  const die = String(strikeDamage(level, tier)).match(/d(\d+)/)?.[1] ?? "6";
  const n = level >= 18 ? 3 : level >= 10 ? 2 : 1;
  return `${n}d${die}`;
}

/** Радиус ауры по умолчанию: 30 футов, с 10 уровня — 60. */
export function defaultAuraRadius(level) {
  return Number(level) >= 10 ? 60 : 30;
}

function dc(level, tier = "moderate") {
  return spellStats(level, tier).dc;
}

const FRIGHTFUL = (level) => {
  const r = defaultAuraRadius(level);
  return {
    custom: true, key: "frightful-presence", name: "Устрашающее присутствие", actions: "passive",
    traits: ["aura", "emotion", "fear", "mental"], auraRadius: r,
    description:
      `Аура ${r} футов. Существо, впервые за ход входящее в ауру, совершает спасбросок Воли @Check[will|dc:${dc(level)}].\n\n` +
      "Успех: не затронуто, иммунно на 1 минуту. Провал: напугано 1. Критический провал: напугано 2.",
  };
};

const BY_ROLE = {
  balanced: (L) => [FRIGHTFUL(L)],
  brute: (L) => [
    { custom: true, key: "power-swing", name: "Мощный замах", actions: "2", traits: ["flourish"],
      description: `Существо совершает Удар. При попадании наносит дополнительно ${extraDice(L, "extreme")} урона того же типа.` },
    { custom: true, key: "knockback", name: "Отбросить", actions: "1", traits: ["attack"],
      description: `Требование: последнее действие существа — попавший Удар. Цель совершает спасбросок Стойкости @Check[fortitude|dc:${dc(L)}]; ` +
        "при провале отлетает на 10 футов, при критическом провале — на 20 футов и сбита с ног." },
    FRIGHTFUL(L),
  ],
  soldier: (L) => [
    { custom: true, key: "trip-strike", name: "Сбивающий удар", actions: "1", traits: ["attack"],
      description: `Требование: последнее действие существа — попавший Удар. Цель совершает спасбросок Рефлекса @Check[reflex|dc:${dc(L)}]; при провале она сбита с ног.` },
    { custom: true, key: "shield-wall", name: "Держать строй", actions: "reaction", traits: [],
      description: "Триггер: союзник рядом с существом становится целью атаки. Эффект: союзник получает бонус обстоятельства +2 к КБ против этой атаки." },
  ],
  skirmisher: (L) => [
    { custom: true, key: "hit-and-run", name: "Удар и отход", actions: "2", traits: ["flourish", "move"],
      description: "Существо совершает Удар, затем Перемещается на расстояние до половины своей Скорости. Это перемещение не провоцирует реакции." },
    { custom: true, key: "slip-away", name: "Ускользнуть", actions: "reaction", traits: ["move"],
      description: "Триггер: враг заканчивает передвижение рядом с существом. Эффект: существо делает Шаг." },
  ],
  sniper: (L) => [
    { custom: true, key: "aimed-shot", name: "Прицельный выстрел", actions: "2", traits: ["concentrate"],
      description: `Существо совершает дальний Удар с бонусом обстоятельства +2 к броску атаки. При попадании наносит дополнительно ${extraDice(L)} урона точности.` },
    { custom: true, key: "spotter", name: "Зоркий глаз", actions: "passive", traits: [],
      description: "Существо не получает штрафов за второй шаг дистанции своего оружия и не считает цели в укрытии скрытыми." },
  ],
  magicalStriker: (L) => [
    { custom: true, key: "charged-strike", name: "Заряженный удар", actions: "2", traits: ["magical", "force"],
      description: `Существо совершает Удар, напитанный магией. При попадании наносит дополнительно @Damage[${areaDamage(L, "unlimited")}[force]] урона силой.` },
  ],
  spellcaster: (L) => [
    { custom: true, key: "arcane-ward", name: "Защитный барьер", actions: "reaction", traits: ["magical", "concentrate", "force"],
      description: "Триггер: существо становится целью атаки. Эффект: бонус обстоятельства +2 к КБ против этой атаки." },
    { custom: true, key: "force-burst", name: "Всплеск силы", actions: "2", traits: ["magical", "concentrate", "force"],
      description: `Эманация 10 футов. Существа в ней получают @Damage[${areaDamage(L, "limited")}[force]] урона силой (базовый спасбросок Рефлекса @Check[reflex|dc:${dc(L, "high")}|basic]). ` +
        "Существо не может использовать эту способность снова 1d4 раунда." },
  ],
  skillParagon: (L) => [
    { custom: true, key: "cunning-trick", name: "Хитрый трюк", actions: "1", traits: ["mental"],
      description: "Существо совершает Финт. При успехе цель застигнута врасплох против всех атак существа до конца его следующего хода." },
    { custom: true, key: "tumble-away", name: "Кувырок", actions: "reaction", traits: ["move"],
      description: "Триггер: существо становится целью атаки ближнего боя. Эффект: существо делает Шаг; если после этого атакующий не может дотянуться, атака промахивается." },
  ],
};

/** Предложения способностей для роли и уровня. */
export function roleAbilities(role, level) {
  const L = Number(level ?? 1);
  return (BY_ROLE[role] ?? BY_ROLE.balanced)(L);
}
