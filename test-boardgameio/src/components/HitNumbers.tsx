import { useAnimationStore } from "@/stores/animationStore";
import type { HitNumberAnimation } from "@/types/animations";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";

interface HitNumberPosition {
  id: string;
  x: number;
  y: number;
  value: number;
  damageType: "damage" | "heal";
}

const damage_icon = "assets/damage_icon.png"; // Path to your damage icon

const HitNumbers = () => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const [positions, setPositions] = useState<HitNumberPosition[]>([]);
  const processedAnimations = useRef<Set<string>>(new Set());

  // Filter only hit number animations
  const hitNumberAnimations = activeAnimations.filter(
    (anim): anim is HitNumberAnimation => anim.type === "hitNumber",
  );

  useEffect(() => {
    // Only process animations we haven't seen before
    const newAnimations = hitNumberAnimations.filter((anim) => {
      const animKey = `${anim.targetId}-${anim.damageType}-${anim.value}-${anim.startTime}`;
      return !processedAnimations.current.has(animKey);
    });

    if (newAnimations.length === 0) return; // No new animations to process

    // Calculate positions for new hit numbers only
    const newPositions: HitNumberPosition[] = newAnimations
      .map((anim) => {
        const animKey = `${anim.targetId}-${anim.damageType}-${anim.value}-${anim.startTime}`;
        processedAnimations.current.add(animKey);

        const targetId = anim.targetId;
        const targetType = anim.targetType;

        // Find target element
        let targetElement: HTMLElement | null = null;

        if (targetType === "card") {
          targetElement = document.querySelector(
            `[data-card-id="${targetId}"]`,
          );
        } else if (targetType === "player") {
          targetElement = document.querySelector(
            `[data-player-id="${targetId}"]`,
          );
        }

        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          return {
            id: animKey,
            x: centerX,
            y: centerY,
            value: anim.value,
            damageType: anim.damageType,
          };
        } else {
          console.warn(
            `Target element not found for hit number animation: ${targetType} with ID ${targetId}`,
          );
        }

        // Fallback position if element not found
        return {
          id: animKey,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          value: anim.value,
          damageType: anim.damageType,
        };
      })
      .filter((pos): pos is HitNumberPosition => pos.value !== 0);

    // Add new positions to existing ones (don't replace!)
    setPositions((prev) => [...prev, ...newPositions]);
  }, [hitNumberAnimations]);

  // Clean up processed animations tracking when all animations finish
  useEffect(() => {
    if (hitNumberAnimations.length === 0 && positions.length === 0) {
      processedAnimations.current.clear();
    }
  }, [hitNumberAnimations.length, positions.length]);

  // Remove positions that have finished animating
  useEffect(() => {
    if (positions.length === 0) return;

    const timer = setTimeout(() => {
      // Remove positions after animation duration (800ms)
      setPositions([]);
    }, 850); // Slightly longer than animation duration

    return () => clearTimeout(timer);
  }, [positions.length]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {positions.map((pos) => (
          <HitNumber key={pos.id} {...pos} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface HitNumberProps {
  x: number;
  y: number;
  value: number;
  damageType: "damage" | "heal";
}

const HitNumber = ({ x, y, value, damageType }: HitNumberProps) => {
  const isDamage = damageType === "damage";

  return (
    <motion.div
      initial={{
        opacity: 1,
        scale: 0.7,
        x: `calc(${x}px - 50%)`, // Start slightly left of the target
        y: `calc(${y}px - 50%)`, // Start slightly above the target,
      }}
      animate={{
        opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0],
        scale: [0.8, 1.3, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2],
        y: `calc(${y}px - 50%)`, // Start slightly above the target,
        x: `calc(${x}px - 50%)`, // Start slightly left of the target
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
      }}
      className="absolute"
      style={{
        left: 0,
        top: 0,
      }}
    >
      {/* Damage Icon Background */}
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

        {/* Number Text */}
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
