import { type ThemeProviderState, initialState } from "@/lib/theme";
import { createContext, useContext } from "react";

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}

