"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

const LOADING_MESSAGES = [
  "Estou verificando suas informações...",
  "Analisando os dados...",
  "Pensando...",
  "Consultando o sistema...",
];

const supabase = createClient();

/*
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
*/

export function AiChat() {
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [fadeMsg, setFadeMsg] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Cycle loading messages with fade
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setFadeMsg(false);
      setTimeout(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFadeMsg(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMsg },
    ]);
    setIsLoading(true);
    setLoadingMsgIndex(0);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    try {
      // URL do ngrok - pode ser configurada via variável de ambiente
      const ngrokUrl =
        process.env.NEXT_PUBLIC_AI_AGENT_URL ||
        "https://qualifier-wilder-guru.ngrok-free.dev/chat";

      const res = await fetch(ngrokUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true", // Ignora o aviso do ngrok free tier
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro na comunicação com o assistente.");
      }

      const data = await res.json();

      if (data.session_id) {
        setSessionId(data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.message || "Desculpe, não consegui entender.",
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Ops, tive um problema de conexão com o servidor. Verifique se o Ngrok está rodando e tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[450px] shadow-xs border-neutral-200/80 bg-white">
      <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900">
          <div className="size-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="size-3.5" />
          </div>
          Assistente de IA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-70">
            <Bot className="size-10 text-neutral-400" />
            <p className="text-sm text-neutral-500 max-w-[200px]">
              Olá confeiteiro! Sou seu assistente virtual. Como posso te ajudar
              com a sua loja hoje?
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white rounded-tr-sm"
                      : "bg-neutral-100 text-neutral-800 rounded-tl-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      components={{
                        strong: ({ node, ...props }) => (
                          <strong
                            className="font-semibold text-neutral-900"
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p
                            className="mb-2 last:mb-0 leading-relaxed"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc pl-4 mb-2 last:mb-0 space-y-1"
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol
                            className="list-decimal pl-4 mb-2 last:mb-0 space-y-1"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="mb-1 last:mb-0" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="size-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="size-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-neutral-100 text-neutral-600 px-3.5 py-2 text-sm flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span
                  className={`transition-opacity duration-300 ${fadeMsg ? "opacity-100" : "opacity-0"}`}
                >
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-3 border-t border-neutral-100 bg-white">
        <form onSubmit={handleSend} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo..."
            className="flex-1 bg-neutral-50 border-neutral-200 text-sm h-9"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="bg-neutral-900 hover:bg-neutral-800 text-white shrink-0 size-9"
          >
            <Send className="size-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
