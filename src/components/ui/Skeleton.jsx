import "./ui.css";

/**
 * Skeleton — animated placeholder block for content loading states.
 *
 * Props:
 *   width  — CSS width value  (default: "100%")
 *   height — CSS height value (default: "1rem")
 *   radius — CSS border-radius override (default: inherits var(--radius))
 */
export default function Skeleton({ width = "100%", height = "1rem", radius }) {
  return (
    <span
      className="af-skeleton"
      aria-hidden="true"
      style={{
        width: width,
        height: height,
        borderRadius: radius || undefined,
      }}
    />
  );
}
