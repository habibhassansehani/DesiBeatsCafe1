import { useState, useEffect } from "react";
import {
  Banknote,
  CreditCard,
  Building,
  Wallet,
  Calculator,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Payment, Settings } from "@shared/schema";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payments: Payment[]) => void;
  total: number;
  settings: Settings | null;
  isProcessing?: boolean;
}

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building },
  { id: "wallet", label: "Wallet", icon: Wallet },
] as const;

export function PaymentModal({
  open,
  onClose,
  onConfirm,
  total,
  settings,
  isProcessing = false,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [amount, setAmount] = useState<string>(total.toString());
  const [tip, setTip] = useState<string>("0");
  const [reference, setReference] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showSplitPayment, setShowSplitPayment] = useState(false);

  const currency = settings?.currency || "Rs.";

  useEffect(() => {
    if (open) {
      setAmount(total.toString());
      setPayments([]);
      setTip("0");
      setReference("");
      setSelectedMethod("cash");
      setShowSplitPayment(false);
    }
  }, [open, total]);

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount + p.tip, 0);
  const remaining = total - totalPaid;

  const handleReset = () => {
    setPayments([]);
    setAmount(total.toString());
    setTip("0");
    setReference("");
    setSelectedMethod("cash");
    setShowSplitPayment(false);
  };

  const handleAddPayment = () => {
    const parsedAmount = parseFloat(amount) || 0;
    const parsedTip = parseFloat(tip) || 0;

    if (parsedAmount <= 0) return;

    const payment: Payment = {
      method: selectedMethod as Payment["method"],
      amount: parsedAmount,
      tip: parsedTip,
      reference: reference || undefined,
    };

    setPayments([...payments, payment]);
    setAmount(Math.max(0, remaining - parsedAmount).toString());
    setTip("0");
    setReference("");
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (showSplitPayment && payments.length > 0) {
      onConfirm(payments);
    } else {
      const parsedAmount = parseFloat(amount) || 0;
      const parsedTip = parseFloat(tip) || 0;
      const payment: Payment = {
        method: selectedMethod as Payment["method"],
        amount: parsedAmount,
        tip: parsedTip,
        reference: reference || undefined,
      };
      onConfirm([payment]);
    }
    handleReset();
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Display */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-4xl font-bold text-primary" data-testid="text-payment-total">
              {formatPrice(total)}
            </p>
            {showSplitPayment && payments.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Paid: <span className="text-foreground">{formatPrice(totalPaid)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Remaining: <span className="text-foreground font-medium">{formatPrice(remaining)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Split Payment Toggle */}
          <div className="flex items-center justify-between">
            <Label>Split Payment</Label>
            <Button
              variant={showSplitPayment ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSplitPayment(!showSplitPayment)}
              data-testid="button-split-payment"
            >
              {showSplitPayment ? "Enabled" : "Enable"}
            </Button>
          </div>

          {/* Added Payments (for split) */}
          {showSplitPayment && payments.length > 0 && (
            <div className="space-y-2">
              <Label>Added Payments</Label>
              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {payment.method.replace("_", " ")}
                    </Badge>
                    <span className="text-sm">
                      {formatPrice(payment.amount)}
                      {payment.tip > 0 && ` + ${formatPrice(payment.tip)} tip`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemovePayment(index)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant={selectedMethod === method.id ? "default" : "outline"}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setSelectedMethod(method.id)}
                  data-testid={`button-method-${method.id}`}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-medium"
              data-testid="input-payment-amount"
            />
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmt) => (
                <Button
                  key={quickAmt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(quickAmt)}
                  data-testid={`button-quick-${quickAmt}`}
                >
                  {formatPrice(quickAmt)}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(showSplitPayment ? remaining : total)}
                data-testid="button-exact"
              >
                Exact
              </Button>
            </div>
          </div>

          {/* Tip Input */}
          <div className="space-y-2">
            <Label htmlFor="tip">Tip (Optional)</Label>
            <Input
              id="tip"
              type="number"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="0"
              data-testid="input-tip"
            />
          </div>

          {/* Reference (for non-cash) */}
          {selectedMethod !== "cash" && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID or reference"
                data-testid="input-reference"
              />
            </div>
          )}

          {/* Change Calculation for Cash */}
          {selectedMethod === "cash" && !showSplitPayment && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Received</span>
                <span>{formatPrice(parseFloat(amount) || 0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Change</span>
                <span className="text-primary" data-testid="text-change">
                  {formatPrice(Math.max(0, (parseFloat(amount) || 0) - total + (parseFloat(tip) || 0)))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          {showSplitPayment && remaining > 0 && (
            <Button
              variant="secondary"
              onClick={handleAddPayment}
              disabled={parseFloat(amount) <= 0}
              data-testid="button-add-payment"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Payment
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={
              isProcessing ||
              (showSplitPayment ? remaining > 0 && payments.length === 0 : parseFloat(amount) <= 0)
            }
            data-testid="button-confirm-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
