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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <Card
            key={i}
            className="h-28 animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Package className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base font-medium" data-testid="text-no-products">No products found</p>
        <p className="text-sm mt-1">Try selecting a different category</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-2">
          {products.map((product) => {
            const categoryColor = getCategoryColor(product.categoryId);
            const rgb = hexToRgb(categoryColor);
            const lightBg = rgb
              ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
              : "rgba(99, 102, 241, 0.1)";
            return (
              <Card
                key={product._id}
                className={`relative flex flex-col cursor-pointer transition-all hover-elevate active-elevate-2 overflow-hidden ${
                  !product.isAvailable
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={() => handleProductClick(product)}
                data-testid={`product-card-${product._id}`}
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: categoryColor }}
                />
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Badge variant="secondary" className="text-xs">Out</Badge>
                  </div>
                )}
                
                <div
                  className="h-16 flex items-center justify-center"
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
                      className="w-6 h-6 opacity-60"
                      style={{ color: categoryColor }}
                    />
                  )}
                </div>
                
                <div className="p-2 flex flex-col flex-1">
                  <h3
                    className="font-medium text-xs line-clamp-2 leading-tight mb-1"
                    data-testid={`text-product-name-${product._id}`}
                  >
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto gap-1">
                    <span
                      className="font-bold text-primary text-xs"
                      data-testid={`text-product-price-${product._id}`}
                    >
                      {product.variants && product.variants.length > 0
                        ? `${currency}${Math.min(product.price, ...product.variants.map((v) => v.price))}`
                        : `${currency}${product.price}`}
                    </span>
                    <Button
                      size="icon"
                      className="h-6 w-6"
                      disabled={!product.isAvailable}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      data-testid={`button-add-${product._id}`}
                    >
                      <Plus className="h-3 w-3" />
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
