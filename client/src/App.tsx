import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";

import Login from "@/pages/login";
import POSPage from "@/pages/pos";
import TablesPage from "@/pages/tables";
import KitchenPage from "@/pages/kitchen";
import OrdersPage from "@/pages/orders";
import DashboardPage from "@/pages/dashboard";
import AdminProductsPage from "@/pages/admin/products";
import AdminCategoriesPage from "@/pages/admin/categories";
import AdminTablesPage from "@/pages/admin/tables";
import AdminUsersPage from "@/pages/admin/users";
import AdminSettingsPage from "@/pages/admin/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Redirect to="/pos" />;
  }

  return <>{children}</>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0 gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isKitchen } = useAuth();
  const [location] = useLocation();

  // Redirect authenticated users away from login
  if (isAuthenticated && location === "/") {
    if (isKitchen) {
      return <Redirect to="/kitchen" />;
    }
    return <Redirect to="/pos" />;
  }

  return (
    <Switch>
      {/* Public Route */}
      <Route path="/" component={Login} />

      {/* POS Operations Routes */}
      <Route path="/pos">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <POSPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/tables">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TablesPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/kitchen">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <KitchenPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <OrdersPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/dashboard">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <DashboardPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/products">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminProductsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/categories">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminCategoriesPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/tables">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminTablesPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminUsersPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/settings">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminSettingsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
