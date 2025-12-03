import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Grid3X3,
  Users,
  Receipt,
  Clock,
  DollarSign,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Table, Order, Settings } from "@shared/schema";

export default function TablesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Queries
  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.currency || "Rs.";

  // Get active order for a table
  const getTableOrder = (tableId: string): Order | undefined => {
    return orders.find(
      (order) =>
        order.tableId === tableId &&
        (order.status === "preparing" || order.status === "served")
    );
  };

  // Update table status
  const updateTableMutation = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: string; status: string }) => {
      return apiRequest<Table>("PATCH", `/api/tables/${tableId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({
        title: "Table Updated",
        description: "Table status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update table",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "border-status-online bg-status-online/5";
      case "occupied":
        return "border-status-away bg-status-away/5";
      case "billed":
        return "border-status-busy bg-status-busy/5";
      default:
        return "border-muted-foreground bg-muted";
    }
  };

  const getStatusLabel = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "Available";
      case "occupied":
        return "Occupied";
      case "billed":
        return "Billed";
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "outline";
      case "occupied":
        return "default";
      case "billed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group tables by status
  const groupedTables = {
    occupied: tables.filter((t) => t.status === "occupied"),
    billed: tables.filter((t) => t.status === "billed"),
    available: tables.filter((t) => t.status === "available"),
  };

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="tables-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-page-title">Table Management</h1>
            <p className="text-sm text-muted-foreground">
              {groupedTables.available.length} available, {groupedTables.occupied.length} occupied
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-status-online" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-status-away" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-status-busy" />
              <span>Billed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Grid3X3 className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium" data-testid="text-no-tables">No tables configured</p>
              <p className="text-sm mt-1">Add tables in the admin panel</p>
            </div>
          ) : (
            <>
              {/* Occupied Tables */}
              {groupedTables.occupied.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    Active Tables ({groupedTables.occupied.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {groupedTables.occupied.map((table) => {
                      const order = getTableOrder(table._id);
                      return (
                        <Card
                          key={table._id}
                          className={`overflow-visible border-2 ${getStatusColor(table.status)} cursor-pointer hover-elevate active-elevate-2`}
                          onClick={() => order && setLocation(`/orders?id=${order._id}`)}
                          data-testid={`table-card-${table._id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <p className="text-2xl font-bold">T{table.number}</p>
                                <p className="text-xs text-muted-foreground">{table.name}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateTableMutation.mutate({
                                        tableId: table._id,
                                        status: "available",
                                      });
                                    }}
                                  >
                                    Mark as Available
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateTableMutation.mutate({
                                        tableId: table._id,
                                        status: "billed",
                                      });
                                    }}
                                  >
                                    Mark as Billed
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <Badge
                              variant={getStatusBadgeVariant(table.status)}
                              className="mb-3"
                            >
                              {order?.status || getStatusLabel(table.status)}
                            </Badge>

                            {order && (
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Receipt className="h-3 w-3" />
                                  <span>Order #{order.orderNumber}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTime(order.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1 font-medium">
                                  <DollarSign className="h-3 w-3" />
                                  <span>{formatPrice(order.total)}</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Capacity: {table.capacity}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Billed Tables */}
              {groupedTables.billed.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    Awaiting Payment ({groupedTables.billed.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {groupedTables.billed.map((table) => (
                      <Card
                        key={table._id}
                        className={`overflow-visible border-2 ${getStatusColor(table.status)} cursor-pointer hover-elevate`}
                        data-testid={`table-card-${table._id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-2xl font-bold">T{table.number}</p>
                              <p className="text-xs text-muted-foreground">{table.name}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateTableMutation.mutate({
                                      tableId: table._id,
                                      status: "available",
                                    })
                                  }
                                >
                                  Clear Table
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <Badge variant="secondary">{getStatusLabel(table.status)}</Badge>

                          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>Capacity: {table.capacity}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tables */}
              {groupedTables.available.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    Available ({groupedTables.available.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {groupedTables.available.map((table) => (
                      <Card
                        key={table._id}
                        className={`overflow-visible border-2 ${getStatusColor(table.status)} cursor-pointer hover-elevate`}
                        onClick={() => setLocation("/pos")}
                        data-testid={`table-card-${table._id}`}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3">
                            <p className="text-2xl font-bold">T{table.number}</p>
                            <p className="text-xs text-muted-foreground">{table.name}</p>
                          </div>

                          <Badge variant="outline" className="border-status-online text-status-online">
                            {getStatusLabel(table.status)}
                          </Badge>

                          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>Capacity: {table.capacity}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
