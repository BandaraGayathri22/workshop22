
import React from 'react';
import { ChatSession } from '../types';
import { Plus, MessageSquare, Trash2, Github, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId, 
  onNewChat, 
  onSelectSession,
  onDeleteSession 
}) => {
  return (
    <div className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800 h-full p-4">
      <button 
        onClick={onNewChat}
        className="flex items-center gap-2 w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium mb-6 shadow-lg shadow-indigo-900/20 group"
      >
        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">Recent Chats</h3>
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-slate-600 text-sm">No conversations yet.</p>
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                activeSessionId === session.id 
                  ? 'bg-slate-900 border-slate-700 text-white' 
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={16} className={activeSessionId === session.id ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
              <button 
                onClick={(e) => onDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-900 space-y-1">
        <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all">
          <Settings size={16} />
          Settings
        </button>
        <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all">
          <Github size={16} />
          Source Code
        </button>
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">JD</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Guest User</p>
            <p className="text-[10px] text-slate-500 truncate">Free Tier</p>
          </div>
          <LogOut size={14} className="text-slate-600 cursor-pointer hover:text-slate-300" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
