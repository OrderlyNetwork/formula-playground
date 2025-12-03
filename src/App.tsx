import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { DatabaseDashboard } from "./pages/datasheet";
import { FormulaTestPage } from "./pages/formula-test";
import { Sidebar } from "./pages/datasheet/components/Sidebar";
import { useState } from "react";
import { FormulaDetails } from "./pages/formula/details";
import { TooltipProvider } from "./components/ui/tooltip";
import { DevPage } from "./pages/dev/devPage";
import { useAppInit } from "./hooks/useAppInit";
import { Loader2 } from "lucide-react";

function App() {
  // Create router with basename from Vite's base config
  // In production: /formula-playground, in development: empty string
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  const router = createBrowserRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: "/", element: <DatabaseDashboard /> },
          { path: "/formula/:id/test", element: <FormulaTestPage /> },
          { path: "/formula/:id", element: <FormulaDetails /> },
          { path: "/new", element: <DevPage /> },
          { path: "*", element: <DatabaseDashboard /> },
        ],
      },
    ],
    { basename } // Set basename for GitHub Pages deployment
  );

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

function RootLayout() {
  // State to control sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isReady, statusMessage } = useAppInit();

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen w-full flex-col font-sans overflow-hidden">
          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onToggle={handleSidebarToggle} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col min-w-0 ">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
