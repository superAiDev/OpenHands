import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";
import i18n from "#/i18n";

interface ErrorMessageProps {
  errorId?: string;
  defaultMessage: string;
}

export function ErrorMessage({ errorId, defaultMessage }: ErrorMessageProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = React.useState(false);

  const hasValidTranslationId = !!errorId && i18n.exists(errorId);
  const errorKey = hasValidTranslationId
    ? errorId
    : "CHAT_INTERFACE$AGENT_ERROR_MESSAGE";

  return (
    <div className="flex flex-col gap-1 sm:gap-2 border-l-2 pl-1 sm:pl-2 my-1 sm:my-2 py-1 sm:py-2 border-danger text-sm w-full"> {/* Responsive gap, padding, margin */}
      <div className="font-bold text-danger flex items-center"> {/* Added flex items-center for alignment */}
        <span>{t(errorKey)}</span> {/* Wrapped text in span */}
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="cursor-pointer text-left ml-1 sm:ml-2" // Responsive margin
        >
          {showDetails ? (
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 inline fill-danger" /> {/* Responsive icon size */}
          ) : (
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 inline fill-danger" /> {/* Responsive icon size */}
          )}
        </button>
      </div>

      {showDetails && (
        <Markdown
          components={{
            code,
            ul,
            ol,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {defaultMessage}
        </Markdown>
      )}
    </div>
  );
}
