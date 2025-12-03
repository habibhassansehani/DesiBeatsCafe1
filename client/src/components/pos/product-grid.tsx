import { Package, Plus } from "lucide-react";
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
import type { Product, Settings } from "@shared/schema";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, variant?: string) => void;
  settings: Settings | null;
  isLoading?: boolean;
}

export function ProductGrid({
  products,
  onAddToCart,
  settings,
  isLoading = false,
}: ProductGridProps) {
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const currency = settings?.currency || "Rs.";

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
            className="p-4 h-32 animate-pulse bg-muted"
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
          {products.map((product) => (
            <Card
              key={product._id}
              className={`relative overflow-visible p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
                !product.isAvailable
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() => handleProductClick(product)}
              data-testid={`product-card-${product._id}`}
            >
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-background/80 rounded-md flex items-center justify-center z-10">
                  <Badge variant="secondary">Unavailable</Badge>
                </div>
              )}
              
              <div className="flex flex-col h-full min-h-[100px]">
                <div className="flex-1">
                  <h3
                    className="font-medium text-sm line-clamp-2 mb-1"
                    data-testid={`text-product-name-${product._id}`}
                  >
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-3 gap-2">
                  <span
                    className="font-bold text-primary"
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
          ))}
        </div>
      </ScrollArea>

      {/* Variant Selection Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Size/Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Choose a variant for: <strong>{selectedProduct?.name}</strong>
            </p>
            
            {/* Base option */}
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
            
            {/* Variant options */}
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
