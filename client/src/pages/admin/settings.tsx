import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Loader2,
  Store,
  Percent,
  Receipt,
  Bell,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Settings as SettingsType, InsertSettings } from "@shared/schema";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertSettings>>({
    cafeName: "Desi Beats Café",
    cafeAddress: "",
    cafePhone: "",
    taxPercentage: 16,
    isTaxInclusive: false,
    currency: "Rs.",
    receiptFooter: "Thank you for visiting Desi Beats Café!",
    enableSoundNotifications: true,
    autoLogoutMinutes: 30,
  });

  // Query
  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        cafeName: settings.cafeName,
        cafeAddress: settings.cafeAddress,
        cafePhone: settings.cafePhone,
        taxPercentage: settings.taxPercentage,
        isTaxInclusive: settings.isTaxInclusive,
        currency: settings.currency,
        receiptFooter: settings.receiptFooter,
        enableSoundNotifications: settings.enableSoundNotifications,
        autoLogoutMinutes: settings.autoLogoutMinutes,
      });
    }
  }, [settings]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertSettings>) => {
      return apiRequest<SettingsType>("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings Saved", description: "Your settings have been updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="admin-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-page-title">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your POS system
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-3xl">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="w-4 h-4" />
                Business Information
              </CardTitle>
              <CardDescription>
                Your café details that appear on receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cafeName">Café Name</Label>
                <Input
                  id="cafeName"
                  value={formData.cafeName || ""}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  placeholder="Desi Beats Café"
                  data-testid="input-cafe-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cafeAddress">Address</Label>
                <Input
                  id="cafeAddress"
                  value={formData.cafeAddress || ""}
                  onChange={(e) => setFormData({ ...formData, cafeAddress: e.target.value })}
                  placeholder="123 Main Street, City"
                  data-testid="input-cafe-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cafePhone">Phone Number</Label>
                <Input
                  id="cafePhone"
                  value={formData.cafePhone || ""}
                  onChange={(e) => setFormData({ ...formData, cafePhone: e.target.value })}
                  placeholder="+92 300 1234567"
                  data-testid="input-cafe-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency Symbol</Label>
                <Input
                  id="currency"
                  value={formData.currency || ""}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="Rs."
                  className="w-24"
                  data-testid="input-currency"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="w-4 h-4" />
                Tax Settings
              </CardTitle>
              <CardDescription>
                Configure tax calculations for orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                <Input
                  id="taxPercentage"
                  type="number"
                  value={formData.taxPercentage || 0}
                  onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-32"
                  data-testid="input-tax-percentage"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isTaxInclusive">Tax Inclusive Pricing</Label>
                  <p className="text-sm text-muted-foreground">
                    Product prices already include tax
                  </p>
                </div>
                <Switch
                  id="isTaxInclusive"
                  checked={formData.isTaxInclusive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTaxInclusive: checked })}
                  data-testid="switch-tax-inclusive"
                />
              </div>
            </CardContent>
          </Card>

          {/* Receipt Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="w-4 h-4" />
                Receipt Settings
              </CardTitle>
              <CardDescription>
                Customize your printed receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                <Textarea
                  id="receiptFooter"
                  value={formData.receiptFooter || ""}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="Thank you for visiting!"
                  rows={3}
                  data-testid="input-receipt-footer"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4" />
                System Settings
              </CardTitle>
              <CardDescription>
                General system preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSoundNotifications">Sound Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sound when new orders arrive
                  </p>
                </div>
                <Switch
                  id="enableSoundNotifications"
                  checked={formData.enableSoundNotifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, enableSoundNotifications: checked })}
                  data-testid="switch-sound"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="autoLogoutMinutes">Auto Logout (minutes)</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Automatically log out inactive users (0 to disable)
                </p>
                <Input
                  id="autoLogoutMinutes"
                  type="number"
                  value={formData.autoLogoutMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, autoLogoutMinutes: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-32"
                  data-testid="input-auto-logout"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
