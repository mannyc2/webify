export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  const raw = await kv.get(key);
  let record: { count: number; windowStart: number } | null = null;

  if (raw) {
    record = JSON.parse(raw);
  }

  // Start new window if none exists or window expired
  if (!record || now - record.windowStart >= windowSeconds) {
    const newRecord = { count: 1, windowStart: now };
    await kv.put(key, JSON.stringify(newRecord), {
      expirationTtl: windowSeconds,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // Within window — check if under limit
  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  await kv.put(key, JSON.stringify(record), {
    expirationTtl: windowSeconds - (now - record.windowStart),
  });

  return { allowed: true, remaining: limit - record.count };
}
