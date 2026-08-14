'use client';

import { useState, useEffect, useRef } from 'react';

interface Conversation {
  id: string;
  other_name: string;
  subject: string;
  last_message_at: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender?: { full_name: string | null };
}

export default function InboxClient({ conversations, currentUserId }: { conversations: Conversation[]; currentUserId: string }) {
  const [selected, setSelected] = useState<string | null>(conversations[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/conversations/${selected}/messages`)
      .then((r) => r.json())
      .then((data) => { setMessages(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => {
      fetch(`/api/conversations/${selected}/messages`)
        .then((r) => r.json())
        .then(setMessages)
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [selected]);

  async function send() {
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${selected}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newMsg }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 border-r border-gray-200 flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-bold text-gray-900">Messages</h1>
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">Aucune conversation.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition ${selected === c.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.other_name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.subject}</p>
                </div>
                {c.unread > 0 && (
                  <span className="bg-[#3d9e3d] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {c.unread}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-300 mt-1">
                {new Date(c.last_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Messages panel */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Sélectionnez une conversation
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <p className="text-sm text-gray-400 text-center">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">Aucun message. Commencez la conversation !</p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === currentUserId;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {!isMine && m.sender?.full_name && (
                          <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.sender.full_name}</p>
                        )}
                        <p className="text-sm">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Écrivez un message..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3d9e3d]"
              />
              <button
                onClick={send}
                disabled={sending || !newMsg.trim()}
                className="bg-[#1a3a6b] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#15305a] transition disabled:opacity-50 text-sm"
              >
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
