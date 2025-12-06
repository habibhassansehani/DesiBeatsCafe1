import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@shared/schema";

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading = false,
}: CategoryTabsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4 border-b border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  const activeCategories = categories
    .filter((cat) => cat.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border p-3">
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        <Button
          size="sm"
          variant={selectedCategoryId === null ? "default" : "outline"}
          className="font-semibold text-sm truncate"
          onClick={() => onSelectCategory(null)}
          data-testid="button-category-all"
        >
          All
        </Button>
        {activeCategories.map((category) => {
          const isSelected = selectedCategoryId === category._id;
          const categoryColor = category.color || "#6366f1";
          return (
            <Button
              key={category._id}
              size="sm"
              className={`font-semibold text-sm text-white truncate ${
                isSelected ? "" : "opacity-80"
              }`}
              style={{
                backgroundColor: categoryColor,
                borderColor: categoryColor,
              }}
              onClick={() => onSelectCategory(category._id)}
              data-testid={`button-category-${category._id}`}
            >
              {category.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
