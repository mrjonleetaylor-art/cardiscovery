import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({ isDark: true, toggle: () => {} });

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('admin_theme') !== 'light');
  const toggle = () =>
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem('admin_theme', next ? 'dark' : 'light');
      return next;
    });
  return (
    <AdminThemeContext.Provider value={{ isDark, toggle }}>
      <div className={isDark ? 'dark' : ''} style={{ colorScheme: isDark ? 'dark' : 'light' }}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export const useAdminTheme = () => useContext(AdminThemeContext);
