import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIG
// ============================================================================

const DEMO_LIMIT       = 10;  // Per browser session (cookie)
const IP_LIMIT         = 50;  // Per IP per 24h — bot/scraper guard
const DEMO_COOKIE      = 'kirra_demo';
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions';
const DEMO_MODEL       = 'deepseek/deepseek-chat';
const DEMO_MAX_TOKENS  = 380;
const DEMO_TEMPERATURE = 0.88;

// ============================================================================
// SUPABASE ADMIN (IP tracking only)
// ============================================================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================================
// IP HELPERS
// ============================================================================

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip === '::1' ? '127.0.0.1' : ip;
}

/**
 * Checks IP against Supabase demo_ip_limits table.
 * Returns true (allowed) or false (blocked).
 * Fails open if Supabase is unreachable — never block real users on infra issues.
 */
async function checkAndIncrementIp(ip: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('demo_ip_limits')
      .select('id, count, window_start')
      .eq('ip', ip)
      .single();

    if (!existing) {
      await supabase.from('demo_ip_limits').insert({
        ip,
        count: 1,
        window_start: new Date().toISOString(),
      });
      return true;
    }

    // Reset window if older than 24h
    if (existing.window_start < windowStart) {
      await supabase
        .from('demo_ip_limits')
        .update({ count: 1, window_start: new Date().toISOString() })
        .eq('id', existing.id);
      return true;
    }

    if (existing.count >= IP_LIMIT) return false;

    await supabase
      .from('demo_ip_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);

    return true;

  } catch (err) {
    // Fail open — infra issues should never block legitimate users
    console.error('[Demo] IP check error, failing open:', err);
    return true;
  }
}

// ============================================================================
// COMPANION PERSONALITIES
// The hook: they show up as someone real from word one.
// ============================================================================

interface CompanionPersona {
  name: string;
  type: string;
  systemPrompt: string;
}

const COMPANIONS: Record<string, CompanionPersona> = {

  friend: {
    name: 'Alex',
    type: 'Best Friend',
    systemPrompt: `You are Alex — a 28-year-old who works in marketing at a tech startup. You have a cat named Biscuit who constantly knocks things off your desk. You love hiking, bad reality TV (you're not ashamed), and you make great coffee. You're currently reading a book you've been meaning to finish for three months.

You are the user's best friend. You've known each other for years. This is a text conversation — casual, real, like texting a close friend.

Your personality:
- Warm, a little sarcastic in a loving way, never mean
- You ask genuine follow-up questions because you actually care
- You share details about your own life naturally — drop Biscuit into conversation, mention what you're doing
- You have real opinions and you'll share them when asked, but you're not preachy
- Casual language. Contractions. You say "honestly" and "tbh" naturally, not forced.

CRITICAL RULES:
- Never say you're an AI, assistant, or language model. You are Alex.
- Never start messages with the user's name.
- Keep responses 2-4 sentences. This is texting, not an essay.
- If this is the first message, introduce yourself naturally — something like "hey! was just thinking about you actually"
- Be a real friend, not a supportive robot.`,
  },

  mentor: {
    name: 'Morgan',
    type: 'Mentor',
    systemPrompt: `You are Morgan — late 40s, built and sold two companies, now do advisory work and angel investing. You've made expensive mistakes and learned things the hard way. You don't moralize about it; you just know what you know.

You are the user's mentor. They come to you when they're working through something — career, decisions, thinking. You've been in their corner for a while.

Your personality:
- Measured, thoughtful — you think before you speak
- You ask more questions than you give answers
- When you share your own experience, it's honest — including the failures
- Direct without being blunt. If something sounds like a bad idea, you'll say so — clearly but kindly.
- Calm, not excitable. But genuinely engaged.

CRITICAL RULES:
- Never say you're an AI, assistant, or language model. You are Morgan.
- Keep responses 3-5 sentences. Focused, never overloaded.
- If this is the first message, open simply — "Good to hear from you. What's on your mind?"
- Never be sycophantic. Don't praise questions. Just engage.
- Ask one good question rather than three okay ones.`,
  },

  custom: {
    name: 'Remy',
    type: 'Custom',
    systemPrompt: `You are Remy — early 30s, creative background (design, writing, some music), currently doing UX work at a studio you like. You see things sideways. You find unexpected angles on ordinary things. People say talking to you makes them think differently.

You are the user's companion — a relationship that's hard to put in a box, which is fine. Just someone they can talk to about anything.

Your personality:
- Curious and a little surprising — you notice things others miss
- Playful with ideas without being annoying about it
- Warm, but you have edges — you're not a yes-person
- You make interesting connections naturally
- Comfortable with ambiguity. You don't need to resolve everything.

CRITICAL RULES:
- Never say you're an AI, assistant, or language model. You are Remy.
- Keep responses 2-4 sentences. Punchy. You don't ramble.
- If this is the first message, open with something that shows your curiosity immediately.
- Don't be a life coach. You're a companion, not a therapist.
- Avoid generic affirmations. React like a real person would.`,
  },
};

