import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Receipt,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Printer,
  MoreHorizontal,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order, Settings } from "@shared/schema";

export default function OrdersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Queries
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.currency || "Rs.";

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest<Order>("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toString().includes(query) ||
          o.tableName?.toLowerCase().includes(query) ||
          o.customerName?.toLowerCase().includes(query)
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, statusFilter, searchQuery]);

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeVariant = (status: Order["status"]) => {
    switch (status) {
      case "preparing":
        return "default";
      case "served":
        return "secondary";
      case "billed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "preparing":
        return <Clock className="h-3 w-3" />;
      case "served":
        return <CheckCircle className="h-3 w-3" />;
      case "billed":
        return <DollarSign className="h-3 w-3" />;
      case "cancelled":
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handlePrint = (order: Order) => {
    // Open print receipt in new window
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${order.orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">${settings?.cafeName || "Desi Beats Café"}</h2>
          ${settings?.cafeAddress ? `<p style="margin: 5px 0;">${settings.cafeAddress}</p>` : ""}
          ${settings?.cafePhone ? `<p style="margin: 5px 0;">Tel: ${settings.cafePhone}</p>` : ""}
        </div>
        <div class="divider"></div>
        <div class="item">
          <span>Order #:</span>
          <span>${order.orderNumber}</span>
        </div>
        <div class="item">
          <span>Date:</span>
          <span>${formatDateTime(order.createdAt)}</span>
        </div>
        ${order.tableName ? `<div class="item"><span>Table:</span><span>${order.tableName}</span></div>` : ""}
        <div class="item">
          <span>Type:</span>
          <span>${order.type}</span>
        </div>
        ${order.cashierName ? `<div class="item"><span>Cashier:</span><span>${order.cashierName}</span></div>` : ""}
        <div class="divider"></div>
        <h4 style="margin: 10px 0;">Items:</h4>
        ${order.items
          .map(
            (item) => `
          <div class="item">
            <span>${item.quantity}x ${item.productName}${item.variant ? ` (${item.variant})` : ""}</span>
            <span>${formatPrice(item.price * item.quantity)}</span>
          </div>
          ${item.notes ? `<div style="font-size: 10px; color: #666; margin-left: 20px;">Note: ${item.notes}</div>` : ""}
        `
          )
          .join("")}
        <div class="divider"></div>
        <div class="item">
          <span>Subtotal:</span>
          <span>${formatPrice(order.subtotal)}</span>
        </div>
        <div class="item">
          <span>Tax (${settings?.taxPercentage || 16}%):</span>
          <span>${formatPrice(order.taxAmount)}</span>
        </div>
        <div class="divider"></div>
        <div class="item total">
          <span>TOTAL:</span>
          <span>${formatPrice(order.total)}</span>
        </div>
        ${
          order.payments.length > 0
            ? `
          <div class="divider"></div>
          <h4 style="margin: 10px 0;">Payment:</h4>
          ${order.payments
            .map(
              (p) => `
            <div class="item">
              <span>${p.method.replace("_", " ").toUpperCase()}</span>
              <span>${formatPrice(p.amount)}${p.tip > 0 ? ` (+${formatPrice(p.tip)} tip)` : ""}</span>
            </div>
          `
            )
            .join("")}
        `
            : ""
        }
        <div class="divider"></div>
        <div class="footer">
          <p>${settings?.receiptFooter || "Thank you for visiting Desi Beats Café!"}</p>
        </div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-page-title">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-status">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="billed">Billed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium" data-testid="text-no-orders">No orders found</p>
              <p className="text-sm mt-1">
                {statusFilter !== "all" || searchQuery
                  ? "Try adjusting your filters"
                  : "Orders will appear here"}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card
                key={order._id}
                className="overflow-visible hover-elevate cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setDetailsOpen(true);
                }}
                data-testid={`order-card-${order._id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="font-mono font-bold text-sm">#{order.orderNumber}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {order.tableName && (
                            <Badge variant="outline" className="text-xs">{order.tableName}</Badge>
                          )}
                          <Badge variant="outline" className="capitalize text-xs">
                            {order.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold">{formatPrice(order.total)}</span>
                          <span className="text-xs">
                            {order.isPaid ? (
                              <span className="text-status-online">Paid</span>
                            ) : (
                              <span className="text-status-busy">Unpaid</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {order.items.length} items
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={order.status === "preparing" ? "default" : "outline"}
                        className={`text-xs h-7 px-2 ${order.status === "preparing" ? "bg-amber-500 border-amber-500 text-white" : ""}`}
                        onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "preparing" })}
                        disabled={order.status === "cancelled"}
                        data-testid={`btn-preparing-${order._id}`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Preparing
                      </Button>
                      <Button
                        size="sm"
                        variant={order.status === "served" ? "default" : "outline"}
                        className={`text-xs h-7 px-2 ${order.status === "served" ? "bg-blue-500 border-blue-500 text-white" : ""}`}
                        onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "served" })}
                        disabled={order.status === "cancelled"}
                        data-testid={`btn-served-${order._id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Served
                      </Button>
                      <Button
                        size="sm"
                        variant={order.status === "billed" ? "default" : "outline"}
                        className={`text-xs h-7 px-2 ${order.status === "billed" ? "bg-green-500 border-green-500 text-white" : ""}`}
                        onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "billed" })}
                        disabled={order.status === "cancelled"}
                        data-testid={`btn-billed-${order._id}`}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Billed
                      </Button>
                      <Button
                        size="sm"
                        variant={order.status === "cancelled" ? "destructive" : "ghost"}
                        className="text-xs h-7 px-2"
                        onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "cancelled" })}
                        data-testid={`btn-cancel-${order._id}`}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2"
                        onClick={() => handlePrint(order)}
                        data-testid={`btn-print-${order._id}`}
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order #{selectedOrder?.orderNumber}
              {selectedOrder && (
                <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="ml-2">
                  {selectedOrder.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.type}</p>
                </div>
                {selectedOrder.tableName && (
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-medium">{selectedOrder.tableName}</p>
                  </div>
                )}
                {selectedOrder.cashierName && (
                  <div>
                    <p className="text-muted-foreground">Cashier</p>
                    <p className="font-medium">{selectedOrder.cashierName}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <div className="flex-1">
                        <p>
                          {item.quantity}x {item.productName}
                          {item.variant && ` (${item.variant})`}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({settings?.taxPercentage || 16}%)
                  </span>
                  <span>{formatPrice(selectedOrder.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Payments</h4>
                    <div className="space-y-1 text-sm">
                      {selectedOrder.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">
                            {payment.method.replace("_", " ")}
                          </span>
                          <span>
                            {formatPrice(payment.amount)}
                            {payment.tip > 0 && ` (+${formatPrice(payment.tip)} tip)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePrint(selectedOrder)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
