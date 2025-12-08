import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { printReceipt } from "@/lib/print-utils";
import type { CartItem, Product, Table, Payment, Order, Settings } from "@shared/schema";

type OrderType = "takeaway" | "dine-in" | "delivery";

interface CartContextType {
  items: CartItem[];
  selectedTable: Table | null;
  orderType: OrderType;
  paymentModalOpen: boolean;
  isSubmitting: boolean;
  addToCart: (product: Product, variant?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  setSelectedTable: (table: Table | null) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentModalOpen: (open: boolean) => void;
  handleCheckout: () => void;
  handlePaymentConfirm: (payments: Payment[]) => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const prevSelectedTableRef = useRef<Table | null>(null);
  useEffect(() => {
    if (prevSelectedTableRef.current !== null && selectedTable === null && orderType === "dine-in") {
      setOrderType("takeaway");
    }
    prevSelectedTableRef.current = selectedTable;
  }, [selectedTable, orderType]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest<Order>("POST", "/api/orders", orderData);
    },
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setItems([]);
      setSelectedTable(null);
      setOrderType("takeaway");
      toast({
        title: "Order Created",
        description: "The order has been sent to the kitchen",
      });
      
      // Print 2 copies of receipt on payment confirmation
      if (order.isPaid) {
        setTimeout(() => {
          printReceipt(order, settings || null, 2);
        }, 500);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

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

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.productId === product._id && item.variant === variant && !item.notes
      );

      if (existingIndex >= 0) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [...prevItems, newItem];
    });

    toast({
      title: "Added to cart",
      description: `${product.name}${variant ? ` (${variant})` : ""}`,
    });
  }, [toast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    } else {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  }, []);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedTable(null);
    setOrderType("takeaway");
  }, []);

  const handleCheckout = useCallback(() => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to the cart before checkout",
        variant: "destructive",
      });
      return;
    }
    if (orderType === "dine-in" && !selectedTable) {
      toast({
        title: "Select a table",
        description: "Please select a table for dine-in orders",
        variant: "destructive",
      });
      return;
    }
    setPaymentModalOpen(true);
  }, [items.length, orderType, selectedTable, toast]);

  const handlePaymentConfirm = useCallback(async (payments: Payment[]) => {
    const taxPercentage = settings?.taxPercentage || 16;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxableAmount = items
      .filter((item) => item.isTaxable)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = (taxableAmount * taxPercentage) / 100;
    const total = subtotal + taxAmount;

    const orderData = {
      type: orderType === "dine-in" && selectedTable ? "dine-in" : orderType,
      tableId: orderType === "dine-in" ? selectedTable?._id : undefined,
      tableName: orderType === "dine-in" ? selectedTable?.name : undefined,
      items: items.map((item) => ({
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
  }, [items, selectedTable, orderType, settings?.taxPercentage, user, createOrderMutation]);

  return (
    <CartContext.Provider
      value={{
        items,
        selectedTable,
        orderType,
        paymentModalOpen,
        isSubmitting: createOrderMutation.isPending,
        addToCart,
        updateQuantity,
        removeItem,
        updateNotes,
        clearCart,
        setSelectedTable,
        setOrderType,
        setPaymentModalOpen,
        handleCheckout,
        handlePaymentConfirm,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
