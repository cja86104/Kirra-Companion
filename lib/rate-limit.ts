export async function checkRateLimit(
  userId: string,
  routeKey: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetsAt: string }> {
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
  const resetsAt = new Date(windowStart + windowSeconds * 1000).toISOString();

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/increment_rate_limit`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_route_key: routeKey,
          p_window_seconds: windowSeconds,
        }),
      }
    );

    if (!response.ok) {
      console.error('[rate-limit] RPC error:', response.status);
      // Fail open: don't block users if rate limiting is unavailable
      return { allowed: true, remaining: limit, resetsAt };
    }

    const count = (await response.json()) as number;
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return { allowed, remaining, resetsAt };
  } catch (error) {
    console.error('[rate-limit] Unexpected error:', error);
    return { allowed: true, remaining: limit, resetsAt };
  }
}
