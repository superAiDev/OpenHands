import React from "react";

interface RejectIconProps {
  className?: string;
}

function RejectIcon({ className }: RejectIconProps) {
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default RejectIcon;
