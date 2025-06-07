import { cn } from "#/utils/utils"; // Import cn utility

interface ChevronRightProps {
  active?: boolean;
  className?: string; // Add className prop
}

export function ChevronRight({ active, className }: ChevronRightProps) {
  const defaultClasses = "w-5 h-5"; // Default size (20x20px)
  return (
    <svg
      viewBox={`0 0 20 20`} // Keep viewBox consistent if path is designed for it
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(defaultClasses, className)} // Apply className
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.79602 4.99634L13.3449 10.0001L8.79602 15.0038L7.87109 14.163L11.6556 10.0001L7.87109 5.83718L8.79602 4.99634Z"
        fill={active ? "#D4D4D4" : "#525252"}
      />
    </svg>
  );
}
