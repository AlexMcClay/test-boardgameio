import { motion } from "motion/react";

type Props = {};

// More sparkles spread around the portrait
const SPARKLES = [
  { left: "6%", top: "10%", size: "1vw", delay: 0 },
  { left: "18%", top: "4%", size: "0.65vw", delay: 0.3 },
  { left: "38%", top: "2%", size: "0.8vw", delay: 0.8 },
  { left: "58%", top: "4%", size: "0.7vw", delay: 1.4 },
  { left: "80%", top: "12%", size: "0.95vw", delay: 0.5 },
  { left: "90%", top: "32%", size: "0.7vw", delay: 1.8 },
  { left: "92%", top: "56%", size: "0.9vw", delay: 0.9 },
  { left: "84%", top: "78%", size: "0.75vw", delay: 1.1 },
  { left: "62%", top: "92%", size: "0.7vw", delay: 0.2 },
  { left: "42%", top: "95%", size: "0.65vw", delay: 1.6 },
  { left: "18%", top: "84%", size: "0.9vw", delay: 0.7 },
  { left: "6%", top: "58%", size: "0.7vw", delay: 2.0 },
  { left: "4%", top: "34%", size: "0.8vw", delay: 1.3 },
];

const SpellDamageOverlay = (_props: Props) => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none rounded-[50%/50%]">
      {SPARKLES.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: s.left,
            top: s.top,
            transform: "translate(-50%, -50%)",
          }}
          initial={{
            opacity: 0,
            scale: 0.4,
            rotate: Math.random() * 360,
          }}
          animate={{
            opacity: [0, 0.9, 1, 0.7, 1, 0],
            scale: [0.4, 1, 1.15, 1, 0.8, 0.3],
            y: [0, -6, -14, -24, -34],
            x: [0, -1, 1, -1, 0],
            rotate: ["0deg", "45deg", "90deg"],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
            ease: "easeOut",
            delay: s.delay,
          }}
        >
          <Sparkle size={s.size} />
        </motion.div>
      ))}
    </div>
  );
};

const Sparkle = ({ size }: { size: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      overflow: "visible",
      filter:
        "drop-shadow(0 0 6px rgba(192,132,252,.9)) drop-shadow(0 0 12px rgba(168,85,247,.7))",
    }}
  >
    <defs>
      <radialGradient id="sparkleCore" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#E9D5FF" />
        <stop offset="100%" stopColor="#C084FC" />
      </radialGradient>
    </defs>

    {/* Vertical */}
    <path
      d="M16 1 L18 13 L31 16 L18 19 L16 31 L14 19 L1 16 L14 13 Z"
      fill="url(#sparkleCore)"
    />

    {/* Diagonal */}
    <path
      d="M16 4 L17.5 14.5 L28 16 L17.5 17.5 L16 28 L14.5 17.5 L4 16 L14.5 14.5 Z"
      fill="url(#sparkleCore)"
      opacity={0.85}
      transform="rotate(45 16 16)"
    />

    {/* Bright center */}
    <circle cx="16" cy="16" r="2.2" fill="white" />
  </svg>
);

export default SpellDamageOverlay;
