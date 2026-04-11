// frontend/app/page.tsx
'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User { id: number; username: string; }
interface ChatContact { id: number; username: string; }
interface Message { id: number; sender_id: number; receiver_id: number; content: string; timestamp: string; is_read: boolean;}

export default function ChatPage() {
  const router = useRouter();
  
  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // 1. Initialization & Data Load on sign in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');

    api.getMe().then(me => setCurrentUser(me)).catch(() => router.push('/login'));
    api.getChats().then(myChats => {
      // Filter unique chats
      const uniqueChats = myChats.filter((v: ChatContact, i: number, a: ChatContact[]) => 
        a.findIndex(t => t.id === v.id) === i
      );
      setChats(uniqueChats);
      setIsLoading(false);
    });
  }, [router]);

  // 2. Global Search with Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Wait 500ms after last keystroke before sending request to server
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await api.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error("Search error:", e);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 3. Load history when contact is selected
  useEffect(() => {
    if (!activeChatId) return;
    
    api.getMessages(activeChatId, 0).then(data => {
      setMessages(data);
      setTimeout(scrollToBottom, 50);
    });
  }, [activeChatId]);

  // 4. POLLING: Check for new messages every 3 seconds
  useEffect(() => {
    if (!activeChatId) return;

    const interval = setInterval(async () => {
      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      try {
        const newMsgs = await api.getMessages(activeChatId, lastMsgId);
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const combined = [...prev, ...newMsgs];
            // Ensure unique messages
            return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          });
          setTimeout(scrollToBottom, 50);
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChatId, messages]);

  useEffect(() => {
  if (!activeChatId) return;
  
    // Помечаем сообщения как прочитанные при открытии чата
    api.markAsRead(activeChatId);
    
    api.getMessages(activeChatId, 0).then(data => {
      setMessages(data);
      setTimeout(scrollToBottom, 50);
    });
  }, [activeChatId]);

  // 5. Send message handler
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId || !currentUser) return;

    const content = inputText;
    setInputText(''); 

    try {
      // 1. Send message to server
      await api.sendMessage(activeChatId, content);
      
      // 2. Immediately request update to see own message
      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      const newMsgs = await api.getMessages(activeChatId, lastMsgId);
      
      if (newMsgs.length > 0) {
        setMessages(prev => {
          const combined = [...prev, ...newMsgs];
          return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        });
        setTimeout(scrollToBottom, 50);
      } else {
        // IF FIRST MESSAGE: reload history completely
        const allMsgs = await api.getMessages(activeChatId, 0);
        setMessages(allMsgs);
        setTimeout(scrollToBottom, 50);
      }

      // 3. CHECK: If user is not in the sidebar list - refresh chat list
      const isNewContact = !chats.some(c => c.id === activeChatId);
      if (isNewContact) {
        const myChats = await api.getChats();
        const uniqueChats = myChats.filter((v: ChatContact, i: number, a: ChatContact[]) => 
          a.findIndex(t => t.id === v.id) === i
        );
        setChats(uniqueChats);
      }
      
    } catch (e) {
      console.error("Send error:", e);
      setInputText(content);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Determine active contact name (search in contacts first, then search results)
  let activeContactName = "Unknown";
  if (activeChatId) {
    const inChats = chats.find(c => c.id === activeChatId);
    if (inChats) activeContactName = inChats.username;
    else {
      const inSearch = searchResults.find(u => u.id === activeChatId);
      if (inSearch) activeContactName = inSearch.username;
    }
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#050505] text-[#888888]">Loading data...</div>;

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
            <button onClick={handleLogout} className="text-xs text-[#888888] hover:text-[#e8e8e8] transition-colors">Exit</button>
          </div>
          
          {/* Search Field */}
          <div className="px-4 mt-1 relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Global search..." 
              className="w-full bg-[#1e1e1e] text-[#e8e8e8] placeholder-[#888888] text-[13px] rounded-lg py-2 px-3 outline-none focus:bg-[#252525] transition-colors border-none" 
            />
            {searchQuery && (
              <button onClick={() => {setSearchQuery(''); setSearchResults([]);}} className="absolute right-7 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#e8e8e8]">✕</button>
            )}
          </div>

          {/* Contact List / Search Results */}
          <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
            {searchQuery ? (
              // Show global search results
              searchResults.length === 0 ? (
                <div className="text-[#888888] text-[13px] text-center mt-4">User not found</div>
              ) : (
                <>
                  <div className="text-xs text-[#888888] px-2 mb-2 uppercase tracking-wider font-semibold">Search Results</div>
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setActiveChatId(user.id)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all ${
                        activeChatId === user.id ? 'bg-[#2b5278] text-white shadow-md' : 'hover:bg-[#1e1e1e] text-[#e8e8e8]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 transition-colors ${
                        activeChatId === user.id ? 'bg-[#3a6894]' : 'bg-[#1e1e1e] text-[#888888]'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left truncate text-[14px] font-medium">{user.username}</div>
                    </button>
                  ))}
                </>
              )
            ) : (
              // Show standard chat list
              chats.length === 0 ? (
                <div className="text-[#888888] text-[13px] text-center mt-4">You have no chats yet</div>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all ${
                      activeChatId === chat.id ? 'bg-[#2b5278] text-white shadow-md' : 'hover:bg-[#1e1e1e] text-[#e8e8e8]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 transition-colors ${
                      activeChatId === chat.id ? 'bg-[#3a6894]' : 'bg-[#1e1e1e] text-[#888888]'
                    }`}>
                      {chat.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left truncate text-[14px] font-medium">{chat.username}</div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-[#0f0f0f] flex flex-col relative z-0">
          
          {/* Active Chat Header */}
          <div className="px-6 py-4 bg-[#0f0f0f] flex items-center justify-between border-b border-white/5 min-h-[73px]">
            {activeChatId ? (
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#2b5278] flex items-center justify-center text-white font-medium mr-4 shadow-md">
                  {activeContactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-[15px] text-[#e8e8e8] leading-tight">{activeContactName}</h3>
                  <p className="text-[13px] text-[#888888] mt-0.5">User</p>
                </div>
              </div>
            ) : <div className="text-[#888888] text-[14px]">Select a chat to start messaging</div>}
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scroll-smooth">
            {!activeChatId ? (
              <div className="m-auto text-[13px] text-[#888888]">Select a contact or search for a new one</div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-[13px] text-[#888888]">No messages yet. Say hello!</div>
            ) : (
              messages.map(msg => {
                const isMine = msg.sender_id === currentUser?.id;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // frontend/app/page.tsx (внутри messages.map)
                return (
                  <div key={msg.id} className={`flex group ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex items-center gap-1.5 max-w-[85%] md:max-w-[75%]">
                      
                      {/* Кнопка удаления (видна при наведении слева от моего сообщения) */}
                      {isMine && (
                        <button 
                          onClick={() => {
                            if(confirm("Delete message?")) {
                              api.deleteMessage(msg.id).then(() => {
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                              });
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#888888] hover:text-red-500 transition-all shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      )}

                      {/* Пузырек сообщения в стиле Telegram */}
                      <div className={`rounded-[12px] px-3 py-1.5 relative flex items-end gap-2 ${
                        isMine ? 'bg-[#2b5278] text-white rounded-br-[4px]' : 'bg-[#1e1e1e] text-[#e8e8e8] rounded-bl-[4px]'
                      }`}>
                        
                        {/* Текст сообщения (занимает все место) */}
                        <p className="text-[14px] leading-snug break-words flex-1 min-w-0">{msg.content}</p>
                        
                        {/* Блок времени и статуса (компактный, сбоку) */}
                        <div className="flex items-center gap-1 shrink-0 ml-1 mt-auto pb-0.5">
                          <span className="text-[10px] opacity-60 select-none leading-none">{timeStr}</span>
                          
                          {isMine && (
                            <span className="flex items-center shrink-0">
                              {msg.is_read ? (
                                // Двойная синяя галочка (Прочитано)
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#339cff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l5 5L20 4M7 12l5 5L22 4"/></svg>
                              ) : (
                                // Одинарная серая галочка (Доставлено)
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="M20 6L9 17l-5-5"/></svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input Panel */}
          <div className={`p-4 bg-[#0f0f0f] transition-opacity ${activeChatId ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-[#1e1e1e] rounded-xl px-4 py-1 ring-1 ring-transparent focus-within:ring-white/5 transition-all">
              <button type="button" className="text-[#888888] hover:text-[#e8e8e8] transition-colors py-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 7.5L7.5 14A4.5 4.5 0 012 8.5L9 1.5a3 3 0 014 4.5L6 12A1.5 1.5 0 014 10L10 4"></path></svg>
              </button>
              
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 bg-transparent text-[14px] text-[#e8e8e8] placeholder-[#888888] py-2.5 outline-none border-none"
                disabled={!activeChatId}
              />
              
              <button type="submit" disabled={!inputText.trim()} className="text-[#888888] hover:text-[#2b5278] transition-colors p-2 disabled:hover:text-[#888888]">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2L15 8L1 14V9.5L10 8L1 6.5V2Z"></path></svg>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}