import { useAnimationStore } from "@/stores/animationStore";
import type { HitNumberAnimation } from "@/types/animations";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { useEffect, useState, useRef } from "react";

interface HitNumberPosition {
  id: string;
  targetId: string;
  targetType: "card" | "player";
  value: number;
  damageType: "damage" | "heal";
}

const damage_icon = "assets/damage_icon.png";

const HitNumbers = () => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);

  const [positions, setPositions] = useState<HitNumberPosition[]>([]);
  const processedAnimations = useRef<Set<string>>(new Set());

  const hitNumberAnimations = activeAnimations.filter(
    (anim): anim is HitNumberAnimation => anim.type === "hitNumber",
  );

  useEffect(() => {
    const newAnimations = hitNumberAnimations.filter((anim) => {
      const animKey = `${anim.targetId}-${anim.damageType}-${anim.value}-${anim.startTime}`;

      return !processedAnimations.current.has(animKey);
    });

    if (newAnimations.length === 0) return;

    const newPositions: HitNumberPosition[] = newAnimations.map((anim) => {
      const animKey = `${anim.targetId}-${anim.damageType}-${anim.value}-${anim.startTime}`;

      processedAnimations.current.add(animKey);

      return {
        id: animKey,
        targetId: anim.targetId,
        targetType: anim.targetType,
        value: anim.value,
        damageType: anim.damageType,
      };
    });

    setPositions((prev) => [...prev, ...newPositions]);
  }, [hitNumberAnimations]);

  useEffect(() => {
    if (hitNumberAnimations.length === 0 && positions.length === 0) {
      processedAnimations.current.clear();
    }
  }, [hitNumberAnimations.length, positions.length]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {positions.map((pos) => (
          <HitNumber
            key={pos.id}
            {...pos}
            onFinished={() =>
              setPositions((prev) => prev.filter((p) => p.id !== pos.id))
            }
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface HitNumberProps {
  targetId: string;
  targetType: "card" | "player";
  value: number;
  damageType: "damage" | "heal";
  onFinished: () => void;
}

const HitNumber = ({
  targetId,
  targetType,
  value,
  damageType,
  onFinished,
}: HitNumberProps) => {
  const isDamage = damageType === "damage";

  const x = useMotionValue(window.innerWidth / 2);
  const y = useMotionValue(window.innerHeight / 2);

  useEffect(() => {
    let frameId: number;

    const updatePosition = () => {
      let targetElement: HTMLElement | null = null;

      if (targetType === "card") {
        targetElement = document.querySelector(`[data-card-id="${targetId}"]`);
      } else {
        targetElement = document.querySelector(
          `[data-player-id="${targetId}"]`,
        );
      }

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();

        x.set(rect.left + rect.width / 2);
        y.set(rect.top + rect.height / 2);
      }

      frameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [targetId, targetType, x, y]);

  useEffect(() => {
    const timer = setTimeout(onFinished, 1500);

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <motion.div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x,
        y,
      }}
      initial={{
        opacity: 1,
        scale: 0.7,
      }}
      animate={{
        opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0],
        scale: [0.8, 1.3, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2],
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
      }}
      className="-translate-x-1/2 -translate-y-1/2"
    >
      <div className="relative flex items-center justify-center">
        <motion.img
          src={damage_icon}
          alt="damage"
          className="absolute w-32 h-32 min-h-32 min-w-32 object-contain"
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1, rotate: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            filter: isDamage
              ? "drop-shadow(0 0 10px rgba(220, 38, 38, 0.8))"
              : "drop-shadow(0 0 10px rgba(34, 197, 94, 0.8)) hue-rotate(90deg)",
          }}
        />

        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: [0.7, 1.2, 1] }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative z-10 font-black text-4xl pointer-events-none select-none -top-1 -left-1 ${
            isDamage ? "text-white" : "text-green-500"
          }`}
          style={{
            textShadow: isDamage
              ? "0 0 10px rgba(220, 38, 38, 0.8), 0 0 20px rgba(220, 38, 38, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)"
              : "0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)",
            WebkitTextStroke: isDamage ? "1px #000000" : "2px #14532d",
            fontFamily: "'Arial Black', sans-serif",
          }}
        >
          {isDamage ? "-" : "+"}
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HitNumbers;
