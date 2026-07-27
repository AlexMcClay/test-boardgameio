import { motion } from "motion/react";

/**
 * The Hearthstone "silenced" mark: a heavy red X scrawled across the card's
 * text box. The printed description stays readable underneath — the X is what
 * tells you it no longer does anything.
 *
 * Rendered inside the description container (which is `absolute` already), so
 * it stretches to exactly the text box and needs no positioning of its own.
 */
const SilencedOverlay = () => (
  <motion.svg
    className="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
    aria-hidden="true"
  >
    <defs>
      {/* Soft dark edge so the stroke stays legible over pale card art */}
      <filter id="silenced-x-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow
          dx="0"
          dy="1.5"
          stdDeviation="1.6"
          floodColor="#2b0000"
          floodOpacity="0.75"
        />
      </filter>
    </defs>
    <g
      filter="url(#silenced-x-shadow)"
      stroke="#c81f1f"
      strokeWidth="11"
      strokeLinecap="round"
      opacity="0.92"
    >
      <line x1="14" y1="16" x2="86" y2="84" />
      <line x1="86" y1="16" x2="14" y2="84" />
    </g>
    {/* Brighter inner core gives the stroke a painted, two-tone look */}
    <g
      stroke="#f2564a"
      strokeWidth="4"
      strokeLinecap="round"
      opacity="0.85"
    >
      <line x1="14" y1="16" x2="86" y2="84" />
      <line x1="86" y1="16" x2="14" y2="84" />
    </g>
  </motion.svg>
);

export default SilencedOverlay;
