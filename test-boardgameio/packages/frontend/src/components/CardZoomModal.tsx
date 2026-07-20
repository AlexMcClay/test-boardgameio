import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "motion/react";
import CardComponent from "./Card";
import type { Card as CardType } from "@project/shared";

interface Props {
  card: CardType | null;
  originRect: DOMRect | null;
  onClose: () => void;
}

const CardZoomModal = ({ card, originRect, onClose }: Props) => {
  const show = !!(card && originRect);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, onClose]);

  const originCenterX = originRect ? originRect.left + originRect.width / 2 : 0;
  const originCenterY = originRect ? originRect.top + originRect.height / 2 : 0;
  const baseWidth = window.innerWidth * 0.078; // matches CollectionManager's 7.8vw base card convention
  const startScale = originRect ? originRect.width / baseWidth : 1;

  // Variants so enter/exit can each carry their own transition timing —
  // exit keeps the card fully opaque while it flies back, only fading right
  // at the very end so it visually "lands" on the grid card before vanishing.
  const flightVariants: Variants = {
    hidden: {
      x: originCenterX,
      y: originCenterY,
      scale: startScale,
    },
    visible: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      scale: 2.25,
      opacity: 1,
      transition: { type: "tween", duration: 0.15, ease: "easeInOut" },
    },
    exit: {
      x: originCenterX,
      y: originCenterY,
      scale: startScale,
      transition: {
        default: { type: "tween", duration: 0.15, ease: "easeInOut" },
      },
    },
  };

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            key="card-zoom-backdrop"
            className="fixed inset-0 z-95 bg-black/30 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="card-zoom-card"
            className="fixed top-0 left-0 z-100 pointer-events-auto cursor-pointer"
            style={{ translateX: "-50%", translateY: "-50%" }}
            variants={flightVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          >
            {card && (
              <CardComponent
                card={{
                  ...card,
                  id: `${card.id}-zoom`,
                  originalID: `${card.id}-zoom`,
                }}
                back={false}
                isDragging={false}
                disableLayoutAnimation
                type="game"
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CardZoomModal;
