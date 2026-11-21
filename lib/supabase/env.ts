function required(name: string, value: string | undefined) {
  const normalized = value?.trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!normalized) {
    throw new Error(`Missing ${name}. Add it to frontend/.env.local`)
  }
  return normalized
}

export function getSupabaseUrl() {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/** Publishable key (new) or anon key (legacy). Never use the service role key here. */
export function getSupabaseAnonKey() {
  return required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
