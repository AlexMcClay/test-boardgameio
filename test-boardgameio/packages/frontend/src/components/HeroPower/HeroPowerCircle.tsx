import type { HeroPower } from "@project/shared";
import { twMerge } from "tailwind-merge";

const hero_power = "assets/hero_powers/hero_power.png";

type Props = {
  heroPower: HeroPower;
};

const HeroPowerCircle = ({ heroPower }: Props) => {
  return (
    <div className="relative">
      <div
        className={twMerge(
          "flex items-center justify-center relative pointer-events-auto  px-[0.5vw] py-[0.1vw] rounded-full w-[8vw] h-[8vw] text-center smallShadow z-10",
        )}
        style={{
          backgroundImage: `url(${hero_power})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span className="text-[1.1vw] scale-150 text-center font-extrabold text-white font-belwe text-shadow-A absolute top-[0.35vw]">
          {heroPower.manaCost}
        </span>
      </div>
      <img
        src={heroPower.imageUrl}
        // alt={title}
        className={twMerge(
          "object-cover w-[4.5vw] left-[1.8vw] top-[1.83vw]  rounded-full  select-none absolute z-[0]",
        )}
        draggable="false"
      />
    </div>
  );
};

export default HeroPowerCircle;
