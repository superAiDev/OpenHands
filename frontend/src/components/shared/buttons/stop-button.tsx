import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface StopButtonProps {
  isDisabled?: boolean;
  onClick?: () => void;
}

export function StopButton({ isDisabled, onClick }: StopButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      data-testid="stop-button"
      aria-label={t(I18nKey.BUTTON$STOP)}
      disabled={isDisabled}
      onClick={onClick}
      type="button"
      className="border border-white rounded-lg w-5 h-5 sm:w-6 sm:h-6 hover:bg-neutral-500 focus:bg-neutral-500 flex items-center justify-center" // Responsive button size
    >
      <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] bg-white" /> {/* Responsive icon size */}
    </button>
  );
}
