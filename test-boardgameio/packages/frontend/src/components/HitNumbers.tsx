import { useAnimationStore } from "@/stores/animationStore";
import type { HitNumberAnimation } from "@/types/animations";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface HitNumberPosition {
  id: string; // This needs to be completely unique per instance
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
    (anim): anim is HitNumberAnimation & { uid: string } =>
      anim.type === "hitNumber",
  );

  useEffect(() => {
    // 1. Filter out animations using the store instance key
    const newAnimations = hitNumberAnimations.filter((anim) => {
      // Rely directly on the dynamic unique store ID instead of a concatenated string
      return !processedAnimations.current.has(anim.uid);
    });

    if (newAnimations.length === 0) return;

    if (newAnimations.length === 0) return;

    const newPositions: HitNumberPosition[] = newAnimations.map((anim) => {
      processedAnimations.current.add(anim.uid);

      return {
        id: anim.uid, // Use the store's unique run tracker
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
    <AnimatePresence>
      {positions.map((pos) => (
        <HitNumber
          key={pos.id} // Guaranteed unique key now
          {...pos}
          onFinished={() =>
            setPositions((prev) => prev.filter((p) => p.id !== pos.id))
          }
        />
      ))}
    </AnimatePresence>
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const selector =
      targetType === "card"
        ? `[data-card-id="${targetId}"]`
        : `[data-player-id="${targetId}"]`;

    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      setPortalTarget(element);
    } else {
      onFinished();
    }
  }, [targetId, targetType, onFinished]);

  // Adjust the lifecycle timer to account for the incoming staggered animation delay
  useEffect(() => {
    const totalDuration = 1.5 * 1000;
    const timer = setTimeout(onFinished, totalDuration);
    return () => clearTimeout(timer);
  }, [onFinished]);

  if (!portalTarget) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }} // Changed initial opacity to 0 so staggered items don't flash early
      animate={{
        opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0], // Handles fading in after the delay pops
        scale: [0.8, 1.3, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2],
        y: [0, -10, -20, -25, -30, -30, -30, -30, -35],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
    >
      <div className="relative flex items-center justify-center">
        <motion.img
          src={damage_icon}
          alt="damage"
          className="absolute w-[8vw] h-[8vw] min-h-[8vw] min-w-[8vw] object-contain"
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
          className={`relative z-10 font-black text-[2vw] pointer-events-none select-none -top-1 -left-1 ${
            isDamage ? "text-white" : "text-green-500"
          }`}
          style={{
            textShadow: isDamage
              ? "0 0 10px rgba(220, 38, 38, 0.8), 0 0 20px rgba(220, 38, 38, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)"
              : "0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)",
            WebkitTextStroke: isDamage ? "1px #000000" : "2px #14532d",
          }}
        >
          {isDamage ? "-" : "+"}
          {value}
        </motion.div>
      </div>
    </motion.div>,
    portalTarget,
  );
};

export default HitNumbers;
