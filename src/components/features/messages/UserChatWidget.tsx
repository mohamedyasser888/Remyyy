/**
 * User Chat Widget — floating bottom-right bubble on every page
 * Real-time via 2s polling + Supabase subscription
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getMessages, sendMessage, deleteMessage, subscribeToMessages, markUserConversationRead, type Message } from '@/services/messages';

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let lastDate = '';
  messages.forEach(msg => {
    const d = new Date(msg.created_at);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const label = d.toDateString() === today.toDateString()     ? 'Today'
                : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
                : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (label !== lastDate) { groups.push({ date: label, messages: [] }); lastDate = label; }
    groups[groups.length - 1].messages.push(msg);
  });
  return groups;
}

export function UserChatWidget() {
  const { user, profile } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const lastCountRef            = useRef(0);
  const isOpenRef               = useRef(false);

  isOpenRef.current = open;

  // ── Poll every 2s for new messages ───────────────────────────────────────
  const poll = useCallback(async () => {
    if (!user) return;
    const { messages: fresh, error: loadError } = await getMessages(user.id, false);
    setError(loadError?.message || '');
    setMessages(fresh);

    // Check for unread admin replies when chat is closed
    if (!isOpenRef.current) {
      const unreadAdminMsgs = fresh.filter(m =>
        m.sender === 'admin' &&
        (!m.user_read_at || new Date(m.created_at).getTime() > new Date(m.user_read_at).getTime())
      );
      if (unreadAdminMsgs.length > 0) {
        setHasUnread(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Initial load
    if (open) { setLoading(true); poll().then(() => setLoading(false)); }
    else { poll(); }

    const unsubscribe = subscribeToMessages(user.id, message => {
      setMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]);
      if (message.sender === 'admin' && !isOpenRef.current) setHasUnread(true);
    });
    const fallback = setInterval(poll, 15000);
    return () => {
      unsubscribe();
      clearInterval(fallback);
    };
  }, [user, open, poll]);

  // Clear unread when opening
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      if (user) void markUserConversationRead(user.id);
      const adminMsgs = messages.filter(m => m.sender === 'admin');
      lastCountRef.current = adminMsgs.length;
    }
  }, [open, user]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic
    const optimistic: Message = {
      id: 'temp-' + Date.now(),
      user_id: user.id,
      content: text,
      sender: 'user',
      deleted_by_user: false,
      deleted_by_admin: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { message, error } = await sendMessage(user.id, text, 'user');
    if (!error && message) {
      setError('');
      setMessages(prev => prev.map(m => m.id === optimistic.id ? message : m));
    } else {
      setError(error?.message || 'Unable to send your message.');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
    setSending(false);
  };

  const handleDelete = async (msg: Message) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    await deleteMessage(msg.id, false);
  };

  if (!user || !profile) return null;

  const groups = groupByDate(messages);

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────────── */}
      {open && (
        <div
          className="message-panel mobile-chat-panel mobile-floating-action animate-scale-in fixed right-4 z-50 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-white/80 sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary-500 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Admin Support</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                  <p className="text-white/70 text-xs">Live</p>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-3">
            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-3">
                <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-center font-medium text-neutral-500">No messages yet</p>
                <p className="text-xs text-center text-neutral-400">Send a message to get help from admin 👋</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-neutral-200" />
                    <span className="text-xs text-neutral-400 bg-neutral-50 px-2">{group.date}</span>
                    <div className="flex-1 h-px bg-neutral-200" />
                  </div>
                  {group.messages.map(msg => (
                    <div key={msg.id} className={`message-bubble-enter mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'admin' && (
                        <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center mr-1.5 flex-shrink-0 self-end mb-1">
                          <span className="text-white text-xs font-bold">A</span>
                        </div>
                      )}
                      <div className="group relative max-w-[78%]">
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          msg.sender === 'user'
                            ? 'bg-primary-500 text-white rounded-br-sm shadow-md shadow-primary-500/15'
                            : 'bg-white/90 text-neutral-800 border border-white rounded-bl-sm shadow-[0_6px_18px_rgba(86,55,100,0.08)]'
                        }`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-white/60 text-right' : 'text-neutral-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                        {msg.sender === 'user' && !msg.id.startsWith('temp') && (
                          <button
                            onClick={() => handleDelete(msg)}
                            className="absolute -top-1 -left-7 hidden group-hover:flex w-5 h-5 bg-red-100 hover:bg-red-200 rounded-full items-center justify-center shadow-sm"
                          >
                            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="message-composer border-t border-white px-3 py-3">
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200 transition focus-within:ring-2 focus-within:ring-primary-300">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm outline-none text-neutral-800 placeholder:text-neutral-400"
                maxLength={2000}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="button-polish flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 disabled:opacity-40"
              >
                {sending ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating bubble ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="button-polish mobile-floating-action fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-[0_12px_28px_rgba(104,13,35,0.35)] transition-transform hover:scale-110 active:scale-95"
      >
        {/* Unread dot */}
        {!open && hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce" />
        )}
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        )}
      </button>
    </>
  );
}
