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
  Menu,
  FileText,
  Shield,
  ChevronDown,
} from "lucide-react";
import logoImage from "@assets/WhatsApp_Image_2025-11-21_at_20.00.27_83f196f8_1765299453609.jpg";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const operationsItems = [
  { title: "POS", url: "/pos", icon: ShoppingCart },
  { title: "Tables", url: "/tables", icon: Grid3X3 },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
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

  const isAdminRoute = location.startsWith("/admin") || location === "/dashboard";

  return (
    <nav className="h-14 border-b border-amber-700/50 bg-amber-700 shrink-0 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/pos" className="flex items-center gap-2 shrink-0">
            <img 
              src={logoImage} 
              alt="Desi Beats Café" 
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-200/50"
            />
            <div className="hidden sm:flex flex-col">
              <span className="font-semibold text-sm leading-tight text-white" data-testid="text-navbar-title">
                Desi Beats
              </span>
              <span className="text-[10px] text-white/80 leading-tight">POS System</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {visibleOperationsItems.map((item) => (
              <Link
                key={item.url}
                href={item.url}
                data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Button
                  variant={location === item.url ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1.5 transition-colors",
                    location === item.url
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Button>
              </Link>
            ))}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isAdminRoute ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-1.5 transition-colors",
                      isAdminRoute
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    )}
                    data-testid="button-admin-menu"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {adminItems.map((item) => (
                    <DropdownMenuItem key={item.title} asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          location === item.url && "bg-accent"
                        )}
                        data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-mobile-menu">
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

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle className="text-white hover:bg-white/10" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 hover:bg-white/10" data-testid="button-user-menu">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={cn("text-xs", getRoleColor(user?.role || ""))}>
                    {user?.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium text-white" data-testid="text-user-name">
                    {user?.name || "Unknown User"}
                  </span>
                  <span className="text-[10px] text-white/80 capitalize" data-testid="text-user-role">
                    {user?.role || "Guest"}
                  </span>
                </div>
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
