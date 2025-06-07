import { useDisclosure } from "@heroui/react";
import React from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { FaServer, FaExternalLinkAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { DiGit } from "react-icons/di";
import { VscCode } from "react-icons/vsc";
import { I18nKey } from "#/i18n/declaration";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { useConversationId } from "#/hooks/use-conversation-id";
import { Controls } from "#/components/features/controls/controls";
import { clearTerminal } from "#/state/command-slice";
import { useEffectOnce } from "#/hooks/use-effect-once";
import GlobeIcon from "#/icons/globe.svg?react";
import JupyterIcon from "#/icons/jupyter.svg?react";
import TerminalIcon from "#/icons/terminal.svg?react";
import { clearJupyter } from "#/state/jupyter-slice";

import { ChatInterface } from "../components/features/chat/chat-interface";
import { WsClientProvider } from "#/context/ws-client-provider";
import { EventHandler } from "../wrapper/event-handler";
import { useConversationConfig } from "#/hooks/query/use-conversation-config";
import { Container } from "#/components/layout/container";
import {
  Orientation,
  ResizablePanel,
} from "#/components/layout/resizable-panel";
import Security from "#/components/shared/modals/security/security";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { ServedAppLabel } from "#/components/layout/served-app-label";
import { useSettings } from "#/hooks/query/use-settings";
import { RootState } from "#/store";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useDocumentTitleFromState } from "#/hooks/use-document-title-from-state";
import { transformVSCodeUrl } from "#/utils/vscode-url-helper";
import OpenHands from "#/api/open-hands";
import { TabContent } from "#/components/layout/tab-content";
import { useIsAuthed } from "#/hooks/query/use-is-authed";

function AppContent() {
  useConversationConfig();
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const { conversationId } = useConversationId();
  const { data: conversation, isFetched, refetch } = useActiveConversation();
  const { data: isAuthed } = useIsAuthed();

  const { curAgentState } = useSelector((state: RootState) => state.agent);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set the document title to the conversation title when available
  useDocumentTitleFromState();

  const [width, setWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    if (isFetched && !conversation && isAuthed) {
      displayErrorToast(
        "This conversation does not exist, or you do not have permission to access it.",
      );
      navigate("/");
    } else if (conversation?.status === "STOPPED") {
      // start the conversation if the state is stopped on initial load
      OpenHands.startConversation(conversation.conversation_id).then(() =>
        refetch(),
      );
    }
  }, [conversation?.conversation_id, isFetched, isAuthed]);

  React.useEffect(() => {
    dispatch(clearTerminal());
    dispatch(clearJupyter());
  }, [conversationId]);

  useEffectOnce(() => {
    dispatch(clearTerminal());
    dispatch(clearJupyter());
  });

  function handleResize() {
    setWidth(window.innerWidth);
  }

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    isOpen: securityModalIsOpen,
    onOpen: onSecurityModalOpen,
    onOpenChange: onSecurityModalOpenChange,
  } = useDisclosure();

  function renderMain() {
    const basePath = `/conversations/${conversationId}`;

    // Always render ChatInterface, its visibility or stacking order will be handled by Tailwind
    const chatInterfaceElement = (
      <div
        // On medium screens and up, this will be the first child of ResizablePanel
        // On small screens, this could take full width or be part of a flex-col layout
        className="rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary md:h-full h-1/2" // Example: half height on small screens
      >
        <ChatInterface />
      </div>
    );

    const tabContainerElement = (
      <Container
        // On medium screens and up, this will be the second child of ResizablePanel
        // On small screens, this could take full width or be part of a flex-col layout
        className="h-full w-full md:h-full h-1/2" // Example: half height on small screens
        labels={[
          {
            label: "Changes",
                label: <span className="hidden sm:inline">Changes</span>, // Text hidden on very small screens
                to: "",
                icon: <DiGit className="w-5 h-5 sm:w-6 sm:h-6" />, // Smaller icon on xs
              },
              {
                label: (
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline">{t(I18nKey.VSCODE$TITLE)}</span>
                  </div>
                ),
                to: "vscode",
                icon: <VscCode className="w-4 h-4 sm:w-5 sm:h-5" />,
                rightContent: !RUNTIME_INACTIVE_STATES.includes(
                  curAgentState,
                ) ? (
                  <FaExternalLinkAlt
                    className="w-3 h-3 text-neutral-400 cursor-pointer"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (conversationId) {
                        try {
                          const data =
                            await OpenHands.getVSCodeUrl(conversationId);
                          if (data.vscode_url) {
                            const transformedUrl = transformVSCodeUrl(
                              data.vscode_url,
                            );
                            if (transformedUrl) {
                              window.open(transformedUrl, "_blank");
                            }
                          }
                        } catch (err) {
                          // Silently handle the error
                        }
                      }
                    }}
                  />
                ) : null,
              },
              {
                label: t(I18nKey.WORKSPACE$TERMINAL_TAB_LABEL),
                to: "terminal",
                icon: <TerminalIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
              },
              {
                label: <span className="hidden sm:inline">Jupyter</span>,
                to: "jupyter",
                icon: <JupyterIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
              },
              {
                label: <ServedAppLabel smallScreen={width <= 640} />, // Pass screen size info if needed, or adapt ServedAppLabel internally
                to: "served",
                icon: <FaServer className="w-5 h-5 sm:w-6 sm:h-6" />,
              },
              {
                label: (
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline">{t(I18nKey.BROWSER$TITLE)}</span>
                  </div>
                ),
                to: "browser",
                icon: <GlobeIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
              },
            ]}
          >
            <div className="h-full w-full">
              <TabContent conversationPath={basePath} />
            </div>
          </Container>
    );

    return (
      <>
        {/* Small screens: Stack chat and tabs vertically */}
        <div className="md:hidden flex flex-col h-full w-full gap-3">
          {chatInterfaceElement}
          {tabContainerElement}
        </div>

        {/* Medium screens and up: Resizable panel */}
        <ResizablePanel
          orientation={Orientation.HORIZONTAL}
          className="hidden md:flex grow h-full min-h-0 min-w-0" // Use md:flex to show only on md and up
          initialSize={width > 1024 ? 500 : Math.max(300, width * 0.4)} // Adjust initial size based on width
          firstClassName="rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary"
          secondClassName="flex flex-col overflow-hidden"
          firstChild={chatInterfaceElement} // Re-use the chat interface element
          secondChild={tabContainerElement} // Re-use the tab container element
        />
      </>
    );
  }

  return (
    <WsClientProvider conversationId={conversationId}>
      <EventHandler>
        <div data-testid="app-route" className="flex flex-col h-full gap-2 sm:gap-3"> {/* Smaller gap on xs */}
          <div className="flex flex-col md:flex-row h-full overflow-auto grow"> {/* Allow grow for ResizablePanel */}
            {renderMain()}
          </div>
          <Controls
            setSecurityOpen={onSecurityModalOpen}
            showSecurityLock={!!settings?.SECURITY_ANALYZER}
          />
          {settings && (
            <Security
              isOpen={securityModalIsOpen}
              onOpenChange={onSecurityModalOpenChange}
              securityAnalyzer={settings.SECURITY_ANALYZER}
            />
          )}
        </div>
      </EventHandler>
    </WsClientProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
