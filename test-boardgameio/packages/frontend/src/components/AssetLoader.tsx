import { motion } from "motion/react";
import { woodButtonClass } from "./CollectionManager/constants";

const backgroundImage = "assets/menu/main_menu.jpg";

/**
 * The splash shown while `usePreloadAssets` warms the UI chrome. It sits on the
 * main menu's own background so the transition into the menu is a crossfade of
 * the foreground only — and so the very first asset fetched is one we need.
 */
const AssetLoader = ({ progress }: { progress: number }) => (
  <motion.div
    className="fixed inset-0 flex flex-col items-center justify-end bg-black bg-cover bg-center"
    style={{ backgroundImage: `url(${backgroundImage})` }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex flex-col items-center gap-[0.8vw] mb-[8vw] w-[28vw] font-belwe">
      {/* The wooden frame is the same chrome as the collection buttons, so the
          splash reads as part of the game rather than a browser loading state. */}
      <div className={`${woodButtonClass} w-full h-[1.8vw] p-[0.25vw]`}>
        <motion.div
          className="h-full rounded-sm bg-gradient-to-b from-[#f5d76e] via-[#d4a017] to-[#8d6708] shadow-[inset_0_0.1vw_0_rgba(255,255,255,0.5)]"
          // Animated rather than set directly: image loads land in bursts, and
          // an unsmoothed bar visibly jumps.
          animate={{ width: `${Math.round(progress * 100)}%` }}
          initial={{ width: "0%" }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>

      <span className="text-[1.1vw] text-[#f0e0c0] drop-shadow-[0_0.15vw_0.15vw_rgba(0,0,0,0.9)]">
        Loading… {Math.round(progress * 100)}%
      </span>
    </div>
  </motion.div>
);

export default AssetLoader;
