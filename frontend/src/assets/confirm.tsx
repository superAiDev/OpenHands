import React from "react";

interface ConfirmIconProps {
  className?: string;
}

function ConfirmIcon({ className }: ConfirmIconProps) {
  // Default classes if no className is provided, or merge if needed.
  // For simplicity, we'll let the passed className override the default w-5 h-5.
  // If a more complex merge is needed, the `cn` utility could be used.
  const defaultClasses = "w-5 h-5"; // Default size if no className is passed
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className || defaultClasses} // Apply passed className or default
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default ConfirmIcon;
