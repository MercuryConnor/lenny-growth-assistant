"use client";

import { useState, useEffect } from "react";
import { Send, FileText, Code, Maximize2 } from "lucide-react";
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
      <div className="max-w-[80%] p-3 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center space-x-2 text-gray-500 text-sm">
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

export default function Home() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [artifact, setArtifact] = useState<{type: string, content: string} | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<"ollama" | "anthropic" | "gemini">("ollama");

  useEffect(() => {
    // Create a new session on load
    axios.post("http://localhost:8000/api/v1/sessions", { title: "New Chat" })
      .then(res => setSessionId(res.data.id))
      .catch(err => console.error("Failed to create session", err));
  }, []);
  
  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isGenerating) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, {role: "user", content: userMessage}]);
    setInput("");
    setIsGenerating(true);
    setArtifact(null); // Clear previous artifact
    
    try {
      // Basic heuristic to trigger Ship 30 skill
      let skill = "qa";
      if (userMessage.toLowerCase().includes("ship 30") || userMessage.toLowerCase().includes("essay")) {
        skill = "ship30";
      } else if (userMessage.toLowerCase().includes("html") || userMessage.toLowerCase().includes("mockup")) {
        skill = "artifact";
      }

      const response = await axios.post(
        `http://localhost:8000/api/v1/sessions/${sessionId}/messages`, 
        {
          content: userMessage,
          role: "user",
          skill: skill
        },
        {
          headers: {
            "X-LLM-Provider": provider
          }
        }
      );

      setMessages(prev => [...prev, {role: "assistant", content: response.data.message}]);
      if (response.data.artifact) {
        setArtifact(response.data.artifact);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {role: "assistant", content: "Sorry, I encountered an error. Is the backend running?"}]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar / Left Pane: Chat */}
      <div className={`flex flex-col ${artifact ? "w-1/3 border-r border-gray-200" : "w-full max-w-3xl mx-auto"} transition-all duration-300 ease-in-out`}>
        <header className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
          <h1 className="font-semibold text-lg text-blue-900">The Lenny Growth Assistant</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${provider === 'anthropic' ? 'bg-purple-500' : provider === 'gemini' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            </span>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value as "ollama" | "anthropic" | "gemini")}
              className="bg-transparent border border-gray-300 rounded p-1 outline-none text-gray-700"
            >
              <option value="ollama">Local (Ollama)</option>
              <option value="anthropic">Cloud (Anthropic)</option>
              <option value="gemini">Cloud (Gemini)</option>
            </select>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                <FileText size={32} />
              </div>
              <p>Ask a product or growth question.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 shadow-sm'}`}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {m.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isGenerating && <TypingIndicator />}
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..." 
              className="w-full p-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 shadow-inner"
            />
            <button 
              onClick={sendMessage}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-3 flex justify-center space-x-4 text-xs text-gray-500">
            <button className="hover:text-blue-600 transition-colors" onClick={() => setArtifact(artifact ? null : "Simulated Artifact")}>Toggle Artifact Viewer</button>
          </div>
        </div>
      </div>

      {/* Right Pane: Artifact Viewer */}
      {artifact && (
        <div className="w-2/3 bg-white flex flex-col transition-all duration-300 ease-in-out shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <header className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Code size={16} />
              <span className="font-medium">Artifact Viewer ({artifact.type})</span>
            </div>
            <button className="p-1 hover:bg-gray-200 rounded" onClick={() => setArtifact(null)}>
              <Maximize2 size={16} />
            </button>
          </header>
          <div className="flex-1 p-0 overflow-y-auto bg-gray-50">
            {artifact.type === "html" ? (
              <iframe 
                srcDoc={artifact.content} 
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts"
                title="Artifact Preview"
              />
            ) : (
              <div className="p-8 h-full bg-white">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
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
