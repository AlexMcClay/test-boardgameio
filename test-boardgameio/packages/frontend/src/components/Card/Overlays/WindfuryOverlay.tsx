import { motion } from "motion/react";

type Props = { variant?: "minion" | "hero" };

// Each streak blows straight across the character and loops back around, with a
// slight vertical wobble so the gusts don't read as a flat conveyor belt.
const STREAKS = [
  {
    top: "8%",
    width: "55%",
    height: "14%",
    duration: 2.6,
    delay: 0,
    direction: 1,
    opacity: 0.5,
    drift: -3,
  },
  {
    top: "24%",
    width: "70%",
    height: "16%",
    duration: 1.9,
    delay: 0.6,
    direction: 1,
    opacity: 0.8,
    drift: 4,
  },
  {
    top: "44%",
    width: "62%",
    height: "15%",
    duration: 2.3,
    delay: 1.1,
    direction: -1,
    opacity: 0.65,
    drift: -4,
  },
  {
    top: "62%",
    width: "75%",
    height: "17%",
    duration: 1.7,
    delay: 0.3,
    direction: 1,
    opacity: 0.85,
    drift: 3,
  },
  {
    top: "80%",
    width: "58%",
    height: "14%",
    duration: 2.9,
    delay: 1.4,
    direction: -1,
    opacity: 0.5,
    drift: -3,
  },
];

const WindfuryOverlay = ({ variant = "minion" }: Props) => {
  return (
    <motion.div
      initial={{
        scale: 0.5,
        opacity: 0.5,
      }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      exit={{
        scale: 1.2,
        opacity: 0.5,
      }}
      key={"windfury"}
      className={
        "absolute inset-0 z-20 pointer-events-none overflow-hidden " +
        (variant === "minion" ? "rounded-[50%/50%]" : "")
      }
    >
      {STREAKS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute left-0"
          style={{
            top: s.top,
            width: s.width,
            height: s.height,
            filter:
              "drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 12px rgba(200,200,210,.4)) blur(0.5px)",
          }}
          animate={{
            // Travels fully off one edge to fully off the other, then wraps
            x: s.direction === 1 ? ["-110%", "190%"] : ["190%", "-110%"],
            y: [0, s.drift, 0],
          }}
          transition={{
            x: {
              duration: s.duration,
              repeat: Infinity,
              ease: "linear",
              delay: s.delay,
            },
            y: {
              duration: s.duration / 2,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: s.delay,
            },
          }}
        >
          <WindStreak
            opacity={s.opacity}
            seed={i}
            flipped={s.direction === -1}
          />
        </motion.div>
      ))}

      {/* Slow breathe over the whole gust so it pulses rather than sitting flat */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0) 55%, rgba(226,232,240,0.18) 78%, rgba(255,255,255,0) 100%)",
        }}
        animate={{ opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
};

const WindStreak = ({
  opacity,
  seed,
  flipped,
}: {
  opacity: number;
  seed: number;
  flipped: boolean;
}) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 20"
    fill="none"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      overflow: "visible",
      opacity,
      transform: flipped ? "scaleX(-1)" : undefined,
    }}
  >
    <defs>
      <linearGradient
        id={`windStroke-${seed}`}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%"
      >
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
        <stop offset="35%" stopColor="#F8FAFC" stopOpacity={0.9} />
        <stop offset="70%" stopColor="#CBD5E1" stopOpacity={0.75} />
        <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
      </linearGradient>
    </defs>

    {/* Main gust line, curling upward as it leaves */}
    <path
      d="M 0 12 C 22 12, 34 5, 56 6 C 74 7, 84 11, 100 9"
      stroke={`url(#windStroke-${seed})`}
      strokeWidth={2}
      strokeLinecap="round"
    />

    {/* Trailing wisp below, slightly shorter */}
    <path
      d="M 12 17 C 32 17, 46 13, 64 14 C 78 15, 86 16, 96 15"
      stroke={`url(#windStroke-${seed})`}
      strokeWidth={1.3}
      strokeLinecap="round"
      opacity={0.7}
    />

    {/* Small curl at the leading edge */}
    <path
      d="M 84 6 C 92 3, 96 6, 92 9"
      stroke={`url(#windStroke-${seed})`}
      strokeWidth={1.2}
      strokeLinecap="round"
      opacity={0.6}
    />
  </svg>
);

export default WindfuryOverlay;
