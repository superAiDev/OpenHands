import { Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import ConfirmIcon from "#/assets/confirm";
import RejectIcon from "#/assets/reject";
import { I18nKey } from "#/i18n/declaration";

interface ActionTooltipProps {
  type: "confirm" | "reject";
  onClick: () => void;
}

export function ActionTooltip({ type, onClick }: ActionTooltipProps) {
  const { t } = useTranslation();

  const content =
    type === "confirm"
      ? t(I18nKey.CHAT_INTERFACE$USER_CONFIRMED)
      : t(I18nKey.CHAT_INTERFACE$USER_REJECTED);

  return (
    <Tooltip content={content} closeDelay={100}>
      <button
        data-testid={`action-${type}-button`}
        type="button"
        aria-label={
          type === "confirm"
            ? t(I18nKey.ACTION$CONFIRM)
            : t(I18nKey.ACTION$REJECT)
        }
        className="bg-tertiary rounded-full p-1 sm:p-1.5 hover:bg-base-secondary" // Responsive padding
        onClick={onClick}
      >
        {type === "confirm" ? (
          <ConfirmIcon className="w-4 h-4 sm:w-5 sm:h-5" /> // Assuming icons can take className for size
        ) : (
          <RejectIcon className="w-4 h-4 sm:w-5 sm:h-5" /> // Assuming icons can take className for size
        )}
      </button>
    </Tooltip>
  );
}
