import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  Package,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Settings } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type DateRange = "today" | "yesterday" | "weekly" | "monthly" | "custom";

interface ReportOrder {
  _id: string;
  orderNumber: number;
  type: string;
  tableName?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  isPaid: boolean;
  cashierName?: string;
  waiterName?: string;
  customerName?: string;
  itemCount: number;
  createdAt: string;
}

interface ReportData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalSubtotal: number;
    averageOrderValue: number;
    dineInCount: number;
    dineInRevenue: number;
    takeawayCount: number;
    takeawayRevenue: number;
  };
  paymentBreakdown: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  orders: ReportOrder[];
}

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    
    switch (dateRange) {
      case "today":
        return {
          startDate: format(startOfDay(now), "yyyy-MM-dd"),
          endDate: format(endOfDay(now), "yyyy-MM-dd"),
        };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return {
          startDate: format(startOfDay(yesterday), "yyyy-MM-dd"),
          endDate: format(endOfDay(yesterday), "yyyy-MM-dd"),
        };
      case "weekly":
        return {
          startDate: format(subDays(now, 7), "yyyy-MM-dd"),
          endDate: format(endOfDay(now), "yyyy-MM-dd"),
        };
      case "monthly":
        return {
          startDate: format(subDays(now, 30), "yyyy-MM-dd"),
          endDate: format(endOfDay(now), "yyyy-MM-dd"),
        };
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            startDate: format(customStartDate, "yyyy-MM-dd"),
            endDate: format(customEndDate, "yyyy-MM-dd"),
          };
        }
        return {
          startDate: format(startOfDay(now), "yyyy-MM-dd"),
          endDate: format(endOfDay(now), "yyyy-MM-dd"),
        };
      default:
        return {
          startDate: format(startOfDay(now), "yyyy-MM-dd"),
          endDate: format(endOfDay(now), "yyyy-MM-dd"),
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  const { data: reportData, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ["/api/reports", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch reports");
      }
      return response.json();
    },
    enabled: !!token,
    retry: 1,
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.currency || "Rs.";

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today":
        return format(new Date(), "MMM dd, yyyy");
      case "yesterday":
        return format(subDays(new Date(), 1), "MMM dd, yyyy");
      case "weekly":
        return `${format(subDays(new Date(), 7), "MMM dd")} - ${format(new Date(), "MMM dd, yyyy")}`;
      case "monthly":
        return `${format(subDays(new Date(), 30), "MMM dd")} - ${format(new Date(), "MMM dd, yyyy")}`;
      case "custom":
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`;
        }
        return "Select dates";
      default:
        return "";
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text("Sales Report", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Date Range: ${getDateRangeLabel()}`, pageWidth / 2, 30, { align: "center" });
    doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth / 2, 37, { align: "center" });

    doc.setFontSize(14);
    doc.text("Summary", 14, 50);
    
    doc.setFontSize(10);
    const summaryData = [
      ["Total Orders", reportData.summary.totalOrders.toString()],
      ["Total Revenue", `${currency} ${reportData.summary.totalRevenue.toFixed(2)}`],
      ["Total Tax", `${currency} ${reportData.summary.totalTax.toFixed(2)}`],
      ["Average Order Value", `${currency} ${reportData.summary.averageOrderValue.toFixed(2)}`],
      ["Dine-In Orders", `${reportData.summary.dineInCount} (${currency} ${reportData.summary.dineInRevenue.toFixed(2)})`],
      ["Takeaway Orders", `${reportData.summary.takeawayCount} (${currency} ${reportData.summary.takeawayRevenue.toFixed(2)})`],
    ];

    autoTable(doc, {
      startY: 55,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });

    if (reportData.paymentBreakdown.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 55;
      doc.setFontSize(14);
      doc.text("Payment Breakdown", 14, finalY + 15);

      const paymentData = reportData.paymentBreakdown.map(p => [
        p.method.charAt(0).toUpperCase() + p.method.slice(1),
        p.count.toString(),
        `${currency} ${p.amount.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Method", "Count", "Amount"]],
        body: paymentData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.addPage();
    doc.setFontSize(14);
    doc.text("Order Details", 14, 20);

    const orderData = reportData.orders.map(order => [
      `#${order.orderNumber}`,
      order.type === "dine-in" ? "Dine-In" : "Takeaway",
      order.tableName || "-",
      order.itemCount.toString(),
      `${currency} ${order.total.toFixed(2)}`,
      order.isPaid ? "Paid" : "Unpaid",
      format(new Date(order.createdAt), "MMM dd, HH:mm"),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Order #", "Type", "Table", "Items", "Total", "Status", "Date"]],
      body: orderData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    if (reportData.topSellingItems.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 25;
      
      if (finalY > 240) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Top Selling Items", 14, 20);
        
        const itemsData = reportData.topSellingItems.map(item => [
          item.name,
          item.quantity.toString(),
          `${currency} ${item.revenue.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: 25,
          head: [["Item", "Qty Sold", "Revenue"]],
          body: itemsData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
      } else {
        doc.setFontSize(14);
        doc.text("Top Selling Items", 14, finalY + 15);
        
        const itemsData = reportData.topSellingItems.map(item => [
          item.name,
          item.quantity.toString(),
          `${currency} ${item.revenue.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [["Item", "Qty Sold", "Revenue"]],
          body: itemsData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
    }

    doc.save(`sales-report-${startDate}-to-${endDate}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Sales Report"],
      [`Date Range: ${getDateRangeLabel()}`],
      [`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`],
      [],
      ["Summary"],
      ["Metric", "Value"],
      ["Total Orders", reportData.summary.totalOrders],
      ["Total Revenue", reportData.summary.totalRevenue],
      ["Total Tax", reportData.summary.totalTax],
      ["Total Subtotal", reportData.summary.totalSubtotal],
      ["Average Order Value", reportData.summary.averageOrderValue],
      ["Dine-In Orders", reportData.summary.dineInCount],
      ["Dine-In Revenue", reportData.summary.dineInRevenue],
      ["Takeaway Orders", reportData.summary.takeawayCount],
      ["Takeaway Revenue", reportData.summary.takeawayRevenue],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const ordersData = [
      ["Order #", "Type", "Table", "Items", "Subtotal", "Tax", "Total", "Paid", "Cashier", "Date"],
      ...reportData.orders.map(order => [
        order.orderNumber,
        order.type,
        order.tableName || "",
        order.itemCount,
        order.subtotal,
        order.taxAmount,
        order.total,
        order.isPaid ? "Yes" : "No",
        order.cashierName || "",
        format(new Date(order.createdAt), "yyyy-MM-dd HH:mm"),
      ]),
    ];
    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ordersSheet, "Orders");

    if (reportData.paymentBreakdown.length > 0) {
      const paymentData = [
        ["Payment Method", "Count", "Amount"],
        ...reportData.paymentBreakdown.map(p => [p.method, p.count, p.amount]),
      ];
      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(wb, paymentSheet, "Payments");
    }

    if (reportData.topSellingItems.length > 0) {
      const itemsData = [
        ["Item Name", "Quantity Sold", "Revenue"],
        ...reportData.topSellingItems.map(item => [item.name, item.quantity, item.revenue]),
      ];
      const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, itemsSheet, "Top Items");
    }

    XLSX.writeFile(wb, `sales-report-${startDate}-to-${endDate}.xlsx`);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Reports</h1>
              <p className="text-sm text-muted-foreground">{getDateRangeLabel()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={!reportData || isLoading}
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={!reportData || isLoading}
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="yesterday" data-testid="tab-yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">From:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load reports</h3>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message || "An error occurred while fetching report data"}
              </p>
            </div>
          </Card>
        ) : !reportData ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No data available</h3>
              <p className="text-sm text-muted-foreground">
                Please log in as admin to view reports
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    {currency} {reportData.summary.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.totalOrders} orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-average-order">
                    {currency} {reportData.summary.averageOrderValue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tax: {currency} {reportData.summary.totalTax.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dine-In</CardTitle>
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-dinein-revenue">
                    {currency} {reportData.summary.dineInRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.dineInCount} orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Takeaway</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-takeaway-revenue">
                    {currency} {reportData.summary.takeawayRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.takeawayCount} orders
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card data-testid="chart-order-type">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    Order Type Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(reportData.summary.dineInCount > 0 || reportData.summary.takeawayCount > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Dine-In", value: reportData.summary.dineInCount, revenue: reportData.summary.dineInRevenue },
                            { name: "Takeaway", value: reportData.summary.takeawayCount, revenue: reportData.summary.takeawayRevenue },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--muted-foreground))" />
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            `${value} orders (${currency} ${props.payload.revenue.toFixed(2)})`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                      No orders to display
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="chart-payment-methods">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.paymentBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={reportData.paymentBreakdown.map((p) => ({
                          name: p.method.charAt(0).toUpperCase() + p.method.slice(1),
                          amount: p.amount,
                          count: p.count,
                        }))}
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "amount" ? `${currency} ${value.toFixed(2)}` : value,
                            name === "amount" ? "Revenue" : "Count",
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="chart-top-items">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Top Selling Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.topSellingItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={reportData.topSellingItems.slice(0, 5).map((item) => ({
                          name: item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name,
                          fullName: item.name,
                          quantity: item.quantity,
                          revenue: item.revenue,
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            name === "quantity" ? `${value} sold` : `${currency} ${value.toFixed(2)}`,
                            name === "quantity" ? "Quantity" : "Revenue",
                          ]}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                      No items sold
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.paymentBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {reportData.paymentBreakdown.map((payment) => (
                        <div
                          key={payment.method}
                          className="flex items-center justify-between"
                          data-testid={`payment-method-${payment.method}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {payment.method}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {payment.count} transactions
                            </span>
                          </div>
                          <span className="font-medium">
                            {currency} {payment.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No payment data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Top Items List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.topSellingItems.length > 0 ? (
                    <div className="space-y-3">
                      {reportData.topSellingItems.slice(0, 5).map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between"
                          data-testid={`top-item-${index}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{item.quantity} sold</span>
                            <p className="text-xs text-muted-foreground">
                              {currency} {item.revenue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No items sold</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.orders.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.orders.map((order) => (
                          <TableRow key={order._id} data-testid={`order-row-${order.orderNumber}`}>
                            <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {order.type === "dine-in" ? "Dine-In" : "Takeaway"}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.tableName || "-"}</TableCell>
                            <TableCell>{order.itemCount}</TableCell>
                            <TableCell className="font-medium">
                              {currency} {order.total.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.isPaid ? "default" : "secondary"}>
                                {order.isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(order.createdAt), "MMM dd, HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No orders found for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
