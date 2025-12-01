"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ContextMenu, type ContextMenuEntry } from "@/components/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";
import {
  Bot,
  ChevronRight,
  CircleUserRound,
  HelpCircle,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
  : undefined;
const SUGGESTED_PROMPTS = [
  {
    title: "Marketing copy",
    body: "Write a friendly launch email for my brand-new AI chatbot product.",
  },
  {
    title: "Code review",
    body: "Review this React hook for bugs and suggest performance tweaks.",
  },
  {
    title: "Product strategy",
    body: "Brainstorm positioning ideas for an AI assistant targeting designers.",
  },
  {
    title: "Learning plan",
    body: "Create a 2-week crash course to get better at TypeScript.",
  },
];

const ChatPage = () => {
  const { data: session, status } = useSession();
  const accessToken = session?.user?.accessToken;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const streamController = useRef<AbortController | null>(null);

  const authJsonFetch = useCallback(
    async (
      path: string,
      options?: RequestInit & { json?: Record<string, unknown> }
    ) => {
      if (!API_BASE_URL) {
        throw new Error("Missing NEXT_PUBLIC_API_URL env variable.");
      }

      if (!accessToken) {
        throw new Error("Authentication token is unavailable.");
      }

      const { json, headers, ...rest } = options || {};
      const normalizedHeaders =
        headers instanceof Headers
          ? Object.fromEntries(headers.entries())
          : Array.isArray(headers)
          ? Object.fromEntries(headers)
          : headers;
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: rest.method ?? "GET",
        cache: "no-store",
        ...rest,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(normalizedHeaders || {}),
        },
        body: json ? JSON.stringify(json) : rest.body,
      });

      if (!response.ok) {
        let message = "Something went wrong";
        try {
          const errorPayload = await response.json();
          message = errorPayload?.message || message;
        } catch (error) {
          // ignore json parsing errors
        }
        throw new Error(message);
      }

      return response.json();
    },
    [accessToken]
  );

  const fetchConversationById = useCallback(
    async (conversationId: string, withLoader = true) => {
      if (!conversationId) return;
      if (withLoader) {
        setIsLoadingMessages(true);
      }
      try {
        const response = await authJsonFetch(
          `/chat/conversation/${conversationId}`
        );
        setMessages(response?.data?.messages ?? []);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        if (withLoader) {
          setIsLoadingMessages(false);
        }
      }
    },
    [authJsonFetch]
  );

  const fetchConversations = useCallback(
    async (selectFirst = false) => {
      setIsLoadingConversations(true);
      try {
        const response = await authJsonFetch("/chat/conversations");
        const payload: Conversation[] = response?.data ?? [];
        setConversations(payload);

        if (
          selectFirst &&
          payload.length > 0 &&
          (!selectedConversationId ||
            !payload.some((c) => c.id === selectedConversationId))
        ) {
          setSelectedConversationId(payload[0].id);
        }
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [authJsonFetch, selectedConversationId]
  );

  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      fetchConversations(true);
    }
  }, [status, accessToken, fetchConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchConversationById(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, fetchConversationById]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        240
      )}px`;
    }
  }, [messageInput]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAssistantMessage]);

  useEffect(() => {
    return () => {
      streamController.current?.abort();
    };
  }, []);

  const filteredConversations = useMemo(() => {
    if (!sidebarSearch.trim()) return conversations;
    return conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(sidebarSearch.trim().toLowerCase())
    );
  }, [conversations, sidebarSearch]);

  const relativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const profileMenuEntries = useMemo<ContextMenuEntry[]>(
    () => [
      {
        id: "upgrade",
        label: "Upgrade plan",
        icon: Star,
        iconClassName: "text-amber-300",
        onSelect: () => setIsProfileMenuOpen(false),
      },
      {
        id: "personalization",
        label: "Personalization",
        icon: Wand2,
        iconClassName: "text-emerald-300",
        onSelect: () => setIsProfileMenuOpen(false),
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        iconClassName: "text-sky-300",
        onSelect: () => setIsProfileMenuOpen(false),
      },
      {
        id: "divider-1",
        type: "divider",
      },
      {
        id: "help",
        label: "Help",
        icon: HelpCircle,
        iconClassName: "text-purple-300",
        endIcon: ChevronRight,
        onSelect: () => setIsProfileMenuOpen(false),
      },
      {
        id: "logout",
        label: "Log out",
        icon: LogOut,
        tone: "danger",
        onSelect: () => {
          setIsProfileMenuOpen(false);
          signOut({ callbackUrl: "/auth/login" });
        },
      },
    ],
    [signOut]
  );

  const handleNewConversation = async (title?: string) => {
    try {
      setIsCreatingConversation(true);
      const response = await authJsonFetch("/chat/conversation", {
        method: "POST",
        json: {
          title:
            title?.trim() ||
            `New chat ${new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
        },
      });
      const newConversation: Conversation = response.data;
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.id);
      setMessages([]);
      return newConversation.id;
    } catch (error) {
      toast.error((error as Error).message);
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setPendingAssistantMessage("");
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await authJsonFetch(`/chat/conversation/${conversationId}`, {
        method: "DELETE",
      });
      const updatedList = conversations.filter(
        (conversation) => conversation.id !== conversationId
      );
      setConversations(updatedList);

      if (selectedConversationId === conversationId) {
        if (updatedList.length) {
          const nextConversationId = updatedList[0].id;
          setSelectedConversationId(nextConversationId);
          await fetchConversationById(nextConversationId);
        } else {
          setSelectedConversationId(null);
          setMessages([]);
        }
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const streamAssistantResponse = useCallback(
    async (conversationId: string, prompt: string) => {
      if (!API_BASE_URL) {
        throw new Error("Missing NEXT_PUBLIC_API_URL env variable.");
      }

      const controller = new AbortController();
      streamController.current?.abort();
      streamController.current = controller;

      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          conversationId,
          message: prompt,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to stream response";
        try {
          const payload = await response.json();
          message = payload?.message || message;
        } catch (error) {
          // ignore json parsing errors
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      setPendingAssistantMessage("");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";
        for (const segment of segments) {
          const dataLine = segment
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.replace(/^data:\s*/, "");
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.content) {
              setPendingAssistantMessage((prev) => prev + parsed.content);
            }
          } catch (error) {
            // ignore invalid chunks
          }
        }
      }

      await fetchConversationById(conversationId, false);
      await fetchConversations();
      setPendingAssistantMessage("");
    },
    [accessToken, fetchConversationById, fetchConversations]
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isStreaming || isCreatingConversation) return;
    const prompt = messageInput.trim();
    setMessageInput("");
    setPendingAssistantMessage("");

    let currentConversationId = selectedConversationId;
    if (!currentConversationId) {
      const generatedId = await handleNewConversation(prompt.slice(0, 40));
      if (!generatedId) return;
      currentConversationId = generatedId;
    }

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setIsStreaming(true);

    try {
      await streamAssistantResponse(currentConversationId, prompt);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    streamController.current?.abort();
    setIsStreaming(false);
    setPendingAssistantMessage("");
    if (selectedConversationId) {
      fetchConversationById(selectedConversationId, false);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setMessageInput(prompt);
    textareaRef.current?.focus();
  };

  const renderSidebar = () => (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border/60 px-4 py-4">
        <div>
          {/* <p className="text-xs uppercase tracking-widest text-white/50">
            AI Chatbot
          </p> */}
          <p className="text-lg font-semibold">Chat Studio</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setIsDesktopSidebarVisible((previous) => !previous)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      <div className="px-4 py-4 space-y-3">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => handleNewConversation()}
          disabled={isCreatingConversation}
        >
          <Plus className="size-4" />
          New chat
        </Button>
        <Input
          value={sidebarSearch}
          onChange={(event) => setSidebarSearch(event.target.value)}
          placeholder="Search conversations"
          className="bg-background/60 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {isLoadingConversations ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-12 animate-pulse rounded-xl bg-muted/40"
            />
          ))
        ) : filteredConversations.length ? (
          filteredConversations.map((conversation) => {
            const isActive = selectedConversationId === conversation.id;
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group cursor-pointer rounded-xl border border-transparent px-3 py-2 transition-all hover:border-accent hover:bg-accent/10",
                  isActive && "border-accent bg-accent/15"
                )}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent/15 p-2">
                    <MessageSquare className="size-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">
                      {conversation.title || "Untitled conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(conversation.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start a new chat to begin.
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <ContextMenu
          open={isProfileMenuOpen}
          onOpenChange={setIsProfileMenuOpen}
          align="start"
          title={session?.user?.name ?? "Guest user"}
          subtitle={session?.user?.email ?? "No email linked"}
          avatar={
            <div className="flex size-12 items-center justify-center rounded-full from-indigo-500 via-sky-500 to-emerald-400 text-base font-semibold uppercase text-white">
              {session?.user?.name?.[0] ?? "U"}
            </div>
          }
          items={profileMenuEntries}
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2 text-left transition hover:bg-muted/60"
            >
              <div className="flex size-10 items-center justify-center rounded-full from-indigo-500 via-sky-500 to-emerald-400 text-base font-semibold uppercase text-white">
                {session?.user?.name?.[0] ?? "U"}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {session?.user?.name ?? "Guest"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email ?? "No email"}
                </p>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </button>
          }
        />
      </div>
    </aside>
  );

  const renderMessages = () => {
    if (isLoadingMessages) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading conversation...
          </div>
        </div>
      );
    }

    if (!messages.length && !pendingAssistantMessage) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-10 overflow-y-auto px-6 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.4rem] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              What&apos;s on your mind today?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Ask anything, brainstorm ideas, or get code help – just like
              ChatGPT.
            </p>
          </div>
          <div className="grid w-full gap-4 md:grid-cols-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                className="rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-accent/10"
                onClick={() => handleSuggestionClick(prompt.body)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 text-amber-300" />
                  {prompt.title}
                </div>
                <p className="mt-2 max-h-20 overflow-hidden text-sm text-muted-foreground">
                  {prompt.body}
                </p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto py-8 pr-2">
          {[...messages].map((message) => (
            <div key={message.id} className="px-4 py-6">
              <div
                className={cn(
                  "mx-auto flex max-w-3xl items-start gap-4",
                  message.role === "user" && "flex-row-reverse text-right"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    message.role === "assistant"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="size-5" />
                  ) : (
                    <CircleUserRound className="size-5" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex-1 whitespace-pre-wrap text-base leading-relaxed text-foreground",
                    message.role === "user" && "text-right"
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {pendingAssistantMessage && (
            <div className="px-4 py-6">
              <div className="mx-auto flex max-w-3xl items-start gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-5" />
                </div>
                <div className="flex-1 whitespace-pre-wrap text-base leading-relaxed text-foreground">
                  {pendingAssistantMessage}
                  <span className="ml-1 animate-pulse">▋</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading chat experience...
        </div>
      </div>
    );
  }

  if (!API_BASE_URL) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-lg font-semibold">
          NEXT_PUBLIC_API_URL is not configured.
        </p>
        <p className="text-muted-foreground">
          Please update your environment variables and reload the page.
        </p>
      </div>
    );
  }

  if (status !== "authenticated" || !accessToken) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
        <h1 className="text-3xl font-semibold">You need to sign in first</h1>
        <a
          href="/auth/login"
          className="rounded-full border border-border px-6 py-2 text-foreground hover:bg-accent/10"
        >
          Go to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden from-background via-muted to-background text-foreground">
      <div className="hidden md:flex">
        {isDesktopSidebarVisible && renderSidebar()}
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="flex-1 bg-background/80"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-72">{renderSidebar()}</div>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "inline-flex text-muted-foreground",
              isDesktopSidebarVisible ? "md:hidden" : "md:inline-flex"
            )}
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setIsMobileSidebarOpen(true);
              } else {
                setIsDesktopSidebarVisible((previous) => !previous);
              }
            }}
          >
            <Menu className="size-5" />
          </Button>
          <div>
            {/* <p className="text-xs uppercase tracking-[0.3rem] text-white/40">
              ChatGPT mode
            </p> */}
            <h1 className="text-lg font-semibold text-foreground">
              {selectedConversationId
                ? conversations.find((c) => c.id === selectedConversationId)
                    ?.title ?? "Conversation"
                : "New conversation"}
            </h1>
          </div>
          {/* <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => handleNewConversation()}
              disabled={isCreatingConversation}
            >
              <Plus className="size-4" />
              New chat
            </Button>
          </div> */}
        </header>

        <section className="flex flex-1 flex-col overflow-hidden">
          {renderMessages()}
        </section>

        <footer className="border-t border-border px-4 py-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto flex max-w-3xl flex-col gap-3"
          >
            <div className="relative rounded-2xl border border-border bg-card px-4">
              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message ChatGPT..."
                className="w-full resize-none bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground"
                rows={1}
              />
              <div className="flex items-center justify-end gap-2 pb-4">
                {isStreaming ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-amber-200 hover:text-amber-100"
                    onClick={handleStopStreaming}
                  >
                    <Loader2 className="size-4 animate-spin" />
                    Stop generating
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!messageInput.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              AI responses are generated and may contain inaccuracies. Double
              check important information.
            </p>
          </form>
        </footer>
      </main>
    </div>
  );
};

export default ChatPage;
