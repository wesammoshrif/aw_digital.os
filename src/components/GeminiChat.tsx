"use client";

import { useState } from "react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Sparkles, Send, Bot, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";


export function GeminiChat() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hey Wesam! Ich bin dein Claude Strategie-Bot. Wie kann ich dir heute helfen, deine Agentur zu skalieren?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      // Hier würde der API-Call zu Gemini passieren
      // Simulation für die Demo:
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: "ai", 
          text: "Das ist eine hervorragende Idee. Basierend auf deinen aktuellen Projekten würde ich empfehlen, den Fokus auf die Automatisierung des Onboardings zu legen. Das spart dir pro Projekt ca. 4 Stunden Zeit." 
        }]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[450px] p-0 overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-bold text-[15px]">Claude 3.5 Assistant</span>
        </div>
        <Badge className="bg-white/20 text-white border-none">Online</Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex items-start gap-2 max-w-[85%]",
            msg.role === "user" ? "ml-auto flex-row-reverse" : ""
          )}>
            <div className={cn(
              "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-[12px] animate-pulse">
            <Zap className="h-3 w-3" />
            Claude denkt nach...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Frag Claude nach einer Strategie..."
            className="w-full pl-4 pr-12 py-2.5 bg-slate-100 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <button 
            onClick={sendMessage}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
