// Utility: normalization + SHA-256 hashing for Meta CAPI user_data
// Deno runtime supports Web Crypto API

const enc = new TextEncoder()

async function sha256Hex(input: string): Promise<string> {
  const data = enc.encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashEmail(email?: string | null): Promise<string | undefined> {
  if (!email) return undefined
  const normalized = email.trim().toLowerCase()
  if (!normalized) return undefined
  return await sha256Hex(normalized)
}

export function toE164(phone?: string | null): string | undefined {
  if (!phone) return undefined
  // Keep digits, prefix with + if not present
  const digits = phone.replace(/[^\d+]/g, '')
  const e164 = digits.startsWith('+') ? digits : `+${digits.replace(/^\+/, '')}`
  // Very basic validation: at least 8 digits
  const justDigits = e164.replace(/\D/g, '')
  if (justDigits.length < 8) return undefined
  return e164
}

export async function hashPhone(phone?: string | null): Promise<string | undefined> {
  const e164 = toE164(phone)
  if (!e164) return undefined
  return await sha256Hex(e164)
}

export async function maybeHash(value?: string | null, alreadyHashed?: boolean): Promise<string | undefined> {
  if (!value) return undefined
  if (alreadyHashed) return value
  return await sha256Hex(value)
}