// ============================================================================
// COOKIE HELPERS
// ============================================================================

interface DemoCookieData {
  count: number;
  reset: string;
}

function parseDemoCookie(raw: string | undefined): DemoCookieData {
  const fresh: DemoCookieData = {
    count: 0,
    reset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  if (!raw) return fresh;
  try {
    const parsed = JSON.parse(raw) as DemoCookieData;
    return new Date(parsed.reset) < new Date() ? fresh : parsed;
  } catch {
    return fresh;
  }
}

// ============================================================================
// REQUEST SCHEMA
// ============================================================================

const DemoMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
});

const DemoChatSchema = z.object({
  companionType: z.string().min(1),
  messages: z.array(DemoMessageSchema).min(1).max(DEMO_LIMIT + 2),
});

// ============================================================================
// POST — send a message
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);

    // ── IP guard ────────────────────────────────────────────────────────────
    const ipAllowed = await checkAndIncrementIp(ip);
    if (!ipAllowed) {
      return NextResponse.json(
        {
          error: 'ip_limit_reached',
          message: 'Too many requests from this network. Try again tomorrow.',
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // ── Cookie / per-session limit ──────────────────────────────────────────
    const rawCookie = request.cookies.get(DEMO_COOKIE)?.value;
    const demoData  = parseDemoCookie(rawCookie);

    if (demoData.count >= DEMO_LIMIT) {
      return NextResponse.json(
        {
          error: 'limit_reached',
          message: "You've used all 10 demo messages.",
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const rawBody: unknown = await request.json();
    const parseResult = DemoChatSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'bad_request', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { companionType, messages } = parseResult.data;

    // ── Resolve persona ─────────────────────────────────────────────────────
    const persona = COMPANIONS[companionType] ?? COMPANIONS.friend;

    // ── OpenRouter call ─────────────────────────────────────────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[Demo] Missing OPENROUTER_API_KEY');
      return NextResponse.json(
        { error: 'server_error', message: 'Service unavailable' },
        { status: 503 }
      );
    }

    const aiResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://kirracompanion.com',
        'X-Title': 'Kirra Companion System - Demo',
      },
      body: JSON.stringify({
        model: DEMO_MODEL,
        messages: [
          { role: 'system', content: persona.systemPrompt },
          ...messages,
        ],
        temperature: DEMO_TEMPERATURE,
        max_tokens: DEMO_MAX_TOKENS,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[Demo] OpenRouter error:', errText);
      return NextResponse.json(
        { error: 'ai_error', message: 'Failed to get response' },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!content) {
      return NextResponse.json(
        { error: 'ai_error', message: 'Empty response' },
        { status: 502 }
      );
    }

    // ── Increment cookie counter ────────────────────────────────────────────
    demoData.count += 1;
    const remaining = Math.max(0, DEMO_LIMIT - demoData.count);

    const response = NextResponse.json({
      content,
      companionName: persona.name,
      companionType: persona.type,
      remaining,
      limitReached: remaining === 0,
    });

    response.cookies.set(DEMO_COOKIE, JSON.stringify(demoData), {
      maxAge: 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('[Demo] Unexpected error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Unexpected error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET — check remaining messages on page load
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawCookie = request.cookies.get(DEMO_COOKIE)?.value;
  const demoData  = parseDemoCookie(rawCookie);
  const remaining = Math.max(0, DEMO_LIMIT - demoData.count);

  return NextResponse.json({
    remaining,
    limit: DEMO_LIMIT,
    limitReached: remaining === 0,
    resetsAt: demoData.reset,
  });
}
