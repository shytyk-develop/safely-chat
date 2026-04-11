// frontend/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  id: number;
  username: string;
}

interface ChatContact {
  id: number;
  username: string;
}

export default function ChatPage() {
  const router = useRouter();
  
  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  // Data Load on sign in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const loadInitialData = async () => {
      try {
        const [me, myChats] = await Promise.all([
          api.getMe(),
          api.getChats()
        ]);
        
        setCurrentUser(me);
        setChats(myChats);
      } catch (error) {
        console.error("Load error:", error);
        localStorage.removeItem('token'); 
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#050505] text-[#888888]">Loading data...</div>;
  }

  const activeContact = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-[#050505] items-center justify-center p-2 md:p-6">
      
      {/* Main Container */}
      <div className="flex w-full max-w-[1000px] h-[600px] bg-[#0f0f0f] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 relative z-0">
        
        {/* Sidebar */}
        <div className="w-[260px] min-w-[260px] bg-[#151515] flex flex-col relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
          
          {/* Sidebar Header */}
          <div className="px-4 py-5 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[15px] font-medium text-[#e8e8e8]">
              <div className="w-2 h-2 rounded-full bg-[#3B6D11] shadow-[0_0_8px_#3B6D11]"></div>
              {currentUser?.username} {/* Printing Our Name */}
            </div>
            <button onClick={handleLogout} className="text-xs text-[#888888] hover:text-[#e8e8e8] transition-colors">
              Exit
            </button>
          </div>
          
          {/* Search Field */}
          <div className="px-4 mt-1 relative">
            <input 
              type="text" 
              placeholder="Поиск..." 
              className="w-full bg-[#1e1e1e] text-[#e8e8e8] placeholder-[#888888] text-[13px] rounded-lg py-2 px-3 outline-none focus:bg-[#252525] transition-colors border-none"
            />
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
            {chats.length === 0 ? (
              <div className="text-[#888888] text-[13px] text-center mt-4">You have no Chats yet</div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all ${
                    activeChatId === chat.id 
                      ? 'bg-[#2b5278] text-white shadow-md' 
                      : 'hover:bg-[#1e1e1e] text-[#e8e8e8]'
                  }`}
                >
                  {/* Profile Pic (first name's letter) */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 transition-colors ${
                    activeChatId === chat.id ? 'bg-[#3a6894] text-white' : 'bg-[#1e1e1e] text-[#888888]'
                  }`}>
                    {chat.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left truncate text-[14px] font-medium">
                    {chat.username}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-[#0f0f0f] flex flex-col relative z-0">
          
          {/* Active Chat Header */}
          <div className="px-6 py-4 bg-[#0f0f0f] flex items-center justify-between border-b border-white/5 min-h-[73px]">
            {activeContact ? (
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#2b5278] flex items-center justify-center text-white font-medium mr-4 shadow-md">
                  {activeContact.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-[15px] text-[#e8e8e8] leading-tight">{activeContact.username}</h3>
                  <p className="text-[13px] text-[#888888] mt-0.5">в сети</p>
                </div>
              </div>
            ) : (
              <div className="text-[#888888] text-[14px]">Choose a Chat</div>
            )}
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            <div className="flex items-center justify-center h-full text-[13px] text-[#888888]">
              {activeChatId ? "Your chat will appear here" : "Select a contact from the left"}
            </div>
          </div>

          {/* Text Input Panel */}
          <div className={`p-4 bg-[#0f0f0f] transition-opacity ${activeChatId ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-xl px-4 py-1 ring-1 ring-transparent focus-within:ring-white/5 transition-all">
              <button className="text-[#888888] hover:text-[#e8e8e8] transition-colors py-2">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 7.5L7.5 14A4.5 4.5 0 012 8.5L9 1.5a3 3 0 014 4.5L6 12A1.5 1.5 0 014 10L10 4"></path></svg>
              </button>
              
              <input 
                type="text" 
                placeholder="Type a message..." 
                className="flex-1 bg-transparent text-[14px] text-[#e8e8e8] placeholder-[#888888] py-2.5 outline-none border-none"
                disabled={!activeChatId}
              />
              
              <button className="text-[#888888] hover:text-[#2b5278] transition-colors p-2">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2L15 8L1 14V9.5L10 8L1 6.5V2Z"></path></svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}