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
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 p-2 border-b border-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  const activeCategories = categories
    .filter((cat) => cat.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border p-2">
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
        {activeCategories.map((category) => {
          const isSelected = selectedCategoryId === category._id;
          const categoryColor = category.color || "#6366f1";
          return (
            <Button
              key={category._id}
              size="sm"
              className={`font-medium text-xs h-auto min-h-8 px-2 py-1 text-white whitespace-normal text-center leading-tight ${
                isSelected ? "ring-2 ring-offset-1 ring-foreground/20" : "opacity-85"
              }`}
              style={{
                backgroundColor: categoryColor,
                borderColor: categoryColor,
              }}
              onClick={() => onSelectCategory(isSelected ? null : category._id)}
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
