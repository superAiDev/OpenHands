import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { AgentState } from "#/types/agent-state";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { useWsClient } from "#/context/ws-client-provider";
import { ActionTooltip } from "../action-tooltip";

export function ConfirmationButtons() {
  const { t } = useTranslation();
  const { send } = useWsClient();

  const handleStateChange = (state: AgentState) => {
    const event = generateAgentStateChangeEvent(state);
    send(event);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 sm:pt-4 gap-2 sm:gap-0"> {/* Stack on xs, row on sm+; responsive padding; gap for stacked layout */}
      <p className="text-sm">{t(I18nKey.CHAT_INTERFACE$USER_ASK_CONFIRMATION)}</p> {/* Ensure text size consistency */}
      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center"> {/* Responsive gap; adjust alignment for stacked vs row */}
        <ActionTooltip
          type="confirm"
          onClick={() => handleStateChange(AgentState.USER_CONFIRMED)}
        />
        <ActionTooltip
          type="reject"
          onClick={() => handleStateChange(AgentState.USER_REJECTED)}
        />
      </div>
    </div>
  );
}
