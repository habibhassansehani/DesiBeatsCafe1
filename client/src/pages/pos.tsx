import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Grid3X3, Receipt, Truck, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { CategoryTabs } from "@/components/pos/category-tabs";
import { ProductGrid } from "@/components/pos/product-grid";
import { TableSelectDialog } from "@/components/pos/table-select-dialog";
import type {
  Product,
  Category,
  Table,
  Settings,
} from "@shared/schema";

export default function POSPage() {
  const { items, selectedTable, setSelectedTable, orderType, setOrderType, addToCart, handleCheckout } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

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

  const handleTableSelect = (table: Table | null) => {
    setSelectedTable(table);
    if (table) {
      setOrderType("dine-in");
    }
  };

  const handleTableDialogClose = () => {
    setTableDialogOpen(false);
    if (!selectedTable && orderType === "dine-in") {
      setOrderType("takeaway");
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="pos-page">
      <div className="flex items-center gap-2 p-2 border-b border-border flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={orderType === "delivery" ? "default" : "outline"}
            onClick={() => {
              setOrderType("delivery");
              setSelectedTable(null);
            }}
            className="h-8 text-xs gap-1"
            data-testid="button-filter-delivery"
          >
            <Truck className="h-3 w-3" />
            Delivery
          </Button>
          <Button
            size="sm"
            variant={orderType === "dine-in" ? "default" : "outline"}
            onClick={() => {
              setOrderType("dine-in");
              setTableDialogOpen(true);
            }}
            className="h-8 text-xs gap-1"
            data-testid="button-filter-tables"
          >
            <UtensilsCrossed className="h-3 w-3" />
            Tables
          </Button>
          <Button
            size="sm"
            variant={orderType === "takeaway" ? "default" : "outline"}
            onClick={() => {
              setOrderType("takeaway");
              setSelectedTable(null);
            }}
            className="h-8 text-xs gap-1"
            data-testid="button-filter-takeaway"
          >
            <Grid3X3 className="h-3 w-3" />
            Takeaway
          </Button>
        </div>
        
        {orderType === "dine-in" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTableDialogOpen(true)}
            className="gap-1.5"
            data-testid="button-select-table"
          >
            <Grid3X3 className="h-4 w-4" />
            {selectedTable ? (
              <span>T{selectedTable.number}</span>
            ) : (
              <span>Select Table</span>
            )}
          </Button>
        )}

        <div className="flex-1" />
        
        <Button
          size="sm"
          variant={selectedCategoryId === null ? "default" : "outline"}
          onClick={() => setSelectedCategoryId(null)}
          className="h-8 text-xs font-bold px-6 mr-1 border-2"
          data-testid="button-category-all"
        >
          Categories
        </Button>
      </div>

      <CategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        isLoading={categoriesLoading}
      />

      <div className="flex-1 overflow-hidden">
        <ProductGrid
          products={filteredProducts}
          categories={categories}
          onAddToCart={addToCart}
          settings={settings || null}
          isLoading={productsLoading}
        />
      </div>

      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        {items.length > 0 && (
          <Button
            size="lg"
            className="rounded-full h-14 w-14 relative"
            onClick={handleCheckout}
            data-testid="button-mobile-cart"
          >
            <Receipt className="h-6 w-6" />
            <Badge className="absolute -top-2 -right-2" data-testid="badge-cart-count">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          </Button>
        )}
      </div>

      <TableSelectDialog
        open={tableDialogOpen}
        onClose={handleTableDialogClose}
        onSelect={handleTableSelect}
        tables={tables}
        selectedTableId={selectedTable?._id}
      />
    </div>
  );
}
