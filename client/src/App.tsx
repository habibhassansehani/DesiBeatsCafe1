import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AppNavbar } from "@/components/app-navbar";
import { CartProvider, useCart } from "@/lib/cart-context";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { PaymentModal } from "@/components/pos/payment-modal";
import { useQuery } from "@tanstack/react-query";
import type { Settings } from "@shared/schema";

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
import AdminReportsPage from "@/pages/admin/reports";
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

function GlobalCart() {
  const {
    items,
    updateQuantity,
    removeItem,
    updateNotes,
    clearCart,
    selectedTable,
    paymentModalOpen,
    setPaymentModalOpen,
    handleCheckout,
    handlePaymentConfirm,
    isSubmitting,
  } = useCart();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  return (
    <>
      <div className="w-80 shrink-0 hidden lg:block border-r border-border">
        <CartSidebar
          items={items}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onUpdateNotes={updateNotes}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          settings={settings || null}
          isSubmitting={isSubmitting}
          tableName={selectedTable?.name}
        />
      </div>

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        total={(() => {
          const taxPercentage = settings?.taxPercentage || 16;
          const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
          const taxableAmount = items
            .filter((i) => i.isTaxable)
            .reduce((s, i) => s + i.price * i.quantity, 0);
          const taxAmount = (taxableAmount * taxPercentage) / 100;
          return subtotal + taxAmount;
        })()}
        settings={settings || null}
        isProcessing={isSubmitting}
      />
    </>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full">
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        <GlobalCart />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isKitchen } = useAuth();
  const [location] = useLocation();

  if (isAuthenticated && location === "/") {
    if (isKitchen) {
      return <Redirect to="/kitchen" />;
    }
    return <Redirect to="/pos" />;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />

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

      <Route path="/admin/reports">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AuthenticatedLayout>
            <AdminReportsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
