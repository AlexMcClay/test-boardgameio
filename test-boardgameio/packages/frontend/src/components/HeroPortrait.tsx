import { twMerge } from "tailwind-merge";
import { heroPortraitClipPath } from "@/utils";

interface Props {
  src: string;
  alt: string;
  /** Extra classes for the wrapper; it fills its parent by default. */
  className?: string;
}

/**
 * A hero portrait cut to the Hearthstone shield silhouette.
 *
 * Three stacked layers, all sharing `heroPortraitClipPath`: the art, an inset
 * shadow that hugs the same outline (multiply-blended so it darkens rather than
 * greys), and a top-down gradient that corrects the arc — without that last one
 * the inset shadow reads as a flat band across the crown.
 *
 * Sized entirely by its parent, which is what lets the same component serve the
 * small in-game hero and the large PlayScreen preview.
 */
const HeroPortrait = ({ src, alt, className }: Props) => (
  <div
    className={twMerge(
      "relative h-full w-full overflow-hidden pointer-events-none",
      className,
    )}
    style={{
      clipPath: heroPortraitClipPath,

      aspectRatio: "1 / 1.06",
    }}
  >
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover opacity-100 pointer-events-none"
      draggable="false"
    />

    <div
      className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-100 border border-black"
      style={{
        boxShadow: "inset 0px 0px 20px 8px rgba(0, 0, 0, 1)",
        clipPath: heroPortraitClipPath,
      }}
    />

    <div
      className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-transparent"
      style={{ clipPath: heroPortraitClipPath }}
    />
  </div>
);

export default HeroPortrait;
