import { Package, Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { Product, Category, Settings } from "@shared/schema";

interface ProductGridProps {
  products: Product[];
  categories?: Category[];
  onAddToCart: (product: Product, variant?: string) => void;
  settings: Settings | null;
  isLoading?: boolean;
}

const categoryColors: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: "bg-orange-100 dark:bg-orange-950", border: "border-orange-300 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300" },
  1: { bg: "bg-blue-100 dark:bg-blue-950", border: "border-blue-300 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
  2: { bg: "bg-green-100 dark:bg-green-950", border: "border-green-300 dark:border-green-800", text: "text-green-700 dark:text-green-300" },
  3: { bg: "bg-purple-100 dark:bg-purple-950", border: "border-purple-300 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
  4: { bg: "bg-pink-100 dark:bg-pink-950", border: "border-pink-300 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300" },
  5: { bg: "bg-yellow-100 dark:bg-yellow-950", border: "border-yellow-300 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300" },
  6: { bg: "bg-teal-100 dark:bg-teal-950", border: "border-teal-300 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300" },
  7: { bg: "bg-red-100 dark:bg-red-950", border: "border-red-300 dark:border-red-800", text: "text-red-700 dark:text-red-300" },
};

export function ProductGrid({
  products,
  categories = [],
  onAddToCart,
  settings,
  isLoading = false,
}: ProductGridProps) {
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const currency = settings?.currency || "Rs.";

  const getCategoryIndex = (categoryId: string) => {
    const index = categories.findIndex((c) => c._id === categoryId);
    return index >= 0 ? index % 8 : 0;
  };

  const getCategoryColor = (categoryId: string) => {
    const index = getCategoryIndex(categoryId);
    return categoryColors[index] || categoryColors[0];
  };

  const handleProductClick = (product: Product) => {
    if (!product.isAvailable) return;
    
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setVariantDialogOpen(true);
    } else {
      onAddToCart(product);
    }
  };

  const handleVariantSelect = (variant: { name: string; price: number }) => {
    if (selectedProduct) {
      onAddToCart(
        { ...selectedProduct, price: variant.price },
        variant.name
      );
      setVariantDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card
            key={i}
            className="p-4 h-48 animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Package className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium" data-testid="text-no-products">No products found</p>
        <p className="text-sm mt-1">Try selecting a different category or search term</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {products.map((product) => {
            const colors = getCategoryColor(product.categoryId);
            return (
              <Card
                key={product._id}
                className={`relative overflow-hidden cursor-pointer transition-all hover-elevate active-elevate-2 border-2 ${colors.border} ${
                  !product.isAvailable
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={() => handleProductClick(product)}
                data-testid={`product-card-${product._id}`}
              >
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Badge variant="secondary">Unavailable</Badge>
                  </div>
                )}
                
                <div className={`h-24 flex items-center justify-center ${colors.bg}`}>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className={`w-10 h-10 ${colors.text} opacity-60`} />
                  )}
                </div>
                
                <div className="p-3 flex flex-col">
                  <h3
                    className="font-bold text-sm line-clamp-2 mb-1"
                    data-testid={`text-product-name-${product._id}`}
                  >
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto gap-2">
                    <span
                      className="font-bold text-primary text-sm"
                      data-testid={`text-product-price-${product._id}`}
                    >
                      {product.variants && product.variants.length > 0
                        ? `From ${formatPrice(Math.min(product.price, ...product.variants.map((v) => v.price)))}`
                        : formatPrice(product.price)}
                    </span>
                    <Button
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={!product.isAvailable}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      data-testid={`button-add-${product._id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Size/Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Choose a variant for: <strong>{selectedProduct?.name}</strong>
            </p>
            
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3"
              onClick={() =>
                selectedProduct &&
                handleVariantSelect({ name: "Regular", price: selectedProduct.price })
              }
              data-testid="button-variant-regular"
            >
              <span>Regular</span>
              <span className="font-bold">
                {selectedProduct && formatPrice(selectedProduct.price)}
              </span>
            </Button>
            
            {selectedProduct?.variants?.map((variant, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between h-auto py-3"
                onClick={() => handleVariantSelect(variant)}
                data-testid={`button-variant-${variant.name.toLowerCase()}`}
              >
                <span>{variant.name}</span>
                <span className="font-bold">{formatPrice(variant.price)}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
