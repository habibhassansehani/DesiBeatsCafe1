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

const categoryColors: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: "bg-orange-500 dark:bg-orange-600", border: "border-orange-600 dark:border-orange-500", text: "text-white" },
  1: { bg: "bg-blue-500 dark:bg-blue-600", border: "border-blue-600 dark:border-blue-500", text: "text-white" },
  2: { bg: "bg-green-500 dark:bg-green-600", border: "border-green-600 dark:border-green-500", text: "text-white" },
  3: { bg: "bg-purple-500 dark:bg-purple-600", border: "border-purple-600 dark:border-purple-500", text: "text-white" },
  4: { bg: "bg-pink-500 dark:bg-pink-600", border: "border-pink-600 dark:border-pink-500", text: "text-white" },
  5: { bg: "bg-teal-500 dark:bg-teal-600", border: "border-teal-600 dark:border-teal-500", text: "text-white" },
  6: { bg: "bg-red-500 dark:bg-red-600", border: "border-red-600 dark:border-red-500", text: "text-white" },
  7: { bg: "bg-amber-500 dark:bg-amber-600", border: "border-amber-600 dark:border-amber-500", text: "text-white" },
};

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

  const getCategoryColor = (index: number) => {
    return categoryColors[index % 8] || categoryColors[0];
  };

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
            .map((category, index) => {
              const colors = getCategoryColor(index);
              const isSelected = selectedCategoryId === category._id;
              return (
                <Button
                  key={category._id}
                  size="lg"
                  className={`shrink-0 px-6 text-base font-semibold ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text}`
                      : `${colors.bg} ${colors.border} ${colors.text} opacity-70`
                  }`}
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
