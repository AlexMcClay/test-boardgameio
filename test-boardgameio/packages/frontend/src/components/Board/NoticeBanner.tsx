import { AnimatePresence, motion } from "motion/react";
import { useNoticeStore } from "@/stores/noticeStore";

/**
 * The one-line reason a move didn't happen, across the top of the board.
 *
 * Deliberately plain: it interrupts nothing, blocks no input, and clears
 * itself. A modal for "not enough mana" would be far more disruptive than the
 * misclick that caused it.
 */
const NoticeBanner = () => {
  const notice = useNoticeStore((state) => state.notice);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[2vh] z-[300] flex justify-center">
      <AnimatePresence mode="wait">
        {notice && (
          // Keyed on the id so repeating the same message replays the drop-in
          // rather than sitting there looking like nothing happened.
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`rounded-md border-[0.15vw] px-[1.5vw] py-[0.5vw] font-belwe text-[1.15vw] shadow-[0_0.3vw_0.8vw_rgba(0,0,0,0.7)] backdrop-blur-xs ${
              notice.kind === "warning"
                ? "border-[#a33b32] bg-[#2b0f0c]/90 text-[#f2c9c4]"
                : "border-[#8d7037] bg-black/85 text-[#f0e0c0]"
            }`}
          >
            {notice.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoticeBanner;
