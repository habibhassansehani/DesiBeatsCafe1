import { useState } from "react";
import { Minus, Plus, Trash2, MessageSquare, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { CartItem, Settings } from "@shared/schema";

interface CartSidebarProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  settings: Settings | null;
  isSubmitting?: boolean;
  tableName?: string;
}

export function CartSidebar({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onClearCart,
  onCheckout,
  settings,
  isSubmitting = false,
  tableName,
}: CartSidebarProps) {
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const currency = settings?.currency || "Rs.";
  const taxPercentage = settings?.taxPercentage || 16;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxableAmount = items
    .filter((item) => item.isTaxable)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = (taxableAmount * taxPercentage) / 100;
  const total = subtotal + taxAmount;

  const handleOpenNotes = (item: CartItem) => {
    setEditingItem(item);
    setTempNotes(item.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (editingItem) {
      onUpdateNotes(editingItem.id, tempNotes);
    }
    setNotesDialogOpen(false);
    setEditingItem(null);
  };

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-card-border">
      {/* Header */}
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-semibold" data-testid="text-cart-title">Current Order</h2>
          </div>
          {tableName && (
            <Badge variant="secondary" data-testid="badge-table-name">
              {tableName}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-cart-count">
            {items.reduce((sum, item) => sum + item.quantity, 0)} items
          </p>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm" data-testid="text-cart-empty">No items in cart</p>
            <p className="text-xs mt-1">Add products to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-background border border-border"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                      {item.productName}
                    </p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground">{item.variant}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-primary mt-1 italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <p className="font-medium text-sm whitespace-nowrap" data-testid={`text-item-total-${item.id}`}>
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 0) onUpdateQuantity(item.id, val);
                      }}
                      className="h-7 w-12 text-center text-sm"
                      min={1}
                      data-testid={`input-quantity-${item.id}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      data-testid={`button-increase-${item.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenNotes(item)}
                      data-testid={`button-notes-${item.id}`}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer with Totals */}
      {items.length > 0 && (
        <div className="p-4 border-t border-card-border space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxPercentage}%)</span>
              <span data-testid="text-tax">{formatPrice(taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span data-testid="text-total">{formatPrice(total)}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClearCart}
              disabled={isSubmitting}
              data-testid="button-clear-cart"
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              onClick={onCheckout}
              disabled={isSubmitting}
              data-testid="button-checkout"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add special instructions for: <strong>{editingItem?.productName}</strong>
            </p>
            <Textarea
              placeholder="e.g., Less spicy, No ice, Extra cheese..."
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              rows={3}
              data-testid="input-item-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} data-testid="button-save-notes">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
