"use client";

import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Soul, said } from "@opensouls/soul";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const defaultWsHost =
  process.env.NEXT_PUBLIC_SOUL_ENGINE_WS_URL ||
  process.env.NEXT_PUBLIC_HOCUS_POCUS_HOST ||
  "ws://localhost:4000";

const defaultHttpHost = process.env.NEXT_PUBLIC_SOUL_ENGINE_HTTP_URL;

const resolveHttpHost = (wsHost: string, httpHost?: string) => {
  if (httpHost) {
    return trimTrailingSlash(httpHost);
  }

  const normalized = trimTrailingSlash(wsHost);
  if (normalized.startsWith("wss://")) {
    return normalized.replace("wss://", "https://");
  }
  if (normalized.startsWith("ws://")) {
    return normalized.replace("ws://", "http://");
  }

  return normalized;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type PublicChatProps = {
  organizationSlug: string;
  subroutineId: string;
  chatId?: string;
};

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export default function PublicChat({
  organizationSlug,
  subroutineId,
  chatId,
}: PublicChatProps) {
  const [storedSoulId, setStoredSoulId] = useLocalStorage(
    "soul-public-chat-id",
    ""
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const soulRef = useRef<Soul | null>(null);

  const resolvedSoulId = useMemo(() => {
    if (chatId) {
      return chatId;
    }
    if (storedSoulId) {
      return storedSoulId;
    }
    return uuidv4();
  }, [chatId, storedSoulId]);

  const wsHost = useMemo(() => trimTrailingSlash(defaultWsHost), []);
  const httpHost = useMemo(
    () => resolveHttpHost(wsHost, defaultHttpHost),
    [wsHost]
  );

  useEffect(() => {
    if (!chatId && !storedSoulId) {
      setStoredSoulId(resolvedSoulId);
    }
  }, [chatId, resolvedSoulId, setStoredSoulId, storedSoulId]);

  useEffect(() => {
    if (!organizationSlug || !subroutineId) {
      return;
    }

    let cancelled = false;

    const connect = async () => {
      setError(null);
      setConnectionState("connecting");

      const wsUrl = `${wsHost}/${organizationSlug}/experience`;
      const webSocket = new HocuspocusProviderWebsocket({
        url: wsUrl,
        connect: true,
      });

      const soul = new Soul({
        organization: organizationSlug,
        blueprint: subroutineId,
        soulId: resolvedSoulId,
        token: async () => {
          const response = await fetch(`${httpHost}/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ soulId: resolvedSoulId }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch auth token");
          }

          const data = (await response.json()) as { token?: string };
          if (!data.token) {
            throw new Error("Auth token missing from response");
          }

          return data.token;
        },
        webSocket,
      });

      soulRef.current = soul;

      soul.on("says", async ({ isStreaming, stream, content }) => {
        const messageId = uuidv4();
        setMessages((prev) => [
          ...prev,
          { id: messageId, role: "assistant", content: "", isStreaming },
        ]);

        if (isStreaming) {
          let buffer = "";
          for await (const chunk of stream()) {
            buffer += chunk;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === messageId
                  ? { ...message, content: buffer }
                  : message
              )
            );
          }
        } else {
          const text = await content();
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: text }
                : message
            )
          );
        }
      });

      soul.onError((err) => {
        if (cancelled) {
          return;
        }
        setConnectionState("error");
        setError(err.message);
      });

      try {
        await soul.connect();
        if (!cancelled) {
          setConnectionState("connected");
        }
      } catch (err) {
        if (!cancelled) {
          setConnectionState("error");
          setError(err instanceof Error ? err.message : "Connection failed");
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      const current = soulRef.current;
      soulRef.current = null;
      if (current) {
        current.disconnect().catch(() => undefined);
      }
    };
  }, [httpHost, organizationSlug, resolvedSoulId, subroutineId, wsHost]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !soulRef.current) {
      return;
    }

    const messageId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "user", content: trimmed },
    ]);
    setInput("");

    try {
      await soulRef.current.dispatch(said("User", trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_55%)]" />
        <div className="absolute -top-32 right-12 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-12 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">
              Soul Engine Live
            </span>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">
              Talk with the soul in real time.
            </h1>
            <p className="max-w-2xl text-base text-slate-300">
              A focused, user-facing chat surface backed by the Soul Engine on
              Render. Messages stream as the soul thinks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">
              Org: {organizationSlug}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
              Soul: {subroutineId}
            </span>
            <span className="rounded-full border border-slate-500/40 bg-slate-900/40 px-3 py-1">
              Session: {resolvedSoulId.slice(0, 8)}
            </span>
            <span className="ml-auto rounded-full border border-slate-600/50 bg-slate-900/60 px-3 py-1">
              Status: {connectionState}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-[0_0_60px_rgba(14,116,144,0.15)]">
          <div className="flex max-h-[55vh] min-h-[45vh] flex-col gap-4 overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-900/30 p-6 text-sm text-slate-400">
                Start the conversation. Your messages stream to the soul, and
                replies arrive as they are generated.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm md:text-base ${
                      message.role === "user"
                        ? "bg-cyan-500/20 text-cyan-50"
                        : "bg-slate-800/70 text-slate-100"
                    }`}
                  >
                    {message.content}
                    {message.isStreaming && message.content.length === 0 ? (
                      <span className="ml-2 inline-block animate-pulse text-cyan-200">
                        ...
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-3 md:flex-row md:items-center"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Say something thoughtful..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 md:text-base"
            />
            <button
              type="submit"
              className="rounded-full bg-cyan-500/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-cyan-400"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
