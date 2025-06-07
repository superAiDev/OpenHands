import { cn } from "#/utils/utils"; // Import cn utility

interface ChevronLeftProps {
  active?: boolean;
  className?: string; // Add className prop
}

export function ChevronLeft({ active, className }: ChevronLeftProps) {
  const defaultClasses = "w-5 h-5"; // Default size (20x20px)
  return (
    <svg
      // Remove width, height, and viewBox from here if solely relying on Tailwind from className
      // Or, keep viewBox if the SVG path coordinates depend on it and scale it,
      // but typical Tailwind usage for SVGs often omits width/height for `fill: currentColor` icons.
      // For this SVG, viewBox is important due to path coordinates. Let's keep it dynamic for now,
      // assuming the parent will provide a className that defines width/height.
      // If className doesn't provide w/h, it might not render as expected or take a default.
      // A robust approach would be to have width/height props AND className for overrides or Tailwind sizing.
      // For now, let's assume className will provide w/h and keep viewBox fixed or make it scale.
      // The original viewBox implies path coords are for a 20x20 box.
      viewBox={`0 0 20 20`} // Keep viewBox consistent if path is designed for it
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(defaultClasses, className)} // Apply className
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.204 15.0037L6.65511 9.99993L11.204 4.99617L12.1289 5.83701L8.34444 9.99993L12.1289 14.1628L11.204 15.0037Z"
        fill={active ? "#D4D4D4" : "#525252"}
      />
    </svg>
  );
}
