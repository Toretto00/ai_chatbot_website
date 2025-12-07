"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const streamController = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
        // Sort by updatedAt descending (newest first)
        const sortedPayload = payload.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setConversations(sortedPayload);

        if (
          selectFirst &&
          sortedPayload.length > 0 &&
          (!selectedConversationId ||
            !sortedPayload.some((c) => c.id === selectedConversationId))
        ) {
          // Select the latest (first) conversation
          setSelectedConversationId(sortedPayload[0].id);
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

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(15);
  }, [sidebarSearch]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (sidebarSearch.trim()) {
      filtered = conversations.filter((conversation) =>
        conversation.title
          .toLowerCase()
          .includes(sidebarSearch.trim().toLowerCase())
      );
    }
    // Sort by updatedAt descending (newest first) and apply visible limit
    return [...filtered]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, visibleCount);
  }, [conversations, sidebarSearch, visibleCount]);

  const totalFilteredCount = useMemo(() => {
    if (!sidebarSearch.trim()) return conversations.length;
    return conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(sidebarSearch.trim().toLowerCase())
    ).length;
  }, [conversations, sidebarSearch]);

  const hasMoreConversations = visibleCount < totalFilteredCount;

  // Intersection observer for lazy loading conversations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreConversations &&
          !isLoadingMore
        ) {
          setIsLoadingMore(true);
          // Simulate a small delay for smoother UX
          setTimeout(() => {
            setVisibleCount((prev) => prev + 10);
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMoreConversations, isLoadingMore]);

  const relativeTime = (dateString: string) => {
    // Ensure proper UTC parsing - append 'Z' if no timezone info present
    let normalizedDateString = dateString;
    if (
      dateString &&
      !dateString.endsWith("Z") &&
      !dateString.includes("+") &&
      !/[-+]\d{2}:\d{2}$/.test(dateString)
    ) {
      // Replace space with 'T' if needed (for MySQL format) and append 'Z'
      normalizedDateString = dateString.replace(" ", "T") + "Z";
    }

    const date = new Date(normalizedDateString);
    const now = Date.now();
    const diff = now - date.getTime();

    // Handle negative diff (future dates or clock skew)
    if (diff < 0 || isNaN(diff)) return "Just now";

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
    <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border/60 px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-semibold truncate">
            Chat Studio
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0 hidden md:inline-flex"
          onClick={() => setIsDesktopSidebarVisible((previous) => !previous)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            handleNewConversation();
            setIsMobileSidebarOpen(false);
          }}
          disabled={isCreatingConversation}
        >
          <Plus className="size-4" />
          New chat
        </Button>
        <Input
          value={sidebarSearch}
          onChange={(event) => setSidebarSearch(event.target.value)}
          placeholder="Search conversations"
          className="bg-background/60 text-foreground placeholder:text-muted-foreground text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 space-y-2 sm:space-y-3 pb-4">
        {isLoadingConversations ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-12 animate-pulse rounded-xl bg-muted/40"
            />
          ))
        ) : filteredConversations.length ? (
          <>
            {filteredConversations.map((conversation) => {
              const isActive = selectedConversationId === conversation.id;
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group cursor-pointer rounded-xl border border-transparent px-2.5 sm:px-3 py-2 transition-all hover:border-accent hover:bg-accent/10 active:scale-[0.98]",
                    isActive && "border-accent bg-accent/15"
                  )}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="rounded-lg bg-accent/15 p-1.5 sm:p-2 shrink-0">
                      <MessageSquare className="size-3.5 sm:size-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
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
                      className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive shrink-0"
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
            })}
            {/* Lazy load trigger */}
            {hasMoreConversations && (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center py-2"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
            No conversations yet. Start a new chat to begin.
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 sm:p-4">
        <ContextMenu
          open={isProfileMenuOpen}
          onOpenChange={setIsProfileMenuOpen}
          align="start"
          title={session?.user?.name ?? "Guest user"}
          subtitle={session?.user?.email ?? "No email linked"}
          avatar={
            <div className="flex size-10 sm:size-12 items-center justify-center rounded-full from-indigo-500 via-sky-500 to-emerald-400 text-sm sm:text-base font-semibold uppercase text-white">
              {session?.user?.name?.[0] ?? "U"}
            </div>
          }
          items={profileMenuEntries}
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-border bg-muted/40 px-2.5 sm:px-3 py-2 text-left transition hover:bg-muted/60 active:scale-[0.98]"
            >
              <div className="flex size-8 sm:size-10 items-center justify-center rounded-full from-indigo-500 via-sky-500 to-emerald-400 text-sm sm:text-base font-semibold uppercase text-white shrink-0">
                {session?.user?.name?.[0] ?? "U"}
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-semibold truncate">
                  {session?.user?.name ?? "Guest"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email ?? "No email"}
                </p>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground shrink-0" />
            </button>
          }
        />
      </div>
    </aside>
  );

  const renderMessages = () => {
    if (isLoadingMessages) {
      return (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="flex items-center gap-3 text-muted-foreground text-sm sm:text-base">
            <Loader2 className="size-4 sm:size-5 animate-spin shrink-0" />
            <span>Loading conversation...</span>
          </div>
        </div>
      );
    }

    if (!messages.length && !pendingAssistantMessage) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:gap-10 overflow-y-auto px-4 sm:px-6 text-center">
          <div className="max-w-lg">
            <p className="hidden sm:block text-sm uppercase tracking-[0.4rem] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-0 sm:mt-4 text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              What&apos;s on your mind today?
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Ask anything, brainstorm ideas, or get code help – just like
              ChatGPT.
            </p>
          </div>
          <div className="grid w-full max-w-2xl gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4 text-left transition hover:bg-accent/10 active:scale-[0.98]"
                onClick={() => handleSuggestionClick(prompt.body)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 text-amber-300 shrink-0" />
                  {prompt.title}
                </div>
                <p className="mt-1.5 sm:mt-2 max-h-16 sm:max-h-20 overflow-hidden text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
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
        <div className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto py-4 sm:py-8 pr-1 sm:pr-2">
          {[...messages].map((message) => (
            <div key={message.id} className="px-3 sm:px-4 py-3 sm:py-6">
              <div
                className={cn(
                  "mx-auto flex max-w-3xl items-start gap-2.5 sm:gap-4",
                  message.role === "user" && "flex-row-reverse text-right"
                )}
              >
                <div
                  className={cn(
                    "text-sm sm:text-base leading-relaxed text-foreground min-w-0",
                    message.role === "user" &&
                      "text-right whitespace-pre-wrap p-4 max-w-[85%] sm:max-w-[80%] rounded-2xl bg-primary/10 border border-primary/20"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))}
          {isStreaming && !pendingAssistantMessage && (
            <div className="px-3 sm:px-4 py-3 sm:py-6">
              <div className="mx-auto flex max-w-3xl items-start gap-2.5 sm:gap-4">
                <div className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-4 sm:size-5" />
                </div>
                <div className="flex-1 flex items-center gap-3 text-muted-foreground">
                  <div className="chat-loader text-primary" />
                </div>
              </div>
            </div>
          )}
          {pendingAssistantMessage && (
            <div className="px-3 sm:px-4 py-3 sm:py-6">
              <div className="mx-auto flex max-w-3xl items-start gap-2.5 sm:gap-4">
                <div className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-4 sm:size-5" />
                </div>
                <div className="flex-1 text-sm sm:text-base leading-relaxed text-foreground min-w-0">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {pendingAssistantMessage}
                    </ReactMarkdown>
                  </div>
                  <span className="inline-block ml-1 animate-pulse">▋</span>
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
      <div className="flex h-screen items-center justify-center bg-background text-foreground px-4">
        <div className="flex items-center gap-3 text-muted-foreground text-sm sm:text-base">
          <Loader2 className="size-4 sm:size-5 animate-spin shrink-0" />
          <span>Loading chat experience...</span>
        </div>
      </div>
    );
  }

  if (!API_BASE_URL) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground px-4 text-center">
        <p className="text-base sm:text-lg font-semibold">
          NEXT_PUBLIC_API_URL is not configured.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground">
          Please update your environment variables and reload the page.
        </p>
      </div>
    );
  }

  if (status !== "authenticated" || !accessToken) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 sm:gap-6 bg-background text-foreground px-4 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">
          You need to sign in first
        </h1>
        <a
          href="/auth/login"
          className="rounded-full border border-border px-5 sm:px-6 py-2 text-sm sm:text-base text-foreground hover:bg-accent/10 active:scale-[0.98] transition"
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
            className="flex-1 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-[280px] max-w-[85vw] animate-in slide-in-from-right duration-200">
            {renderSidebar()}
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 sm:gap-3 border-b border-border px-3 sm:px-4 py-2.5 sm:py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "inline-flex text-muted-foreground shrink-0",
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
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {selectedConversationId
                ? conversations.find((c) => c.id === selectedConversationId)
                    ?.title ?? "Conversation"
                : "New conversation"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden text-muted-foreground shrink-0"
            onClick={() => handleNewConversation()}
            disabled={isCreatingConversation}
          >
            <Plus className="size-5" />
          </Button>
        </header>

        <section className="flex flex-1 flex-col overflow-hidden">
          {renderMessages()}
        </section>

        <footer className="border-t border-border px-3 sm:px-4 py-3 sm:py-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto flex max-w-3xl flex-col gap-2 sm:gap-3"
          >
            <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card px-3 sm:px-4">
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
                className="w-full resize-none bg-transparent py-3 sm:py-4 text-sm sm:text-base outline-none placeholder:text-muted-foreground"
                rows={1}
              />
              <div className="flex items-center justify-end gap-2 pb-3 sm:pb-4">
                {isStreaming ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-amber-200 hover:text-amber-100"
                    onClick={handleStopStreaming}
                  >
                    <Loader2 className="size-4 animate-spin" />
                    <span className="hidden sm:inline">Stop generating</span>
                    <span className="sm:hidden">Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!messageInput.trim()}
                    className="size-8 sm:size-9"
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="hidden sm:block text-center text-xs text-muted-foreground">
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
