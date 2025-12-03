import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChefHat,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order, Settings } from "@shared/schema";

export default function KitchenPage() {
  const { toast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Queries
  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Filter for active orders (preparing and served)
  const activeOrders = orders
    .filter((order) => order.status === "preparing" || order.status === "served")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const preparingOrders = activeOrders.filter((o) => o.status === "preparing");
  const servedOrders = activeOrders.filter((o) => o.status === "served");

  // Sound notification for new orders
  useEffect(() => {
    if (soundEnabled && preparingOrders.length > lastOrderCount) {
      // Play notification sound
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
      } catch {}
    }
    setLastOrderCount(preparingOrders.length);
  }, [preparingOrders.length, lastOrderCount, soundEnabled]);

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest<Order>("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status Updated",
        description: `Order marked as ${variables.status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getElapsedTime = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  const getTimerColor = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 10) return "text-status-online";
    if (diffMins < 20) return "text-status-away";
    return "text-status-busy";
  };

  const OrderCard = ({ order, showServedButton = true }: { order: Order; showServedButton?: boolean }) => (
    <Card
      className="overflow-visible"
      data-testid={`order-card-${order._id}`}
    >
      <CardHeader className="pb-3 gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-mono" data-testid={`text-order-number-${order._id}`}>
              #{order.orderNumber}
            </CardTitle>
            <Badge
              variant={order.status === "preparing" ? "default" : "secondary"}
              className="capitalize"
              data-testid={`badge-status-${order._id}`}
            >
              {order.status}
            </Badge>
          </div>
          <div className={`flex items-center gap-1 text-sm ${getTimerColor(order.createdAt)}`}>
            <Clock className="h-4 w-4" />
            <span data-testid={`text-time-${order._id}`}>{getElapsedTime(order.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {order.tableName && (
            <Badge variant="outline" data-testid={`badge-table-${order._id}`}>
              {order.tableName}
            </Badge>
          )}
          <span>{formatTime(order.createdAt)}</span>
          <span className="capitalize">{order.type}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 bg-muted rounded-md"
              data-testid={`item-${order._id}-${index}`}
            >
              <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                {item.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{item.productName}</p>
                {item.variant && (
                  <p className="text-sm text-muted-foreground">{item.variant}</p>
                )}
                {item.notes && (
                  <p className="text-sm text-primary italic mt-1">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {order.status === "preparing" && showServedButton && (
            <Button
              className="flex-1"
              onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "served" })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-ready-${order._id}`}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark as Ready
            </Button>
          )}
          {order.status === "served" && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: "preparing" })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-back-${order._id}`}
            >
              Back to Preparing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col" data-testid="kitchen-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-page-title">Kitchen Display</h1>
            <p className="text-sm text-muted-foreground">
              {preparingOrders.length} preparing, {servedOrders.length} ready to serve
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            data-testid="button-sound"
          >
            <Bell className={`h-4 w-4 ${soundEnabled ? "" : "opacity-50"}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Preparing Orders */}
        <div className="flex-1 border-r border-border">
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-status-away animate-pulse" />
              <h2 className="font-semibold" data-testid="text-preparing-title">
                Preparing ({preparingOrders.length})
              </h2>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-4 space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ChefHat className="w-12 h-12 mb-2 opacity-30" />
                  <p data-testid="text-no-preparing">No orders preparing</p>
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Served Orders */}
        <div className="flex-1">
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-status-online" />
              <h2 className="font-semibold" data-testid="text-ready-title">
                Ready to Serve ({servedOrders.length})
              </h2>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-4 space-y-4">
              {servedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mb-2 opacity-30" />
                  <p data-testid="text-no-ready">No orders ready</p>
                </div>
              ) : (
                servedOrders.map((order) => (
                  <OrderCard key={order._id} order={order} showServedButton={false} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
