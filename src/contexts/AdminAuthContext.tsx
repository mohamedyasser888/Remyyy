import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';

const ADMIN_EMAIL = 'remyadmin@remy.app';

interface AdminAuthContextValue {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAdmin(data.session?.user.email?.toLowerCase() === ADMIN_EMAIL);
    };
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user.email?.toLowerCase() === ADMIN_EMAIL);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const entered = username.trim().toLowerCase();
    const email = entered.includes('@') ? entered : `${entered}@remy.app`;
    if (email !== ADMIN_EMAIL) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const ok = !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL;
    setIsAdmin(ok);
    return ok;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
