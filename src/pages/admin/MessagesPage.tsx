/**
 * Admin Messages Page — WhatsApp-style interface
 * Left: list of all users who messaged. Right: full chat.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getAllConversations, getMessages, sendMessage, markConversationRead,
  deleteMessage,
  type Message, type ConversationSummary
} from '@/services/messages';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFull(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let lastDate = '';
  messages.forEach(msg => {
    const label = formatFull(msg.created_at);
    if (label !== lastDate) { groups.push({ date: label, messages: [] }); lastDate = label; }
    groups[groups.length - 1].messages.push(msg);
  });
  return groups;
}

export function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUser, setSelectedUser]   = useState<ConversationSummary | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [search, setSearch]               = useState('');
  const [loadError, setLoadError]         = useState('');
  const bottomRef                         = useRef<HTMLDivElement>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);

  const selectedUserRef = useRef<ConversationSummary | null>(null);
  selectedUserRef.current = selectedUser;

  const loadConversations = useCallback(async () => {
    const { conversations: c, error } = await getAllConversations();
    setLoadError(error?.message || '');
    setConversations(prev => {
      void prev; // suppress unused warning
      return c.map(conv => {
        if (selectedUserRef.current?.user_id === conv.user_id) {
          return { ...conv, unread: false };
        }
        return conv;
      });
    });
    setLoadingConvs(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  useRealtimeSync(['messages', 'profiles'], loadConversations, { fallbackMs: 15_000, admin: true });

  useEffect(() => {
    if (!selectedUser) return;
    // Mark as read in the database so the state survives refreshes.
    markConversationRead(selectedUser.user_id);
    setConversations(prev =>
      prev.map(c => c.user_id === selectedUser.user_id ? { ...c, unread: false } : c)
    );
    setLoadingMsgs(true);
    getMessages(selectedUser.user_id, true).then(({ messages: m, error }) => {
      setMessages(m);
      if (error) setLoadError(error.message);
      setLoadingMsgs(false);
    });

  }, [selectedUser]);
  useRealtimeSync(['messages'], async () => {
    const current = selectedUserRef.current;
    if (!current) return;
    const { messages: m, error } = await getMessages(current.user_id, true);
    setMessages(m);
    if (error) setLoadError(error.message);
    setConversations(prev => prev.map(c => c.user_id === current.user_id ? { ...c, unread: false } : c));
  }, { fallbackMs: 15_000, admin: true });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUser) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedUser]);

  const handleSend = async () => {
    if (!input.trim() || !selectedUser || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const optimistic: Message = {
      id: 'temp-' + Date.now(),
      user_id: selectedUser.user_id,
      content: text,
      sender: 'admin',
      deleted_by_user: false,
      deleted_by_admin: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { message, error } = await sendMessage(selectedUser.user_id, text, 'admin');
    if (!error && message) {
      setLoadError('');
      setMessages(prev => prev.map(m => m.id === optimistic.id ? message : m));
    } else {
      setLoadError(error?.message || 'Unable to send the message.');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
    setSending(false);
    // After replying, mark this conversation as read
    setConversations(prev =>
      prev.map(c => c.user_id === selectedUser.user_id ? { ...c, unread: false } : c)
    );
    loadConversations();
  };

  const handleDeleteMsg = async (msg: Message) => {
    await deleteMessage(msg.id, true);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
  };

  const filteredConvs = conversations.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.filter(c => c.unread).length;
  const groups = groupByDate(messages);

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">

      {/* ── Left: conversations list ──────────────────────────── */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-white/80 bg-white/85 shadow-[8px_0_28px_rgba(86,55,100,0.06)] backdrop-blur-xl">
        {/* Header */}
        <div className="px-4 pt-6 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">Messages</h2>
            {totalUnread > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {loadError && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {loadError}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            filteredConvs.map((conv, index) => (
              <button
                key={conv.user_id}
                onClick={() => {
                  setSelectedUser(conv);
                  setConversations(prev =>
                    prev.map(c => c.user_id === conv.user_id ? { ...c, unread: false } : c)
                  );
                }}
                style={{ animationDelay: `${index * 45}ms` }}
                className={`message-bubble-enter w-full border-b border-slate-50 px-4 py-3 text-left transition-all duration-200 hover:bg-primary-50/60 ${
                  selectedUser?.user_id === conv.user_id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-white font-bold">{conv.display_name.charAt(0).toUpperCase()}</span>
                  </div>
                  {conv.unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full" />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold truncate ${conv.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {conv.display_name}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-1">
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unread ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {conv.last_message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: chat area ──────────────────────────────────── */}
      {selectedUser ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-white/80 bg-white/85 px-6 py-4 shadow-sm backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 shadow-md">
              <span className="text-white font-bold">{selectedUser.display_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{selectedUser.display_name}</p>
              <p className="text-xs text-slate-400">All messages are saved permanently</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-1 overflow-y-auto bg-neutral-50 px-6 py-4">
            {loadingMsgs ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <p className="text-sm">No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  {group.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`message-bubble-enter mb-3 flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* User avatar for user messages */}
                      {msg.sender === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                          <span className="text-white text-xs font-bold">{selectedUser.display_name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="group relative max-w-[60%]">
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          msg.sender === 'admin'
                            ? 'bg-primary-500 text-white rounded-br-sm shadow-md shadow-primary-500/15'
                            : 'bg-white/90 text-slate-800 border border-white rounded-bl-sm shadow-[0_6px_18px_rgba(86,55,100,0.08)]'
                        }`}>
                          {msg.sender === 'user' && (
                            <p className="text-xs text-slate-400 mb-1 font-medium">{selectedUser.display_name}</p>
                          )}
                          {msg.content}
                          <p className={`text-xs mt-1.5 ${msg.sender === 'admin' ? 'text-white/60' : 'text-slate-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                        {/* Delete — admin can delete their own messages */}
                        {msg.sender === 'admin' && !msg.id.startsWith('temp') && (
                          <button
                            onClick={() => handleDeleteMsg(msg)}
                            className="absolute -top-1 -right-6 hidden group-hover:flex w-5 h-5 bg-red-100 hover:bg-red-200 rounded-full items-center justify-center"
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
          <div className="message-composer border-t border-white px-6 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-primary-300">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={`Reply to ${selectedUser.display_name}...`}
                className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
                maxLength={2000}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="button-polish flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 disabled:opacity-40"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <p className="text-sm font-medium">Select a conversation</p>
          <p className="text-xs">to view messages</p>
        </div>
      )}
    </div>
  );
}
