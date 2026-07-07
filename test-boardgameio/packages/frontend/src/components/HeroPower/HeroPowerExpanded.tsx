import type { HeroPower } from "@project/shared";
import { twMerge } from "tailwind-merge";

const hero_popover_cover = "assets/hero_powers/Hero-power-player.webp";
const hero_popover_cover_enemy = "assets/hero_powers/Hero-power-opponent.webp";

type Props = {
  heroPower: HeroPower;
  isTop?: boolean;
};

const HeroPowerExpanded = ({ heroPower, isTop }: Props) => {
  return (
    <div className="relative flex flex-col">
      <div
        title={heroPower?.name}
        className={twMerge(
          "flex items-center justify-center relative   px-[0.5vw] py-[0.1vw]  w-[12vw] h-[18vw] text-center  z-10",
        )}
        style={{
          backgroundImage: `url(${isTop ? hero_popover_cover_enemy : hero_popover_cover})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span className="text-[1.5vw] scale-150 text-center font-extrabold text-white font-belwe text-shadow-A absolute top-[0vw]">
          {heroPower?.manaCost}
        </span>
      </div>
      <img
        src={heroPower?.imageUrl}
        // alt={title}
        className={twMerge(
          "object-cover w-[5.4vw] left-[3.3vw] top-[2.2vw]  rounded-full  select-none absolute z-[-3]",
        )}
        draggable="false"
      />
      <div className=" w-[8vw] h-[1vw] absolute z-10 self-center top-[46%] font-base text-[1vw] text-center font-extrabold text-white font-belwe text-shadow-A ">
        {heroPower?.name}
      </div>
      <div className=" w-[8vw] h-[4vw] absolute z-10 self-center top-[64%] font-base">
        <p className="text-[0.8vw] text-center font-[800]  text-black font-base">
          Hero Power
        </p>
        <p className="text-[0.8vw] font-[600] text-center text-black font-base">
          {heroPower?.description}
        </p>
      </div>
    </div>
  );
};

export default HeroPowerExpanded;
