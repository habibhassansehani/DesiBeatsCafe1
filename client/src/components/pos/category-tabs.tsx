import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
      <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex gap-3 p-4">
          <Button
            size="lg"
            variant={selectedCategoryId === null ? "default" : "outline"}
            className="shrink-0 px-6 text-base font-semibold"
            onClick={() => onSelectCategory(null)}
            data-testid="button-category-all"
          >
            All Items
          </Button>
          {categories
            .filter((cat) => cat.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((category) => {
              const isSelected = selectedCategoryId === category._id;
              const categoryColor = category.color || "#6366f1";
              return (
                <Button
                  key={category._id}
                  size="lg"
                  className={`shrink-0 px-6 text-base font-semibold text-white border-2 ${
                    isSelected ? "" : "opacity-70"
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
