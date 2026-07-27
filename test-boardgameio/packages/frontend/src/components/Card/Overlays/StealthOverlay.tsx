import { useAudioStore } from "@/stores/audioStore";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

type Props = {};

// Three tones of fog. Lighter puffs get less blur so their edges stay legible
// and read as a nearer layer; the dark ones sit soft and deep behind them.
const TONES = {
  dark: "radial-gradient(circle at 42% 38%, rgba(74,80,94,0.72) 0%, rgba(58,64,78,0.46) 42%, rgba(44,50,62,0) 72%)",
  mid: "radial-gradient(circle at 40% 40%, rgba(150,158,174,0.62) 0%, rgba(122,130,146,0.34) 45%, rgba(100,108,122,0) 74%)",
  light:
    "radial-gradient(circle at 38% 36%, rgba(236,240,246,0.78) 0%, rgba(202,209,220,0.42) 40%, rgba(178,186,200,0) 70%)",
};

// Each puff has its own irregular silhouette (via lopsided border-radius) and
// drifts / rotates on its own cycle so the layers separate visually.
const MIST = [
  {
    tone: "dark" as const,
    left: "26%",
    top: "34%",
    width: "88%",
    height: "70%",
    radius: "62% 38% 55% 45% / 58% 64% 36% 42%",
    drift: { x: 13, y: -6 },
    rotate: [-8, 6, -8],
    xDur: 8,
    yDur: 5,
    opacity: [0.45, 0.8, 0.45],
    scale: [1, 1.14, 1],
    blur: 9,
    z: 1,
  },
  {
    tone: "dark" as const,
    left: "72%",
    top: "62%",
    width: "76%",
    height: "82%",
    radius: "44% 56% 38% 62% / 46% 40% 60% 54%",
    drift: { x: -14, y: 9 },
    rotate: [10, -6, 10],
    xDur: 10,
    yDur: 6.5,
    opacity: [0.7, 0.35, 0.7],
    scale: [1.08, 0.92, 1.08],
    blur: 10,
    z: 1,
  },
  {
    tone: "mid" as const,
    left: "58%",
    top: "24%",
    width: "70%",
    height: "58%",
    radius: "70% 30% 48% 52% / 40% 62% 38% 60%",
    drift: { x: -16, y: 11 },
    rotate: [6, -10, 6],
    xDur: 7,
    yDur: 8.5,
    opacity: [0.5, 0.85, 0.5],
    scale: [1.05, 0.9, 1.05],
    blur: 6,
    z: 2,
  },
  {
    tone: "mid" as const,
    left: "22%",
    top: "74%",
    width: "82%",
    height: "56%",
    radius: "36% 64% 60% 40% / 62% 44% 56% 38%",
    drift: { x: 10, y: -9 },
    rotate: [-5, 9, -5],
    xDur: 9,
    yDur: 5.5,
    opacity: [0.8, 0.4, 0.8],
    scale: [0.94, 1.12, 0.94],
    blur: 6,
    z: 2,
  },
  {
    tone: "light" as const,
    left: "44%",
    top: "48%",
    width: "58%",
    height: "40%",
    radius: "58% 42% 66% 34% / 52% 56% 44% 48%",
    drift: { x: 17, y: 6 },
    rotate: [-12, 4, -12],
    xDur: 6,
    yDur: 4,
    opacity: [0.35, 0.75, 0.35],
    scale: [0.9, 1.2, 0.9],
    blur: 3,
    z: 3,
  },
  {
    tone: "light" as const,
    left: "70%",
    top: "38%",
    width: "44%",
    height: "32%",
    radius: "48% 52% 34% 66% / 60% 38% 62% 40%",
    drift: { x: -11, y: -8 },
    rotate: [8, -14, 8],
    xDur: 5.5,
    yDur: 7,
    opacity: [0.7, 0.28, 0.7],
    scale: [1.15, 0.88, 1.15],
    blur: 3,
    z: 3,
  },
  {
    tone: "light" as const,
    left: "18%",
    top: "22%",
    width: "40%",
    height: "30%",
    radius: "66% 34% 52% 48% / 38% 60% 40% 62%",
    drift: { x: 8, y: 10 },
    rotate: [4, -8, 4],
    xDur: 7.5,
    yDur: 4.8,
    opacity: [0.28, 0.62, 0.28],
    scale: [1, 1.18, 1],
    blur: 4,
    z: 3,
  },
];

// Wide banks of fog creeping across, furthest back
const BANKS = [
  {
    top: "6%",
    height: "58%",
    duration: 11,
    direction: 1,
    opacity: 0.5,
    tone: "dark" as const,
    blur: 12,
  },
  {
    top: "44%",
    height: "62%",
    duration: 14,
    direction: -1,
    opacity: 0.4,
    tone: "mid" as const,
    blur: 12,
  },
];

const StealthOverlay = (_props: Props) => {
  const isFirstRender = useRef(true);

  const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("/gameplay/stealth_on.ogg");
      return;
    }
  }, []);

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
      key={"stealth"}
      className={
        "absolute inset-[2px] rounded-[50%/50%] z-10 pointer-events-none overflow-hidden"
      }
    >
      {/* Soft gray haze sitting over the whole portrait */}
      <motion.div
        className="absolute inset-0 rounded-[50%/50%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(140,148,162,0.30) 0%, rgba(108,116,130,0.20) 55%, rgba(84,90,102,0) 100%)",
        }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Fog banks creeping across, behind every puff */}
      {BANKS.map((b, i) => (
        <motion.div
          key={`bank-${i}`}
          className="absolute w-[70%]"
          style={{
            top: b.top,
            height: b.height,
            zIndex: 0,
            opacity: b.opacity,
            borderRadius: "54% 46% 42% 58% / 48% 56% 44% 52%",
            background: TONES[b.tone],
            filter: `blur(${b.blur}px)`,
          }}
          animate={{
            x: b.direction === 1 ? ["-70%", "150%"] : ["150%", "-70%"],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Rolling mist puffs, dark layers first then lighter ones on top */}
      {MIST.map((m, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: m.left,
            top: m.top,
            width: m.width,
            height: m.height,
            marginLeft: `calc(${m.width} / -2)`,
            marginTop: `calc(${m.height} / -2)`,
            zIndex: m.z,
            borderRadius: m.radius,
            background: TONES[m.tone],
            filter: `blur(${m.blur}px)`,
          }}
          animate={{
            x: [0, m.drift.x, 0],
            y: [0, m.drift.y, 0],
            rotate: m.rotate,
            scale: m.scale,
            opacity: m.opacity,
          }}
          transition={{
            x: {
              duration: m.xDur,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            y: {
              duration: m.yDur,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            rotate: {
              duration: m.xDur * 1.4,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            scale: {
              duration: m.xDur * 0.8,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            opacity: {
              duration: m.yDur * 1.3,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
        />
      ))}
    </motion.div>
  );
};

export default StealthOverlay;
