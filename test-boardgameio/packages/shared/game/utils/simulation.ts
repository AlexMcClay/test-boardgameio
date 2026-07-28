/**
 * SIMULATION MODE
 *
 * MCTS runs the real engine thousands of times per decision, on throwaway
 * clones of the game state. Two things the engine does for the benefit of the
 * UI and the developer are pure waste in that setting, and both were measurably
 * expensive:
 *
 *   - Events carry deep-cloned `Card` / `Player` snapshots so the client can
 *     replay animations. Nothing in the rules reads them (only `type` and
 *     `turn` are ever consulted), but they inflate the state several times
 *     over — and the state is deep-cloned once per node and once per playout.
 *   - Move implementations log warnings and traces. During a search those
 *     describe hypothetical positions, so they are not merely costly (console
 *     calls from a Web Worker are posted to the main thread) but actively
 *     misleading — this is the source of the "Invalid move" / "Deck is empty"
 *     spam that appears while the bot is thinking.
 *
 * Both are switched off for the duration of a search and restored afterwards,
 * so real gameplay keeps its full event payloads and its logging.
 */

let simulating = false;

/** True while a search is running on throwaway state. */
export function isSimulating(): boolean {
  return simulating;
}

/**
 * Run `fn` in simulation mode. Nestable, and always restores on the way out —
 * a throw inside the search must not leave the engine permanently muted.
 *
 * @param silenceLogs pass false to keep engine logging while debugging the AI.
 */
export function runSimulated<T>(fn: () => T, silenceLogs = true): T {
  const previous = simulating;
  simulating = true;

  if (!silenceLogs || previous) {
    try {
      return fn();
    } finally {
      simulating = previous;
    }
  }

  const { log, warn, error, info, debug } = console;
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
  try {
    return fn();
  } finally {
    console.log = log;
    console.warn = warn;
    console.error = error;
    console.info = info;
    console.debug = debug;
    simulating = previous;
  }
}

/**
 * Fields that exist purely so the client can animate an event. Dropping them
 * inside a search keeps simulated states small; the rules never look at them.
 */
const PRESENTATION_FIELDS = [
  "snapshot",
  "card",
  "heroPower",
  "options",
] as const;

/**
 * Strips presentation payloads from an event when simulating. Returns the event
 * untouched during real play.
 */
export function stripForSimulation<T extends object>(event: T): T {
  if (!simulating) return event;
  for (const field of PRESENTATION_FIELDS) {
    if (field in event) delete (event as Record<string, unknown>)[field];
  }
  return event;
}

/**
 * Replaces a full event history with the minimum the RULES need: its length
 * (event indices are referenced by `sourceEventIndex`) and the `type`/`turn`
 * of each entry (combo and cards-played-turn count them). Used to shrink the
 * position handed to a search — never on state the client will render.
 */
export function compactHistoryForSearch<
  T extends { type: string; turn?: number; seq?: number },
>(history: T[]): T[] {
  return history.map(
    (event) =>
      ({
        type: event.type,
        ...(event.turn === undefined ? {} : { turn: event.turn }),
        seq: event.seq,
      }) as T,
  );
}
