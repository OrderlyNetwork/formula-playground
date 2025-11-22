import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { DatabaseDashboard } from "./pages/datasheet";
import { FormulaDetailPage } from "./pages/formula/[id]";
import { FormulaTestPage } from "./pages/formula-test";
import { Sidebar } from "./pages/datasheet/components/Sidebar";
import { useState } from "react";
import type { Table } from "./pages/datasheet/types";
import { FormulaDetails } from "./pages/formula/details";

// Mock Data - move from DatabaseDashboard to here
const tables: Table[] = [
  { name: "actor", type: "table" },
  { name: "address", type: "table" },
  { name: "category", type: "table" },
  { name: "city", type: "table" },
  { name: "country", type: "table" },
  { name: "customer", type: "table", pinned: true, active: true },
  { name: "film", type: "table" },
  { name: "film_actor", type: "table" },
  { name: "film_category", type: "table" },
  { name: "film_text", type: "table" },
  { name: "inventory", type: "table" },
  { name: "language", type: "table" },
  { name: "payment", type: "table" },
  { name: "rental", type: "table" },
  { name: "sqlite_sequence", type: "table" },
  { name: "staff", type: "table", pinned: true },
  { name: "store", type: "table" },
  { name: "customer_list", type: "view" },
  { name: "film_list", type: "view" },
  { name: "staff_list", type: "view" },
  { name: "sales_by_store", type: "view" },
];

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
    <div className="min-h-screen bg-background">
      <div className="flex h-screen w-full flex-col bg-[#1e1e1e] text-zinc-300 font-sans overflow-hidden">
        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            tables={tables}
            onToggle={handleSidebarToggle}
          />

          {/* Main Content */}
          <div className="flex flex-1 flex-col min-w-0 bg-[#1e1e1e]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
