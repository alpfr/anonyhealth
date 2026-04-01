import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { T } from "../constants/theme";

const ThemeContext = createContext(null);

/**
 * ThemeProvider — provides memoized theme tokens and toggle function.
 * Avoids re-creating the theme object on every render.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  }, []);

  const value = useMemo(() => ({
    theme,
    t: T[theme],
    isDark: theme === "dark",
    toggleTheme,
  }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
