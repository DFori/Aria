"use client";
// src/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { ChatMessage, ConfirmationPayload } from "@/types";
import { generateId, getUserTimezone } from "@/lib/utils";

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        '👋 Hi! I\'m **Aria**, your calendar assistant.\n\nI can help you:\n• **Check your schedule** — _"What\'s on today?"_\n• **Check availability** — _"Am I free tomorrow at 2pm?"_\n• **Schedule meetings** — _"Book a call with john@example.com Friday at 3pm"_\n• **Send emails** — _"Email me tomorrow\'s schedule"_\n• **Set reminders** — _"Remind me to prep slides tomorrow at 9am"_\n\nType **help** to see everything I can do!',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmationPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const conversationHistory = useRef<ConversationEntry[]>([]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const thinkingMsg: ChatMessage = {
        id: "thinking-" + generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setIsLoading(true);
      setPendingConfirmation(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationHistory: conversationHistory.current,
            timezone: getUserTimezone(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Request failed");
        }

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          toolCalls: data.toolCalls?.map(
            (tc: {
              tool: string;
              input: Record<string, unknown>;
              result: unknown;
            }) => ({
              tool: tc.tool,
              input: tc.input,
              result: tc.result,
              status: "done" as const,
            }),
          ),
        };

        // Store confirmation if present
        if (data.requiresConfirmation) {
          const conf: ConfirmationPayload = {
            type: data.requiresConfirmation.type,
            title: data.requiresConfirmation.title,
            description: data.requiresConfirmation.description,
            details: data.requiresConfirmation.details,
            action: {
              tool: data.requiresConfirmation.pendingAction?.type ?? "",
              params: data.requiresConfirmation.pendingAction?.params ?? {},
            },
          };
          setPendingConfirmation(conf);
          assistantMsg.confirmationRequired = conf;
        }

        // Update conversation history
        conversationHistory.current = [
          ...conversationHistory.current,
          { role: "user" as const, content },
          { role: "assistant" as const, content: data.message },
        ].slice(-20);

        setMessages((prev) => [...prev.slice(0, -1), assistantMsg]);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev.slice(0, -1), errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  // Fetch access token for direct API calls
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.accessToken) setAccessToken(data.accessToken);
      })
      .catch(() => {});
  }, []);

  const confirmAction = useCallback(async () => {
    if (!pendingConfirmation || !accessToken) {
      setPendingConfirmation(null);
      return;
    }

    const { tool, params } = pendingConfirmation.action;
    setPendingConfirmation(null);

    try {
      let endpoint = "";
      let successMsg = "";

      if (tool === "create_event") {
        endpoint = "/api/calendar";
        successMsg = `✅ **${params.summary}** created successfully!`;
      } else if (tool === "delete_event") {
        endpoint = "/api/calendar";
        successMsg = `🗑️ **${params.eventTitle}** deleted from your calendar.`;
      } else if (tool === "send_email") {
        endpoint = "/api/email";
        successMsg = `📧 Email sent to **${params.to}** successfully!`;
      } else {
        throw new Error(`Unsupported action: ${tool}`);
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: tool, ...params }),
      });

      if (!res.ok) {
        throw new Error(`API call failed: ${res.status}`);
      }

      const result = await res.json();

      const successMsgFinal: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: successMsg,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, successMsgFinal]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ Failed to execute **${pendingConfirmation.title}**. Please try again or contact support.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [pendingConfirmation, accessToken, setMessages]);

  const cancelAction = useCallback(() => {
    setPendingConfirmation(null);
    const cancelMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "👌 Cancelled. Let me know if you need anything else!",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, cancelMsg]);
  }, [setMessages]);

  return {
    messages,
    isLoading,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    cancelAction,
  };
}
