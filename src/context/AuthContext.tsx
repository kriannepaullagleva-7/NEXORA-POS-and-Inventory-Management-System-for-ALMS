import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthState {
  role: 'admin' | 'staff';
  name: string;
}

interface AuthContextType {
  auth: AuthState | null;
  login: (role: 'admin' | 'staff', name: string) => void;
  logout: () => void;
  updateProfile: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState | null>(null);

  const login = (role: 'admin' | 'staff', name: string) => {
    setAuth({ role, name });
  };

  const updateProfile = (name: string) => {
    setAuth(prev => prev ? { ...prev, name } : null);
  };

  const logout = () => {
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
