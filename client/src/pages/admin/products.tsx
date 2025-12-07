import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IKContext, IKUpload } from "imagekitio-react";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, Category, Settings, ProductVariant, InsertProduct } from "@shared/schema";

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "";
const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "";

const authenticator = async () => {
  try {
    const token = localStorage.getItem("pos_token");
    if (!token) {
      throw new Error("Not authenticated");
    }
    const response = await fetch("/api/imagekit/auth", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Authentication failed");
    }
    return await response.json();
  } catch (error) {
    throw new Error("Authentication failed");
  }
};

function SignedImage({ 
  filePath, 
  fallbackUrl,
  alt, 
  className,
  "data-testid": dataTestId
}: { 
  filePath?: string; 
  fallbackUrl?: string;
  alt: string; 
  className?: string;
  "data-testid"?: string;
}) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset state when dependencies change
    setSignedUrl("");
    setLoading(true);
    setError(false);
    
    const fetchSignedUrl = async () => {
      // If we have a filePath, always use signed URL (don't fallback to public URL which will 403)
      if (filePath) {
        try {
          const token = localStorage.getItem("pos_token");
          const res = await fetch("/api/imagekit/signed-url", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ filePath }),
          });
          if (res.ok) {
            const data = await res.json();
            setSignedUrl(data.signedUrl);
          } else {
            setError(true);
          }
        } catch {
          setError(true);
        }
        setLoading(false);
        return;
      }
      
      // No filePath - use fallbackUrl only for legacy public images
      if (fallbackUrl) {
        setSignedUrl(fallbackUrl);
      }
      setLoading(false);
    };
    
    fetchSignedUrl();
  }, [filePath, fallbackUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return <img src={signedUrl} alt={alt} className={className} data-testid={dataTestId} />;
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<InsertProduct> & { image?: string; imageFileId?: string }>({
    name: "",
    description: "",
    price: 0,
    categoryId: "",
    variants: [],
    isAvailable: true,
    isTaxable: true,
    sortOrder: 0,
    image: "",
    imageFileId: "",
  });

  // Queries
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.currency || "Rs.";

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertProduct>) => {
      return apiRequest<Product>("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Created", description: "Product has been added successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProduct> }) => {
      return apiRequest<Product>("PATCH", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Updated", description: "Product has been updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Deleted", description: "Product has been deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products;

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.categoryId === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, categoryFilter, searchQuery]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c._id === categoryId)?.name || "Unknown";
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      categoryId: categories[0]?._id || "",
      variants: [],
      isAvailable: true,
      isTaxable: true,
      sortOrder: 0,
      image: "",
      imageFileId: "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      variants: product.variants,
      isAvailable: product.isAvailable,
      isTaxable: product.isTaxable,
      sortOrder: product.sortOrder,
      image: product.image || "",
      imageFileId: product.imageFileId || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      categoryId: "",
      variants: [],
      isAvailable: true,
      isTaxable: true,
      sortOrder: 0,
      image: "",
      imageFileId: "",
    });
  };

  const onUploadStart = () => {
    setIsUploading(true);
  };

  const onUploadSuccess = (res: any) => {
    setIsUploading(false);
    if (!res?.filePath || typeof res.filePath !== "string") {
      toast({ title: "Upload Failed", description: "Invalid response from image service", variant: "destructive" });
      return;
    }
    const allowedFolderPattern = /^\/cafe-pos\/(products|settings)\//;
    if (!allowedFolderPattern.test(res.filePath)) {
      toast({ title: "Upload Failed", description: "File uploaded to unauthorized location", variant: "destructive" });
      return;
    }
    // For private files, don't store the public URL (it will 403) - only store imageFileId
    setFormData({ ...formData, image: "", imageFileId: res.filePath });
    toast({ title: "Image Uploaded", description: "Product image uploaded successfully" });
  };

  const onUploadError = (err: any) => {
    setIsUploading(false);
    toast({ title: "Upload Failed", description: err?.message || "Failed to upload image", variant: "destructive" });
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: "", imageFileId: "" });
  };

  const handleSubmit = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Error", description: "Product name is required", variant: "destructive" });
      return;
    }
    if (!formData.categoryId) {
      toast({ title: "Error", description: "Category is required", variant: "destructive" });
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [...(formData.variants || []), { name: "", price: 0 }],
    });
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const variants = [...(formData.variants || [])];
    variants[index] = { ...variants[index], [field]: value };
    setFormData({ ...formData, variants });
  };

  const handleRemoveVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: (formData.variants || []).filter((_, i) => i !== index),
    });
  };

  const formatPrice = (price: number) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="admin-products-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="text-page-title">Products</h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} products
            </p>
          </div>
        </div>

        <Button onClick={handleOpenCreate} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-border flex-wrap">
        <div className="relative flex-1 max-w-sm">
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium" data-testid="text-no-products">No products found</p>
              <p className="text-sm mt-1">Add products to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product._id}
                  className={`overflow-visible ${!product.isAvailable ? "opacity-60" : ""}`}
                  data-testid={`product-card-${product._id}`}
                >
                  {(product.imageFileId || product.image) && (
                    <div className="w-full h-32 overflow-hidden rounded-t-lg">
                      <SignedImage
                        filePath={product.imageFileId}
                        fallbackUrl={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        data-testid={`img-product-${product._id}`}
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName(product.categoryId)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeletingProduct(product);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex items-center gap-1">
                        {!product.isAvailable && (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                        {product.isTaxable && (
                          <Badge variant="outline" className="text-xs">
                            Tax
                          </Badge>
                        )}
                        {product.variants && product.variants.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {product.variants.length} variants
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={3}
                data-testid="input-product-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Product Image</Label>
              {(formData.imageFileId || formData.image) ? (
                <div className="relative w-full">
                  <SignedImage
                    filePath={formData.imageFileId}
                    fallbackUrl={formData.image}
                    alt="Product preview"
                    className="w-full h-40 object-cover rounded-md border"
                    data-testid="img-product-preview"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleRemoveImage}
                    data-testid="button-remove-image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <IKContext
                  publicKey={IMAGEKIT_PUBLIC_KEY}
                  urlEndpoint={IMAGEKIT_URL_ENDPOINT}
                  authenticator={authenticator}
                >
                  <div className="border-2 border-dashed rounded-md p-6 text-center">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Click to upload product image
                        </p>
                        <IKUpload
                          fileName={`product-${Date.now()}`}
                          folder="/cafe-pos/products"
                          isPrivateFile={true}
                          onUploadStart={onUploadStart}
                          onSuccess={onUploadSuccess}
                          onError={onUploadError}
                          accept="image/*"
                          className="hidden"
                          ref={uploadRef}
                          data-testid="input-image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => uploadRef.current?.click()}
                          data-testid="button-upload-image"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                      </>
                    )}
                  </div>
                </IKContext>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min={0}
                  data-testid="input-product-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.categoryId || ""}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder || 0}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-product-sort"
              />
            </div>

            {/* Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variants (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariant}
                  data-testid="button-add-variant"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Variant
                </Button>
              </div>
              {formData.variants && formData.variants.length > 0 && (
                <div className="space-y-2">
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Size/Type (e.g., Large)"
                        value={variant.name}
                        onChange={(e) => handleUpdateVariant(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={variant.price}
                        onChange={(e) => handleUpdateVariant(index, "price", parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                  data-testid="switch-available"
                />
                <Label htmlFor="isAvailable">Available for sale</Label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isTaxable"
                  checked={formData.isTaxable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTaxable: checked })}
                  data-testid="switch-taxable"
                />
                <Label htmlFor="isTaxable">Apply tax</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-product">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingProduct ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProduct && deleteMutation.mutate(deletingProduct._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
