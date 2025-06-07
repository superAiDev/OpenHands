import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { code } from "../markdown/code";
import { cn } from "#/utils/utils";
import { ul, ol } from "../markdown/list";
import { CopyToClipboardButton } from "#/components/shared/buttons/copy-to-clipboard-button";
import { anchor } from "../markdown/anchor";
import { OpenHandsSourceType } from "#/types/core/base";
import { paragraph } from "../markdown/paragraph";

interface ChatMessageProps {
  type: OpenHandsSourceType;
  message: string;
}

export function ChatMessage({
  type,
  message,
  children,
}: React.PropsWithChildren<ChatMessageProps>) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [isCopy, setIsCopy] = React.useState(false);

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(message);
    setIsCopy(true);
  };

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isCopy) {
      timeout = setTimeout(() => {
        setIsCopy(false);
      }, 2000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopy]);

  return (
    <article
      data-testid={`${type}-message`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "rounded-xl relative",
        "flex flex-col gap-1 sm:gap-2", // Responsive gap
        type === "user" &&
          "max-w-[85%] sm:max-w-sm md:max-w-md lg:max-w-lg p-2 sm:p-3 md:p-4 bg-tertiary self-end", // Responsive max-width and padding for user
        type === "agent" &&
          "mt-3 sm:mt-4 md:mt-6 max-w-full bg-transparent", // Responsive margin for agent
      )}
    >
      <CopyToClipboardButton
        isHidden={!isHovering}
        isDisabled={isCopy}
        onClick={handleCopyToClipboard}
        mode={isCopy ? "copied" : "copy"}
      />
      {/* Text size can be made responsive if needed e.g., text-xs sm:text-sm. For now, text-sm is kept. */}
      <div className="text-sm break-words">
        <Markdown
          components={{
            code,
            ul,
            ol,
            a: anchor,
            p: paragraph,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {message}
        </Markdown>
      </div>
      {children}
    </article>
  );
}
