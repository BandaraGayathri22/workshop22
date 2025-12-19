
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  Menu, 
  X, 
  Sparkles,
  Command,
  Maximize2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { ChatSession, Message, Role, MessagePart } from './types';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import { sendMessageStream, generateTitle } from './services/geminiService';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const saved = localStorage.getItem('omnimind_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      })));
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('omnimind_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isGenerating]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    setIsSidebarOpen(false);
    setInput('');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          data: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isGenerating) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
      };
      setSessions([newSession]);
      setActiveSessionId(newId);
      currentSessionId = newId;
    }

    const userMessageContent = input.trim();
    const userParts: MessagePart[] = [{ text: userMessageContent }];
    if (selectedImage) {
      userParts.push({
        inlineData: {
          mimeType: selectedImage.mimeType,
          data: selectedImage.data.split(',')[1]
        }
      });
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      parts: userParts,
      timestamp: new Date(),
    };

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMessage] };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    const prevImage = selectedImage;
    setSelectedImage(null);
    setIsGenerating(true);
    setError(null);

    const assistantId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: [...s.messages, initialAssistantMessage] } 
        : s
    ));

    try {
      const history = updatedSessions.find(s => s.id === currentSessionId)?.messages || [];
      let fullContent = '';
      const stream = sendMessageStream(history, userMessageContent, prevImage || undefined);

      for await (const chunk of stream) {
        fullContent += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            const lastIdx = msgs.length - 1;
            msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent };
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }

      // Finalize message
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          msgs[lastIdx] = { ...msgs[lastIdx], isStreaming: false };
          
          // Update title if it's the first message
          let title = s.title;
          return { ...s, messages: msgs, title };
        }
        return s;
      }));

      // Background title update if needed
      if (updatedSessions.find(s => s.id === currentSessionId)?.messages.length === 1) {
        const newTitle = await generateTitle(userMessageContent);
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: newTitle } : s));
      }

    } catch (err: any) {
      console.error(err);
      setError("Failed to get response from AI. Please try again.");
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = s.messages.filter(m => m.id !== assistantId);
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={(id) => { setActiveSessionId(id); setIsSidebarOpen(false); }}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/40">
                <Command size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OmniMind AI</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-[10px] text-slate-500 font-medium">Gemini 3 Pro Online</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-indigo-400">
              <Sparkles size={14} />
              Upgrade
            </button>
            <button className="p-2 text-slate-400 hover:text-white transition-colors">
              <Maximize2 size={20} />
            </button>
          </div>
        </header>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-8">
          <div className="max-w-4xl mx-auto w-full">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div>
                  <div className="relative bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                    <Sparkles size={48} className="text-indigo-500 mx-auto" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">How can I help you today?</h2>
                  <p className="text-slate-500 max-w-md mx-auto">
                    I'm your intelligent companion, capable of complex reasoning, creative writing, image analysis, and coding tasks.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {[
                    "Explain quantum computing simply",
                    "Write a Python script for web scraping",
                    "Analyze market trends for 2024",
                    "Help me plan a 3-day trip to Tokyo"
                  ].map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                      className="text-left p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group"
                    >
                      <p className="text-sm text-slate-400 group-hover:text-indigo-400 font-medium">{suggestion}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSession.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm animate-fade-in">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Controls */}
        <div className="p-4 md:p-8 pt-0 z-20">
          <div className="max-w-4xl mx-auto w-full relative">
            
            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="absolute bottom-full mb-4 left-0 animate-fade-in group">
                <div className="relative inline-block">
                  <img 
                    src={selectedImage.data} 
                    alt="Upload preview" 
                    className="h-24 w-auto rounded-xl border-2 border-indigo-600 shadow-xl"
                  />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <form 
              onSubmit={handleSubmit}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all overflow-hidden"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message OmniMind..."
                className="w-full bg-transparent p-4 md:p-6 pb-2 outline-none text-[15px] resize-none min-h-[100px] max-h-[300px] custom-scrollbar"
                disabled={isGenerating}
              />
              
              <div className="flex items-center justify-between px-4 pb-4 md:px-6 md:pb-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800"
                    title="Upload Image"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <button 
                    type="button"
                    className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800"
                    title="Attach File"
                  >
                    <Paperclip size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <p className="hidden md:block text-[10px] text-slate-500">
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-800 bg-slate-950 font-sans">Shift + Enter</kbd> for new line
                  </p>
                  <button 
                    type="submit"
                    disabled={(!input.trim() && !selectedImage) || isGenerating}
                    className={`flex items-center justify-center p-2.5 rounded-xl transition-all ${
                      (!input.trim() && !selectedImage) || isGenerating
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 hover:scale-105 hover:bg-indigo-500 active:scale-95'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </div>
            </form>
            <p className="mt-4 text-center text-[10px] text-slate-600">
              OmniMind can make mistakes. Check important info. Gemini 3 Pro version.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
