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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

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

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c._id === categoryId);
    return category?.color || "#6366f1";
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
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {products.map((product) => {
            const categoryColor = getCategoryColor(product.categoryId);
            const rgb = hexToRgb(categoryColor);
            const lightBg = rgb
              ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
              : "rgba(99, 102, 241, 0.15)";
            return (
              <Card
                key={product._id}
                className={`relative overflow-hidden cursor-pointer transition-all hover-elevate active-elevate-2 border-2 ${
                  !product.isAvailable
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                style={{ borderColor: categoryColor }}
                onClick={() => handleProductClick(product)}
                data-testid={`product-card-${product._id}`}
              >
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Badge variant="secondary">Unavailable</Badge>
                  </div>
                )}
                
                <div
                  className="h-24 flex items-center justify-center"
                  style={{ backgroundColor: lightBg }}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed
                      className="w-10 h-10 opacity-70"
                      style={{ color: categoryColor }}
                    />
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
