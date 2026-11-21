'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function SupabaseProvider({
  url,
  publishableKey,
  children,
}: {
  url: string
  publishableKey: string
  children: ReactNode
}) {
  const client = useMemo(() => createBrowserClient(url, publishableKey), [url, publishableKey])
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const client = useContext(SupabaseContext)
  if (!client) throw new Error('SupabaseProvider is missing from the application layout.')
  return client
}
