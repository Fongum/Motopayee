'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/auth/client';

interface Props {
  otherUserId: string;
  otherUserName: string;
  listingId?: string;
  hireListingId?: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function ChatWidget({ otherUserId, otherUserName, listingId, hireListingId }: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Create/get conversation when opened
  useEffect(() => {
    if (!open || !user || convId) return;
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        other_user_id: otherUserId,
        listing_id: listingId ?? null,
        hire_listing_id: hireListingId ?? null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setConvId(data.id);
          // Load messages
          fetch(`/api/conversations/${data.id}/messages`)
            .then((r) => r.json())
            .then(setMessages)
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [open, user, convId, otherUserId, listingId, hireListingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!newMsg.trim() || !convId) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${convId}/messages`, {
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

  if (!user) return null;
  if (user.id === otherUserId) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-center border border-[#1a3a6b] text-[#1a3a6b] font-semibold py-2.5 rounded-xl hover:bg-[#1a3a6b] hover:text-white transition text-sm flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Envoyer un message
      </button>

      {open && (
        <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
          <div className="bg-[#1a3a6b] text-white px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm font-semibold">{otherUserName}</p>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8">Commencez la conversation</p>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${isMine ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 p-2 flex gap-1.5">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Message..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3d9e3d]"
            />
            <button
              onClick={send}
              disabled={sending || !newMsg.trim()}
              className="bg-[#1a3a6b] text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
            >
              &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
