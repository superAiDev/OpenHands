import { useTranslation } from "react-i18next";
import ArrowSendIcon from "#/icons/arrow-send.svg?react";
import { I18nKey } from "#/i18n/declaration";

interface SubmitButtonProps {
  isDisabled?: boolean;
  onClick: () => void;
}

export function SubmitButton({ isDisabled, onClick }: SubmitButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      aria-label={t(I18nKey.BUTTON$SEND)}
      disabled={isDisabled}
      onClick={onClick}
      type="submit"
      className="border border-white rounded-lg w-5 h-5 sm:w-6 sm:h-6 hover:bg-neutral-500 focus:bg-neutral-500 flex items-center justify-center" // Responsive width and height
    >
      <ArrowSendIcon className="w-3 h-3 sm:w-4 sm:h-4" /> {/* Assuming ArrowSendIcon can take className for size */}
    </button>
  );
}
