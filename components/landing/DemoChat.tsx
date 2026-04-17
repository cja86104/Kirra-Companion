'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import s from './DemoChat.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompanionOption {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

// ============================================================================
// COMPANION OPTIONS — match personas in /api/demo/chat/route.ts
// ============================================================================

const COMPANION_OPTIONS: CompanionOption[] = [
  { id: 'friend', emoji: '🤝', label: 'Best Friend', desc: 'Warm, real, a little sarcastic' },
  { id: 'mentor', emoji: '🎓', label: 'Mentor',      desc: 'Thoughtful, direct, been there'  },
  { id: 'custom', emoji: '✦',  label: 'Custom',      desc: 'Curious, sees things differently' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function DemoChat() {
  const [phase, setPhase] = useState<'select' | 'connecting' | 'chatting'>('select');

  const [activeCompanion, setActiveCompanion] = useState<CompanionOption | null>(null);
  const [companionName,   setCompanionName]   = useState('');

  // What's shown in the UI
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);

  // Full accurate history sent to the API.
  // Ref (not state) so it's always current inside async callbacks — no stale closures.
  const apiHistoryRef = useRef<ApiMessage[]>([]);

  const [input,        setInput]        = useState('');
  const [isTyping,     setIsTyping]     = useState(false);
  const [isSending,    setIsSending]    = useState(false);
  const [remaining,    setRemaining]    = useState<number>(10);
  const [limitReached, setLimitReached] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ── Check remaining on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/demo/chat')
      .then(r => r.json())
      .then(data => {
        setRemaining(data.remaining ?? 10);
        if (data.limitReached) setLimitReached(true);
      })
      .catch(() => { /* fail open */ });
  }, []);

  // ── Auto-scroll to bottom ───────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isTyping]);

  // ── Auto-resize textarea ────────────────────────────────────────────────
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // ── Focus input when chat phase starts ──────────────────────────────────
  useEffect(() => {
    if (phase === 'chatting') {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [phase]);

  // ── Core API call ───────────────────────────────────────────────────────
  const callApi = useCallback(async (
    companionType: string,
    messages: ApiMessage[]
  ) => {
    const res = await fetch('/api/demo/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companionType, messages }),
    });

    const data = await res.json() as {
      content?: string;
      companionName?: string;
      remaining?: number;
      limitReached?: boolean;
      message?: string;
    };

    if (res.status === 429) {
      setLimitReached(true);
      setRemaining(0);
      throw new Error('limit_reached');
    }

    if (!res.ok) throw new Error(data.message ?? 'Request failed');

    return {
      content:       data.content       ?? '',
      companionName: data.companionName ?? '',
      remaining:     data.remaining     ?? 0,
      limitReached:  data.limitReached  ?? false,
    };
  }, []);

  // ── Select companion and get opening message ─────────────────────────────
  const handleSelect = useCallback(async (option: CompanionOption) => {
    if (isSending || limitReached) return;

    setActiveCompanion(option);
    setCompanionName('');
    setDisplayMessages([]);
    setError(null);
    apiHistoryRef.current = [];
    setPhase('connecting');
    setIsTyping(true);

    // Hidden opener — not shown in UI but instructs the companion to introduce itself
    const openingHistory: ApiMessage[] = [{ role: 'user', content: 'hey' }];

    try {
      const result = await callApi(option.id, openingHistory);

      // Commit the full history (opener + intro) so future turns have proper context
      apiHistoryRef.current = [
        { role: 'user',      content: 'hey'           },
        { role: 'assistant', content: result.content   },
      ];

      setCompanionName(result.companionName);
      setRemaining(result.remaining);
      if (result.limitReached) setLimitReached(true);

      setDisplayMessages([{
        id:      `msg-${Date.now()}-intro`,
        role:    'assistant',
        content: result.content,
      }]);

      setPhase('chatting');
    } catch (err) {
      if ((err as Error).message !== 'limit_reached') {
        setError('Couldn\'t connect. Please try again.');
        setPhase('select');
      }
    } finally {
      setIsTyping(false);
    }
  }, [isSending, limitReached, callApi]);

  // ── Send a user message ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || limitReached || !activeCompanion) return;

    setInput('');
    setIsSending(true);
    setIsTyping(true);
    setError(null);

    // Optimistically show user message
    const userMsg: DisplayMessage = {
      id:      `msg-${Date.now()}-user`,
      role:    'user',
      content: text,
    };
    setDisplayMessages(prev => [...prev, userMsg]);

    // Build next history: everything so far + new user turn
    const nextHistory: ApiMessage[] = [
      ...apiHistoryRef.current,
      { role: 'user', content: text },
    ];

    try {
      const result = await callApi(activeCompanion.id, nextHistory);

      // Commit user + assistant turns to history ref
      apiHistoryRef.current = [
        ...nextHistory,
        { role: 'assistant', content: result.content },
      ];

      setRemaining(result.remaining);
      if (result.limitReached) setLimitReached(true);

      setDisplayMessages(prev => [
        ...prev,
        { id: `msg-${Date.now()}-assistant`, role: 'assistant', content: result.content },
      ]);
    } catch (err) {
      if ((err as Error).message !== 'limit_reached') {
        setError('Something went wrong. Try again.');
        // Roll back optimistic message and restore input
        setDisplayMessages(prev => prev.filter(m => m.id !== userMsg.id));
        setInput(text);
      }
    } finally {
      setIsTyping(false);
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isSending, limitReached, activeCompanion, callApi]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ── Reset to selector ────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase('select');
    setActiveCompanion(null);
    setCompanionName('');
    setDisplayMessages([]);
    setInput('');
    setError(null);
    apiHistoryRef.current = [];
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={s.root}>

      {/* ── TYPE SELECTOR ──────────────────────────────────────────────────── */}
      {(phase === 'select' || phase === 'connecting') && (
        <div className={s.selector}>
          <p className={s.selectorLabel}>
            {phase === 'connecting' ? 'Connecting…' : (
              <>
                Pick a companion and start talking
                <span className={s.selectorLabelLive}>
                  <span className={s.selectorLabelLiveDot} />
                  Live
                </span>
              </>
            )}
          </p>

          <div className={s.selectorGrid}>
            {COMPANION_OPTIONS.map(option => {
              const isConnecting = phase === 'connecting' && activeCompanion?.id === option.id;
              return (
                <button
                  key={option.id}
                  className={`${s.typeCard}${isConnecting ? ` ${s.typeCardActive}` : ''}`}
                  onClick={() => { if (phase === 'select') void handleSelect(option); }}
                  disabled={phase === 'connecting' || limitReached}
                >
                  <span className={s.typeEmoji}>{option.emoji}</span>
                  <span className={s.typeName}>{option.label}</span>
                  <span className={s.typeDesc}>{option.desc}</span>
                  {isConnecting ? (
                    <span className={s.typeConnecting}>
                      <span className={s.typingDot} />
                      <span className={s.typingDot} />
                      <span className={s.typingDot} />
                    </span>
                  ) : (
                    <span className={s.typeArrow}>Start chatting →</span>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className={s.selectorError}>{error}</p>}

          {limitReached && (
            <p className={s.limitNote}>
              You&rsquo;ve used your 10 demo messages.{' '}
              <a href="/register" className={s.limitLink}>
                Create your companion to continue →
              </a>
            </p>
          )}
        </div>
      )}

      {/* ── CHAT WINDOW ────────────────────────────────────────────────────── */}
      {phase === 'chatting' && activeCompanion && (
        <div className={s.chatWrap}>

          {/* Header */}
          <div className={s.chatHeader}>
            <div className={s.chatAvatar}>
              {companionName.charAt(0) || activeCompanion.emoji}
            </div>
            <div className={s.chatInfo}>
              <span className={s.chatName}>{companionName || '…'}</span>
              <span className={s.chatStatus}>
                <span className={s.chatOnline} />
                {activeCompanion.label} · Demo
              </span>
            </div>
            <div className={s.chatMeta}>
              <span
                className={s.chatCounter}
                data-warning={remaining <= 3 ? 'true' : 'false'}
              >
                {remaining} left
              </span>
              <button className={s.chatChange} onClick={handleReset}>
                Change
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={s.chatBody}>

            {displayMessages.map(msg => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? s.msgUser : s.msgComp}
              >
                {msg.role === 'assistant' && (
                  <p className={s.msgLabel}>{companionName}</p>
                )}
                <div className={msg.role === 'user' ? s.msgBubbleUser : s.msgBubbleComp}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className={s.msgComp}>
                {displayMessages.length === 0 && (
                  <p className={s.msgLabel}>{companionName || '…'}</p>
                )}
                <div className={s.typing}>
                  <span className={s.typingDot} />
                  <span className={s.typingDot} />
                  <span className={s.typingDot} />
                </div>
              </div>
            )}

            {/* Limit reached CTA */}
            {limitReached && !isTyping && (
              <div className={s.limitCard}>
                <p className={s.limitCardTitle}>That was just the beginning.</p>
                <p className={s.limitCardSub}>
                  Create your own companion — any name, any personality, any relationship.
                  The conversation never has to stop.
                </p>
                <a href="/register" className={s.limitCardBtn}>
                  Create your companion free →
                </a>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={s.chatInput}>
            <textarea
              ref={inputRef}
              className={s.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                limitReached
                  ? 'Create your companion to keep going'
                  : `Message ${companionName || '…'}…`
              }
              disabled={isSending || limitReached}
              rows={1}
            />
            <button
              className={s.sendBtn}
              onClick={() => void handleSend()}
              disabled={!input.trim() || isSending || limitReached}
              aria-label="Send message"
            >
              {isSending ? (
                <span className={s.sendSpinner} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
