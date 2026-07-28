import { type SavedDeck } from "../types";
import {
  druidHero,
  hunterHero,
  mageHero,
  paladinHero,
  priestHero,
  rogueHero,
  shamanHero,
  warlockHero,
  warriorHero,
} from "./heros";

/**
 * Bump when starter decks change in a way existing users should receive.
 * The seeding logic adds only the starters whose `id` the user doesn't already
 * have, so bumping this is safe even for players who kept the previous set.
 */
export const STARTER_DECK_SEED_VERSION = 1.1;

/**
 * The decks every player starts with — one per playable class.
 *
 * These are seeded into the player's saved decks on first launch and are
 * ordinary, fully editable decks from that moment on. They are also the pool
 * the AI opponent draws from, which is why they live here as static data
 * rather than being read back out of the player's collection.
 *
 * The `starter-` id prefix is an identity string ONLY — it exists so seeding is
 * idempotent. No runtime code may branch on it. There is no such thing as a
 * read-only deck.
 *
 * Ordered to match `heros` so the collection and play screens line up with the
 * hero-select modal.
 */
export const starterDecks: SavedDeck[] = [
  {
    id: "starter-warrior",
    name: "Core Warrior",
    hero: warriorHero,
    // Weapons and enrage. Inner Rage / Whirlwind / Cruel Taskmaster are as much
    // about switching on Amani Berserker and Tauren Warrior as they are removal.
    deckString: {
      "inner-rage": 1,
      execute: 2,
      slam: 2,
      whirlwind: 1,
      "fiery-war-axe": 2,
      "cruel-taskmaster": 2,
      "amani-berserker": 2,
      "acidic-swamp-ooze": 1,
      "heroic-strike": 1,
      "shield-block": 2,
      bash: 2,
      "tauren-warrior": 2,
      "korkron-elite": 2,
      "warsong-outrider": 2,
      "senjin-shieldmasta": 2,
      "arcanite-reaper": 1,
      "booty-bay-bodyguard": 1,
      "boulderfist-ogre": 1,
      "grommash-hellscream": 1,
    },
  },
  {
    id: "starter-shaman",
    name: "Core Shaman",
    hero: shamanHero,
    // Overload midrange. Unbound Elemental grows off every Overload card, and
    // Bloodlust converts a totem-cluttered board into lethal.
    deckString: {
      "lightning-bolt": 2,
      "frost-shock": 1,
      "earth-shock": 1,
      "dust-devil": 2,
      "rockbiter-weapon": 2,
      "stormforged-axe": 2,
      "flametongue-totem": 2,
      "bloodfen-raptor": 2,
      hex: 2,
      "unbound-elemental": 2,
      "mana-tide-totem": 2,
      "feral-spirit": 1,
      windspeaker: 1,
      "chillwind-yeti": 2,
      "senjin-shieldmasta": 2,
      bloodlust: 1,
      "fire-elemental": 2,
      "alakir-the-windlord": 1,
    },
  },
  {
    id: "starter-rogue",
    name: "Core Rogue",
    hero: rogueHero,
    // Cheap spells feeding Combo. Backstab and Shadowstep are here to enable
    // Defias Ringleader, SI:7 Agent and Edwin as much as to trade.
    deckString: {
      backstab: 2,
      shadowstep: 1,
      "sinister-strike": 1,
      "cold-blood": 2,
      "deadly-poison": 2,
      eviscerate: 2,
      sap: 1,
      shiv: 2,
      "defias-ringleader": 2,
      "fan-of-knives": 1,
      "edwin-vancleef": 1,
      wolfrider: 2,
      "razorfen-hunter": 2,
      "si-7-agent": 2,
      assassinate: 2,
      "assassins-blade": 1,
      "senjin-shieldmasta": 2,
      sprint: 1,
      "boulderfist-ogre": 1,
    },
  },
  {
    id: "starter-paladin",
    name: "Core Paladin",
    hero: paladinHero,
    // Divine Shield plus buffs. Only 5 collectible Paladin minions exist, so
    // the shielded bodies are mostly Neutral.
    deckString: {
      "argent-squire": 2,
      "blessing-of-might": 2,
      "lights-justice": 1,
      "hand-of-protection": 1,
      shielded_minibot: 2,
      "argent-protector": 2,
      "holy-light": 1,
      consecration: 2,
      "hammer-of-wrath": 2,
      "scarlet-crusader": 2,
      "blessing-of-kings": 2,
      "truesilver-champion": 2,
      "silvermoon-guardian": 2,
      "silver-hand-knight": 2,
      sunwalker: 1,
      "argent-commander": 2,
      "guardian-of-kings": 1,
      "tirion-fordring": 1,
    },
  },
  {
    id: "starter-hunter",
    name: "Core Hunter",
    hero: hunterHero,
    // Beast aggro. Every Neutral in here is deliberately a Beast so Timber
    // Wolf, Houndmaster, Kill Command and Tundra Rhino always have targets.
    deckString: {
      "arcane-shot": 2,
      "timber-wolf": 2,
      "hunters-mark": 1,
      "stonetusk-boar": 2,
      "scavenging-hyena": 2,
      "starving-buzzard": 1,
      "bloodfen-raptor": 2,
      "river-crocolisk": 2,
      "dire-wolf-alpha": 2,
      "animal-companion": 2,
      "kill-command": 2,
      "unleash-the-hounds": 1,
      "ironfur-grizzly": 2,
      "multi-shot": 1,
      houndmaster: 2,
      "oasis-snapjaw": 1,
      "tundra-rhino": 1,
      "savannah-highmane": 1,
      "king-krush": 1,
    },
  },
  {
    id: "starter-druid",
    name: "Core Druid",
    hero: druidHero,
    // Ramp into fat. Only 6 collectible Druid minions exist, so the curve is
    // filled out with Neutral bodies.
    deckString: {
      innervate: 2,
      moonfire: 1,
      claw: 2,
      "wild-growth": 2,
      "mark-of-the-wild": 2,
      "river-crocolisk": 2,
      "healing-touch": 2,
      swipe: 2,
      "ironfur-grizzly": 2,
      "shattered-sun-cleric": 2,
      "keeper-of-the-grove": 2,
      "chillwind-yeti": 2,
      "fen-creeper": 2,
      "druid-of-the-claw": 2,
      starfire: 1,
      "ironbark-protector": 1,
      cenarius: 1,
    },
  },
  {
    id: "starter-warlock",
    name: "Core Warlock",
    hero: warlockHero,
    // Demon zoo with Life Tap as the draw engine. Warlock is the only class
    // with no Legendary of its own, so the marquee slot goes to Xavius — the
    // one Neutral Legendary that is a Demon, and a real payoff for going wide.
    // Seven Demons in the list keeps Sense Demons live.
    deckString: {
      "flame-imp": 2,
      voidwalker: 2,
      "mortal-coil": 1,
      soulfire: 1,
      "vulgar-homunculus": 2,
      felstalker: 2,
      "drain-soul": 2,
      "shadow-bolt": 2,
      hellfire: 1,
      "drain-life": 1,
      "sense-demons": 1,
      "ironfur-grizzly": 2,
      "demonic-assault": 2,
      "chillwind-yeti": 2,
      "senjin-shieldmasta": 2,
      "fen-creeper": 2,
      "dread-infernal": 2,
      xavius: 1,
    },
  },
  {
    id: "starter-mage",
    name: "Core Mage",
    hero: mageHero,
    // Spell tempo. Mage has only 4 collectible class minions, so this is the
    // most Neutral-heavy of the nine.
    deckString: {
      "arcane-missiles": 2,
      "mana-wyrm": 2,
      "ice-lance": 1,
      frostbolt: 2,
      "sorcerers-apprentice": 2,
      arcane_explosion: 1,
      "loot-hoarder": 2,
      "kobold-geomancer": 1,
      "arcane-intellect": 2,
      "frost-nova": 1,
      "dalaran-mage": 2,
      fireball: 2,
      "water-elemental": 2,
      polymorph: 1,
      "chillwind-yeti": 2,
      "silver-hand-knight": 1,
      "boulderfist-ogre": 2,
      flamestrike: 1,
      "archmage-antonidas": 1,
    },
  },
  {
    id: "starter-priest",
    name: "Core Priest",
    hero: priestHero,
    // Heal-control. Northshire Cleric is the engine, so the deck is stacked
    // with heal effects that draw off it — Lesser Heal included.
    deckString: {
      "holy-smite": 2,
      "power-word-shield": 2,
      "northshire-cleric": 2,
      "voodoo-doctor": 2,
      "shadow-word-pain": 2,
      "shadow-word-death": 1,
      "mind-blast": 1,
      "frostwolf-grunt": 1,
      "holy-nova": 2,
      "shadowed-spirit": 2,
      "earthen-ring-farseer": 2,
      "power-infusion": 1,
      "chillwind-yeti": 2,
      "senjin-shieldmasta": 2,
      "temple-enforcer": 2,
      "darkscale-healer": 1,
      "holy-fire": 1,
      "natalie-seline": 1,
      "mind-control": 1,
    },
  },
];
