"use client";

import { useState, useEffect } from "react";
import { Send, FileText, Code, Maximize2, Sun, Moon, Plus, MessageSquare, ExternalLink, Lightbulb, TrendingUp, Layout } from "lucide-react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';

function TypingIndicator() {
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    const timeInterval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span>Generating response{dots} ({elapsed}s)</span>
      </div>
    </div>
  );
}

type Citation = { title: string, url: string };
type Message = { role: string, content: string, citations?: Citation[] };
type SessionMeta = { id: string, title: string, created_at: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [artifact, setArtifact] = useState<{type: string, content: string} | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<"ollama" | "anthropic" | "gemini">("ollama");
  const [isDark, setIsDark] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Theme toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load history
  const fetchSessions = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);
  
  const startNewChat = async () => {
    try {
      const res = await axios.post("http://localhost:8000/api/v1/sessions", { title: "New Chat" });
      setSessionId(res.data.id);
      setMessages([]);
      setArtifact(null);
      setIsArtifactOpen(false);
      fetchSessions();
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };
  
  const loadSession = async (id: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/sessions/${id}`);
      setSessionId(res.data.id);
      setMessages(res.data.messages);
      
      // Auto-open last artifact if exists
      const lastMsgWithArtifact = [...res.data.messages].reverse().find(m => m.artifact);
      if (lastMsgWithArtifact) {
        setArtifact(lastMsgWithArtifact.artifact);
        setIsArtifactOpen(true);
      } else {
        setArtifact(null);
        setIsArtifactOpen(false);
      }
    } catch (err) {
      console.error("Failed to load session", err);
    }
  };

  // If no session is active initially, create one
  useEffect(() => {
    if (!sessionId && sessions.length === 0) {
      startNewChat();
    }
  }, [sessionId, sessions]);

  const saveTitle = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    
    try {
      await axios.patch(`http://localhost:8000/api/v1/sessions/${id}`, { title: editTitle });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle } : s));
    } catch (err) {
      console.error("Failed to update title", err);
    } finally {
      setEditingSessionId(null);
    }
  };

  const sendMessage = async (overrideMsg?: string) => {
    const textToSend = overrideMsg || input;
    if (!textToSend.trim() || !sessionId || isGenerating) return;
    
    setMessages(prev => [...prev, {role: "user", content: textToSend}]);
    if (!overrideMsg) setInput("");
    setIsGenerating(true);
    setIsArtifactOpen(false);
    
    try {
      let skill = "qa";
      if (textToSend.toLowerCase().includes("ship 30") || textToSend.toLowerCase().includes("essay")) {
        skill = "ship30";
      } else if (textToSend.toLowerCase().includes("html") || textToSend.toLowerCase().includes("mockup") || textToSend.toLowerCase().includes("pricing")) {
        skill = "artifact";
      }

      const response = await axios.post(
        `http://localhost:8000/api/v1/sessions/${sessionId}/messages`, 
        {
          content: textToSend,
          role: "user",
          skill: skill
        },
        { headers: { "X-LLM-Provider": provider } }
      );

      setMessages(prev => [...prev, {
        role: "assistant", 
        content: response.data.message,
        citations: response.data.citations
      }]);
      
      if (response.data.artifact) {
        setArtifact(response.data.artifact);
        setIsArtifactOpen(true);
      }
      
      // Refresh sidebar to update title if backend updated it (future feature)
      fetchSessions();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {role: "assistant", content: "Sorry, I encountered an error. Is the backend running?"}]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Sidebar: History */}
      <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium">New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">History</div>
          {sessions.map(s => (
            <div 
              key={s.id}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group ${sessionId === s.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <button 
                onClick={() => loadSession(s.id)}
                className="flex items-center space-x-3 flex-1 truncate text-left"
              >
                <MessageSquare size={16} className="flex-shrink-0" />
                {editingSessionId === s.id ? (
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle(s.id)}
                    onBlur={() => saveTitle(s.id)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-b border-blue-500 outline-none w-full text-inherit"
                  />
                ) : (
                  <span className="truncate">{s.title || "New Chat"}</span>
                )}
              </button>
              
              {editingSessionId !== s.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); setEditTitle(s.title || "New Chat"); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center Pane: Chat */}
      <div className={`flex flex-col ${artifact && isArtifactOpen ? "w-1/2 border-r border-gray-200 dark:border-gray-800" : "flex-1 max-w-4xl mx-auto"} transition-all duration-300 ease-in-out relative`}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex justify-between items-center sticky top-0 z-10 transition-colors duration-300">
          <h1 className="font-semibold text-lg text-blue-900 dark:text-blue-400">Lenny Growth Assistant</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm">
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${provider === 'anthropic' ? 'bg-purple-500' : provider === 'gemini' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              </span>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value as "ollama" | "anthropic" | "gemini")}
                className="bg-transparent border border-gray-300 dark:border-gray-700 rounded p-1 outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <option value="ollama">Local (Ollama)</option>
                <option value="anthropic">Cloud (Anthropic)</option>
                <option value="gemini">Cloud (Gemini)</option>
              </select>
            </div>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">What do you want to build?</h2>
                <p className="text-gray-500 dark:text-gray-400">Ask questions, draft strategy, or generate artifacts using Lenny's insights.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button onClick={() => sendMessage("Write a Ship 30 essay on product-led growth")} className="flex flex-col items-start p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all">
                  <div className="text-gray-900 dark:text-gray-100 mb-2"><FileText size={24} /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Draft a Ship 30 Essay</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">On Product-Led Growth strategies</p>
                </button>
                <button onClick={() => sendMessage("Generate an HTML mockup for a SaaS pricing page")} className="flex flex-col items-start p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all">
                  <div className="text-gray-900 dark:text-gray-100 mb-2"><Layout size={24} /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Design a SaaS Pricing Page</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generate an HTML/CSS artifact</p>
                </button>
                <button onClick={() => sendMessage("What did Marty Cagan say about empowered teams?")} className="flex flex-col items-start p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all">
                  <div className="text-gray-900 dark:text-gray-100 mb-2"><Lightbulb size={24} /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Marty Cagan's Advice</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Query the podcast RAG knowledgebase</p>
                </button>
                <button onClick={() => sendMessage("How do I measure product-market fit?")} className="flex flex-col items-start p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all">
                  <div className="text-gray-900 dark:text-gray-100 mb-2"><TrendingUp size={24} /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Measure PMF</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Core metrics for early stage startups</p>
                </button>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="flex flex-col">
                    <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                      <ReactMarkdown>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Citations block */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Sources Used</div>
                        <div className="flex flex-wrap gap-2">
                          {m.citations.map((c, idx) => (
                            <a 
                              key={idx} 
                              href={c.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 transition-colors"
                            >
                              <ExternalLink size={10} />
                              <span className="truncate max-w-[200px]">{c.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isGenerating && <TypingIndicator />}
        </div>

        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..." 
              className="w-full p-4 pr-12 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-inner transition-colors duration-300"
            />
            <button 
              onClick={() => sendMessage()}
              className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all hover:scale-105"
            >
              <Send size={18} />
            </button>
          </div>
          {artifact && (
            <div className="mt-3 flex justify-center text-xs">
              <button 
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                onClick={() => setIsArtifactOpen(!isArtifactOpen)}
              >
                <Code size={14} />
                <span>{isArtifactOpen ? 'Close Artifact Viewer' : 'Open Artifact Viewer'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Artifact Viewer */}
      {artifact && isArtifactOpen && (
        <div className="w-1/2 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.1)]">
          <header className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
            <div className="flex items-center space-x-2">
              <Code size={16} />
              <span className="font-medium">Artifact Viewer <span className="uppercase text-xs ml-1 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">{artifact.type}</span></span>
            </div>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors" onClick={() => setIsArtifactOpen(false)}>
              <Maximize2 size={16} />
            </button>
          </header>
          <div className="flex-1 p-0 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            {artifact.type === "html" ? (
              <iframe 
                srcDoc={artifact.content} 
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts"
                title="Artifact Preview"
              />
            ) : (
              <div className="p-8 h-full bg-white dark:bg-gray-900">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                  {artifact.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
