import { cn } from "#/utils/utils";
import CloseIcon from "#/icons/close.svg?react";

interface RemoveButtonProps {
  onClick: () => void;
  size?: "small" | "large"; // Add size prop
}

export function RemoveButton({ onClick, size = "small" }: RemoveButtonProps) {
  const buttonSizeClasses = size === "small" ? "w-4 h-4" : "w-5 h-5"; // Adjusted: 16px for small, 20px for large
  const iconSize = size === "small" ? 10 : 12; // Adjusted: 10px for small, 12px for large
  const positionClasses =
    size === "small" ? "right-[1px] top-[1px]" : "right-[2px] top-[2px]"; // Adjusted for new sizes

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-neutral-500/70 hover:bg-neutral-600/90 text-white rounded-full flex items-center justify-center", // Slightly updated appearance
        "absolute",
        buttonSizeClasses,
        positionClasses,
      )}
    >
      <CloseIcon width={iconSize} height={iconSize} />
    </button>
  );
}
