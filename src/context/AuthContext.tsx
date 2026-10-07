import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { employeeService } from '../services/employeeService';
import { describeError } from '../services/helpers';
import type { Employee, UserRole } from '../types/models';

interface AuthState {
  role: UserRole;
  name: string;
  employeeId: string;
  email: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  auth: AuthState | null;
  employee: Employee | null;
  /** True until the stored session has been restored — routes wait on this. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: { name?: string; phone?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshEmployee: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toEmployee = (row: Awaited<ReturnType<typeof employeeService.getByAuthUser>>): Employee | null =>
  row && {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone ?? '',
    status: row.status,
    joined: row.joined ?? '',
    lastLogin: row.last_login ?? '',
    avatarUrl: row.avatar_url,
    authUserId: row.auth_user_id,
  };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadEmployee = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setEmployee(null);
      return;
    }
    const row = await employeeService.getByAuthUser(session.user.id);
    if (!row) {
      // Signed in to Supabase but no matching staff record — treat as unauthorised.
      await supabase.auth.signOut();
      setEmployee(null);
      throw new Error('No employee record is linked to this login. Ask an administrator to set up your account.');
    }
    if (row.status !== 'active') {
      await supabase.auth.signOut();
      setEmployee(null);
      throw new Error('This account has been deactivated. Contact your administrator.');
    }
    setEmployee(toEmployee(row));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => loadEmployee(data.session).catch(() => undefined))
      .finally(() => {
        if (active) setInitializing(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setEmployee(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadEmployee(session).catch(() => undefined);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadEmployee]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add the credentials to .env.local and restart the dev server.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        throw new Error(
          /invalid login credentials/i.test(error.message) ? 'Invalid email or password.' : describeError(error)
        );
      }
      await loadEmployee(data.session);

      const row = await employeeService.getByAuthUser(data.session!.user.id);
      if (row) await employeeService.touchLastLogin(row.id);
    },
    [loadEmployee]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setEmployee(null);
  }, []);

  const refreshEmployee = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadEmployee(data.session).catch(() => undefined);
  }, [loadEmployee]);

  const updateProfile = useCallback(
    async (patch: { name?: string; phone?: string; avatarUrl?: string | null }) => {
      if (!employee) throw new Error('You are not signed in.');
      const updated = await employeeService.update(employee.id, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
      });
      setEmployee(toEmployee(updated));
    },
    [employee]
  );

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(describeError(error));
  }, []);

  const auth = useMemo<AuthState | null>(
    () =>
      employee && {
        role: employee.role,
        name: employee.name,
        employeeId: employee.id,
        email: employee.email,
        avatarUrl: employee.avatarUrl,
      },
    [employee]
  );

  const value = useMemo<AuthContextType>(
    () => ({ auth, employee, initializing, signIn, logout, updateProfile, changePassword, refreshEmployee }),
    [auth, employee, initializing, signIn, logout, updateProfile, changePassword, refreshEmployee]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
