import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { DatabaseDashboard } from "./pages/datasheet";
import { FormulaTestPage } from "./pages/formula-test";
import { Sidebar } from "./pages/datasheet/components/Sidebar";
import { useState } from "react";
import { FormulaDetails } from "./pages/formula/details";
import { TooltipProvider } from "./components/ui/tooltip";


function App() {
  const router = createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        { path: "/", element: <DatabaseDashboard /> },
        { path: "/formula/:id/test", element: <FormulaTestPage /> },
        { path: "/formula/:id", element: <FormulaDetails /> },
        { path: "*", element: <DatabaseDashboard /> },
      ],
    },
  ]);

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

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen w-full flex-col font-sans overflow-hidden">
          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
              isOpen={isSidebarOpen}
              onToggle={handleSidebarToggle}
            />

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
