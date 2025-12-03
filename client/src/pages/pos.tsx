import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Grid3X3, Receipt, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { CategoryTabs } from "@/components/pos/category-tabs";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { PaymentModal } from "@/components/pos/payment-modal";
import { TableSelectDialog } from "@/components/pos/table-select-dialog";
import type {
  Product,
  Category,
  Table,
  Settings,
  CartItem,
  Payment,
  Order,
} from "@shared/schema";

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

  // Queries
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest<Order>("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setCartItems([]);
      setSelectedTable(null);
      toast({
        title: "Order Created",
        description: "The order has been sent to the kitchen",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategoryId) {
      result = result.filter((p) => p.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return result.filter((p) => p.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, selectedCategoryId, searchQuery]);

  // Cart operations
  const addToCart = useCallback((product: Product, variant?: string) => {
    const id = `${product._id}-${variant || "default"}-${Date.now()}`;
    const newItem: CartItem = {
      id,
      productId: product._id,
      productName: product.name,
      variant,
      quantity: 1,
      price: product.price,
      isTaxable: product.isTaxable,
    };

    // Check if same product+variant exists, then increase quantity
    const existingIndex = cartItems.findIndex(
      (item) => item.productId === product._id && item.variant === variant && !item.notes
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, newItem]);
    }

    toast({
      title: "Added to cart",
      description: `${product.name}${variant ? ` (${variant})` : ""}`,
    });
  }, [cartItems, toast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter((item) => item.id !== itemId));
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, [cartItems]);

  const removeItem = useCallback((itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  }, [cartItems]);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, [cartItems]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setSelectedTable(null);
  }, []);

  // Calculate totals
  const taxPercentage = settings?.taxPercentage || 16;
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxableAmount = cartItems
    .filter((item) => item.isTaxable)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = (taxableAmount * taxPercentage) / 100;
  const total = subtotal + taxAmount;

  // Handle checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to the cart before checkout",
        variant: "destructive",
      });
      return;
    }
    setPaymentModalOpen(true);
  };

  // Handle payment confirmation
  const handlePaymentConfirm = async (payments: Payment[]) => {
    const orderData = {
      type: selectedTable ? "dine-in" : "takeaway",
      tableId: selectedTable?._id,
      tableName: selectedTable?.name,
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        isTaxable: item.isTaxable,
      })),
      subtotal,
      taxAmount,
      total,
      payments,
      paidAmount: payments.reduce((sum, p) => sum + p.amount + p.tip, 0),
      remainingAmount: Math.max(0, total - payments.reduce((sum, p) => sum + p.amount, 0)),
      isPaid: payments.reduce((sum, p) => sum + p.amount, 0) >= total,
      cashierId: user?._id,
      cashierName: user?.name,
    };

    createOrderMutation.mutate(orderData);
    setPaymentModalOpen(false);
  };

  // Handle table selection
  const handleTableSelect = (table: Table | null) => {
    setSelectedTable(table);
  };

  return (
    <div className="flex h-full" data-testid="pos-page">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setTableDialogOpen(true)}
            className="gap-2"
            data-testid="button-select-table"
          >
            <Grid3X3 className="h-4 w-4" />
            {selectedTable ? (
              <span>Table {selectedTable.number}</span>
            ) : (
              <span>Takeaway</span>
            )}
          </Button>
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          isLoading={categoriesLoading}
        />

        {/* Product Grid */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
            settings={settings || null}
            isLoading={productsLoading}
          />
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-80 shrink-0 hidden lg:block">
        <CartSidebar
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onUpdateNotes={updateNotes}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          settings={settings || null}
          isSubmitting={createOrderMutation.isPending}
          tableName={selectedTable?.name}
        />
      </div>

      {/* Mobile Cart Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        {cartItems.length > 0 && (
          <Button
            size="lg"
            className="rounded-full h-14 w-14 relative"
            onClick={handleCheckout}
            data-testid="button-mobile-cart"
          >
            <Receipt className="h-6 w-6" />
            <Badge className="absolute -top-2 -right-2" data-testid="badge-cart-count">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          </Button>
        )}
      </div>

      {/* Table Selection Dialog */}
      <TableSelectDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onSelect={handleTableSelect}
        tables={tables}
        selectedTableId={selectedTable?._id}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        total={total}
        settings={settings || null}
        isProcessing={createOrderMutation.isPending}
      />
    </div>
  );
}
