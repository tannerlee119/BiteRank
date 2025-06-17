import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NavbarProps {
  onAddReview: () => void;
}

export function Navbar({ onAddReview }: NavbarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/my-reviews", label: "My Reviews" },
    { path: "/stats", label: "Stats" },
    { path: "/recommendations", label: "Recommendations" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-primary">
                BiteRank
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.path)
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <Button
              onClick={onAddReview}
              className="mr-4"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
            {user && (
              <Button
                variant="ghost"
                onClick={logout}
                size="sm"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center px-3 py-2 text-base font-medium ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
