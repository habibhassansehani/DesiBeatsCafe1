import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Grid3X3, Receipt } from "lucide-react";
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
  const { items, selectedTable, setSelectedTable, addToCart, handleCheckout } = useCart();

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
  };

  return (
    <div className="flex flex-col h-full" data-testid="pos-page">
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

      <CategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        isLoading={categoriesLoading}
      />

      <div className="flex-1 overflow-hidden">
        <ProductGrid
          products={filteredProducts}
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
        onClose={() => setTableDialogOpen(false)}
        onSelect={handleTableSelect}
        tables={tables}
        selectedTableId={selectedTable?._id}
      />
    </div>
  );
}
