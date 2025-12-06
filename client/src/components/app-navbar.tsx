import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Settings,
  Users,
  Package,
  Grid3X3,
  Receipt,
  LogOut,
  Tag,
  DollarSign,
  Menu,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const operationsItems = [
  { title: "POS Terminal", url: "/pos", icon: ShoppingCart },
  { title: "Tables", url: "/tables", icon: Grid3X3 },
  { title: "Kitchen Display", url: "/kitchen", icon: ChefHat },
  { title: "Orders", url: "/orders", icon: Receipt },
];

const adminItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Reports", url: "/admin/reports", icon: FileText },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: Tag },
  { title: "Tables", url: "/admin/tables", icon: UtensilsCrossed },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AppNavbar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, isKitchen } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary text-primary-foreground";
      case "cashier":
        return "bg-chart-2 text-white";
      case "waiter":
        return "bg-chart-4 text-white";
      case "kitchen":
        return "bg-chart-3 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const visibleOperationsItems = operationsItems.filter((item) => {
    if (isKitchen) {
      return item.url === "/kitchen";
    }
    return true;
  });

  return (
    <nav className="h-14 border-b border-border bg-card shrink-0 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        <div className="flex items-center gap-6">
          <Link href="/pos" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight" data-testid="text-navbar-title">
                Desi Beats
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">POS System</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-9 px-3 text-sm" data-testid="nav-operations">
                    Operations
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-48 gap-1 p-2">
                      {visibleOperationsItems.map((item) => (
                        <li key={item.title}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={item.url}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover-elevate",
                                location === item.url && "bg-accent text-accent-foreground"
                              )}
                              data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-3 text-sm" data-testid="nav-administration">
                      Administration
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-48 gap-1 p-2">
                        {adminItems.map((item) => (
                          <li key={item.title}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={item.url}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover-elevate",
                                  location === item.url && "bg-accent text-accent-foreground"
                                )}
                                data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Operations</DropdownMenuLabel>
                {visibleOperationsItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        location === item.url && "bg-accent"
                      )}
                      data-testid={`link-mobile-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Administration</DropdownMenuLabel>
                    {adminItems.map((item) => (
                      <DropdownMenuItem key={item.title} asChild>
                        <Link
                          href={item.url}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            location === item.url && "bg-accent"
                          )}
                          data-testid={`link-mobile-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" data-testid="button-user-menu">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={cn("text-xs", getRoleColor(user?.role || ""))}>
                    {user?.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium" data-testid="text-user-name">
                    {user?.name || "Unknown User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize" data-testid="text-user-role">
                    {user?.role || "Guest"}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer" data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
