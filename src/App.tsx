import { Toaster } from "sonner";
import { ThemeProvider } from "./components/theme-provider";
import ClassroomFinderPage from "./pages/classroom-finder";
import { useTheme } from "./contexts/theme-context";

function AppContent() {
  // Nested here to correctly get the theme context when changed
  const { theme } = useTheme()
  return (
    <>
      <ClassroomFinderPage />
      <Toaster toastOptions={{ style: { fontFamily: 'Geist, sans-serif' }, duration: 2000 }} position="top-center" theme={theme} />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App;
