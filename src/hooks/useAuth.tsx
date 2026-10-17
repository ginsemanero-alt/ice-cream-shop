import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthCtx {
  session: Session | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(Boolean(supabase))

  const resolveRole = useCallback(async (s: Session | null) => {
    if (!supabase || !s) { setIsAdmin(false); return }
    // RLS lets a user read only their own profile row; real authorization still happens in the database.
    const { data } = await supabase.from('profiles').select('role').eq('id', s.user.id).maybeSingle()
    setIsAdmin(data?.role === 'admin')
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      await resolveRole(data.session)
      if (alive) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // defer: avoid awaiting supabase calls inside the auth callback
      setTimeout(() => void resolveRole(s), 0)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [resolveRole])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Backend not configured.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setIsAdmin(false)
  }, [])

  return <Ctx.Provider value={{ session, isAdmin, loading, signIn, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
