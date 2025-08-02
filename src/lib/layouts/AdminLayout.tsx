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
  Shield,
  ChevronDown,
  User,
  Users,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/Auth";
import { hasAdminAccess } from "@/lib/utils/role-utils";
import toast from "react-hot-toast";
import { Spinner } from '@/components/dashboard/spinner';

type ViewMode = 'admin' | 'coach' | 'client';

const AdminLayout: React.FC = () => {
  const { signOut, user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('admin');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);

  useEffect(() => {
    // Handle any auth-related errors that might occur
    if (!isLoading) {
      if (!user) {
        console.log("No user in AdminLayout, redirecting to login");
        navigate("/login");
      } else if (!hasAdminAccess(userRole)) {
        console.log("User is not admin or super admin, redirecting to client area");
        toast.error("You do not have admin privileges");
        navigate("/");
      }
    }
  }, [isLoading, user, userRole, navigate]);

  // Detect current view from URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setCurrentView('admin');
    } else if (path.startsWith('/coach')) {
      setCurrentView('coach');
    } else if (path.startsWith('/home')) {
      setCurrentView('client');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownOpen) {
        setViewDropdownOpen(false);
      }
    };

    if (viewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [viewDropdownOpen]);

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

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setViewDropdownOpen(false);
    
    // Navigate to the appropriate route based on view
    switch (view) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'coach':
        navigate('/coach');
        break;
      case 'client':
        navigate('/home');
        break;
    }
  };

  const getViewIcon = (view: ViewMode) => {
    switch (view) {
      case 'admin':
        return <Settings size={16} />;
      case 'coach':
        return <Users size={16} />;
      case 'client':
        return <User size={16} />;
    }
  };

  const getViewLabel = (view: ViewMode) => {
    switch (view) {
      case 'admin':
        return 'Administration';
      case 'coach':
        return 'Coach';
      case 'client':
        return 'Client';
    }
  };

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
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {userRole === 'super_admin' ? (
                    <>
                      <Shield size={12} className="text-purple-500" />
                      Super Administrateur
                    </>
                  ) : userRole === 'admin' ? (
                    'Administrateur'
                  ) : (
                    'Utilisateur'
                  )}
                </p>
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
            <div className="flex-1 flex items-center justify-between">
              {/* View Selector for Admin/Super Admin */}
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <div className="relative">
                  <button
                    onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getViewIcon(currentView)}
                    <span>Vue: {getViewLabel(currentView)}</span>
                    <ChevronDown size={16} className={`transform transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {viewDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <button
                          onClick={() => handleViewChange('admin')}
                          className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                            currentView === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <Settings size={16} />
                          <span>Administration</span>
                        </button>
                        <button
                          onClick={() => handleViewChange('coach')}
                          className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                            currentView === 'coach' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <Users size={16} />
                          <span>Coach</span>
                        </button>
                        <button
                          onClick={() => handleViewChange('client')}
                          className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                            currentView === 'client' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <User size={16} />
                          <span>Client</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <span className="hidden sm:inline-block text-sm font-medium text-gray-700">
                Welcome, {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'User'}
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
