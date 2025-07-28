import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Brackets as Racket,
  Calendar,
  DollarSign,
  Package,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/Auth";
import toast from "react-hot-toast";
import { Spinner } from '@/components/dashboard/spinner';

const AdminLayout: React.FC = () => {
  const { signOut, user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Handle any auth-related errors that might occur
    if (!isLoading) {
      if (!user) {
        console.log("No user in AdminLayout, redirecting to login");
        navigate("/login");
      } else if (userRole !== "admin") {
        console.log("User is not admin, redirecting to client area");
        toast.error("You do not have admin privileges");
        navigate("/");
      }
    }
  }, [isLoading, user, userRole, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Failed to sign out properly");
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
        </div>
      </div>
    );
  }

  const NavItem: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
  }> = ({ to, icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-md ${isActive
          ? "bg-[var(--primary)] text-white"
          : "text-gray-700 hover:bg-gray-100"
        }`
      }
      onClick={() => setSidebarOpen(false)}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:static lg:inset-auto transition-transform duration-300 ease-in-out`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
            <div className="flex items-center">
              <img 
                src="/images/logo/Logo-padel-palmeraie.png.png" 
                alt="Padel Palmeraie Logo" 
                className="h-8 w-auto"
              />
              <h1 className="ml-2 text-xl font-bold text-[var(--primary)]">
                Admin
              </h1>
            </div>
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-auto py-4 px-3 space-y-2">
            <NavItem
              to="/admin"
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
            />
            <NavItem
              to="/admin/courts"
              icon={<Racket size={20} />}
              label="Courts Management"
            />
            <NavItem
              to="/admin/reservations"
              icon={<Calendar size={20} />}
              label="Reservations"
            />
            <NavItem
              to="/admin/financial"
              icon={<DollarSign size={20} />}
              label="Financial"
            />
            <NavItem
              to="/admin/products"
              icon={<Package size={20} />}
              label="Produits"
            />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 flex justify-end">
              <span className="hidden sm:inline-block text-sm font-medium text-gray-700">
                Welcome, Admin
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
