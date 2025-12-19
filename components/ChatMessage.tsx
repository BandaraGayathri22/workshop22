
import React from 'react';
import { Message, MessagePart } from '../types';
import { User, Bot, Copy, Check } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content: string) => {
    // Basic Markdown-like parsing for bold and code
    // In a real app, use react-markdown, but for simplicity we use basic splits
    return content.split(/(\`\`\`[\s\S]*?\`\`\`)/g).map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/\`\`\`/g, '').trim();
        return (
          <div key={i} className="my-4 relative group">
            <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm border border-slate-700 font-mono text-slate-300">
              <code>{code}</code>
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(code)}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
            >
              <Copy size={14} />
            </button>
          </div>
        );
      }
      
      return part.split(/(\`.*?\`)/g).map((subPart, j) => {
        if (subPart.startsWith('`')) {
          return <code key={`${i}-${j}`} className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-sm">{subPart.replace(/\`/g, '')}</code>;
        }
        return <span key={`${i}-${j}`} className="whitespace-pre-wrap">{subPart}</span>;
      });
    });
  };

  return (
    <div className={`flex w-full mb-6 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border ${isUser ? 'ml-3 bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/20' : 'mr-3 bg-slate-800 border-slate-700'}`}>
          {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-indigo-400" />}
        </div>
        
        <div className="flex flex-col">
          <div className={`relative px-5 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
          }`}>
            {message.parts?.some(p => p.inlineData) && (
              <div className="mb-3">
                {message.parts.filter(p => p.inlineData).map((p, idx) => (
                  <img 
                    key={idx} 
                    src={`data:${p.inlineData?.mimeType};base64,${p.inlineData?.data}`} 
                    alt="Uploaded attachment" 
                    className="max-w-full rounded-lg border border-white/10"
                  />
                ))}
              </div>
            )}
            <div className="text-[15px] leading-relaxed">
              {renderContent(message.content)}
              {message.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
            </div>

            {!isUser && !message.isStreaming && (
              <button 
                onClick={handleCopy}
                className="absolute -bottom-8 left-0 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <span className={`text-[10px] mt-1 text-slate-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
