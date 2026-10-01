import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, Droplet, Waves, CreditCard, 
  Package, TrendingUp, BarChart3, Settings, LogOut, 
  Search, Bell, ChevronRight, ChevronDown, User, Menu, X, Check
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'users' | 'employees' | 'roles'
  | 'laundry' | 'laundry-new' | 'laundry-orders' | 'laundry-history'
  | 'water' | 'water-new' | 'water-history'
  | 'payments' | 'payments-new' | 'payments-history'
  | 'inventory' | 'inventory-products' | 'inventory-items' | 'inventory-stock' | 'inventory-suppliers' | 'inventory-purchase'
  | 'finance' | 'finance-expenses' | 'finance-reports'
  | 'analytics'
  | 'settings'
  | 'profile' | 'change-password' | 'activity-logs';

interface NavItem {
  id: PageId;
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: PageId; path: string; label: string }[];
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  {
    id: 'laundry', path: '/laundry', label: 'Laundry Operations', icon: <Waves className="w-5 h-5" />,
    children: [
      { id: 'laundry-new', path: '/laundry/new', label: 'New Order' },
      { id: 'laundry-orders', path: '/laundry/orders', label: 'Order Tracker' },
      { id: 'laundry-history', path: '/laundry/history', label: 'Sales History' },
    ],
  },
  {
    id: 'water', path: '/water', label: 'Water Refilling', icon: <Droplet className="w-5 h-5" />,
    children: [
      { id: 'water-new', path: '/water/new', label: 'New Sale' },
      { id: 'water-history', path: '/water/history', label: 'Sales History' },
    ],
  },
  {
    id: 'payments', path: '/payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" />,
    children: [
      { id: 'payments-new', path: '/payments/new', label: 'Record Payment' },
      { id: 'payments-history', path: '/payments/history', label: 'Payment Ledger' },
    ],
  },
  {
    id: 'inventory', path: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" />,
    children: [
      { id: 'inventory-products', path: '/inventory/products', label: 'Products' },
      { id: 'inventory-items', path: '/inventory/items', label: 'Stocks' },
      { id: 'inventory-stock', path: '/inventory/stock', label: 'Stock Movements' },
      { id: 'inventory-suppliers', path: '/inventory/suppliers', label: 'Suppliers' },
      { id: 'inventory-purchase', path: '/inventory/purchase', label: 'Purchase Orders' },
    ],
  },
  {
    id: 'finance', path: '/finance', label: 'Finance', adminOnly: true, icon: <TrendingUp className="w-5 h-5" />,
    children: [
      { id: 'finance-expenses', path: '/finance/expenses', label: 'Record Expenses' },
      { id: 'finance-reports', path: '/finance/reports', label: 'Financial Reports' },
    ],
  },
  { id: 'analytics', path: '/analytics', label: 'Business Analytics', adminOnly: true, icon: <BarChart3 className="w-5 h-5" /> },
  {
    id: 'users', path: '/users', label: 'User Management', adminOnly: true, icon: <Users className="w-5 h-5" />,
    children: [
      { id: 'employees', path: '/users/employees', label: 'Employee Directory' },
      { id: 'roles', path: '/users/roles', label: 'Roles & Permissions' },
      { id: 'activity-logs', path: '/users/activity-logs', label: 'System Logs' },
    ],
  },
];

const pageTitle: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User Management', '/users/employees': 'Employee Directory', '/users/roles': 'Roles & Permissions',
  '/laundry': 'Laundry Operations', '/laundry/new': 'New Laundry Order',
  '/laundry/orders': 'Order Tracker', '/laundry/history': 'Sales History',
  '/water': 'Water Refilling', '/water/new': 'New Water Sale', '/water/history': 'Sales History',
  '/payments': 'Payments', '/payments/new': 'Record Payment', '/payments/history': 'Payment Ledger',
  '/inventory': 'Inventory', '/inventory/products': 'Products',
  '/inventory/items': 'Stocks', '/inventory/stock': 'Stock Movements',
  '/inventory/suppliers': 'Suppliers', '/inventory/purchase': 'Purchase Orders',
  '/finance': 'Finance', '/finance/expenses': 'Expense Management', '/finance/reports': 'Financial Reports',
  '/analytics': 'Business Analytics',
  '/settings': 'Settings', '/profile': 'My Profile', '/change-password': 'Change Password',
  '/users/activity-logs': 'System Logs',
};

const initialNotifications = [
  { id: 1, title: 'Laundry Ready', desc: 'Order #LAU-0042 is ready for pickup.', time: '10 mins ago', read: false },
  { id: 2, title: 'Low Inventory', desc: 'Detergent stock is below minimum level.', time: '1 hour ago', read: false },
  { id: 3, title: 'Payment Received', desc: '₱500 Cash payment recorded for Water.', time: '2 hours ago', read: true },
  { id: 4, title: 'Stock Updated', desc: '20L Gallon inventory replenished (+50).', time: '1 day ago', read: true },
];

export default function Layout() {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const s = new Set<string>();
    navItems.forEach(item => { if (currentPath.startsWith(item.path)) s.add(item.id); });
    return s;
  });
  
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    navItems.forEach(item => {
      if (currentPath.startsWith(item.path) && !expandedMenus.has(item.id)) {
        setExpandedMenus(prev => {
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });
      }
    });
    setSidebarOpen(false); // Close sidebar on mobile when navigating
  }, [currentPath]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      if (notifOpen) setNotifOpen(false);
      if (profileOpen) setProfileOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [notifOpen, profileOpen]);

  if (!auth) return <Outlet />;

  const { role: userRole, name: userName } = auth;

  const toggleMenu = (id: string) => {
    setExpandedMenus(p => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (item: NavItem) => currentPath === item.path || (item.children && currentPath.startsWith(item.path));
  const filteredNav = navItems.filter(item => !item.adminOnly || userRole === 'admin');
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.map(n => ({...n, read: true})));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Deep Slate */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-[240px] flex-shrink-0 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Droplet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">ALMS POS</div>
              <div className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest leading-tight mt-0.5">and Inventory Management System</div>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {filteredNav.map(item => {
            const active = isActive(item);
            const expanded = expandedMenus.has(item.id);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasChildren) toggleMenu(item.id);
                    else navigate(item.path);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? 'text-blue-400' : 'text-slate-500'}>{item.icon}</span>
                    {item.label}
                  </div>
                  {hasChildren && (
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  )}
                </button>
                {hasChildren && expanded && (
                  <div className="mt-1 ml-4 pl-4 border-l border-slate-800/80 space-y-1">
                    {item.children!.map(child => (
                      <button
                         key={child.id}
                         onClick={() => navigate(child.path)}
                         className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${currentPath === child.path ? 'text-blue-400 font-medium bg-slate-800/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                      >
                         {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPath === '/settings' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Settings className="w-5 h-5 text-slate-500" />
            Settings
          </button>
          
          <div className="mt-3 text-center">
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Powered by <span className="text-white font-bold tracking-widest">NEXORA</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600 p-1 -ml-1" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{pageTitle[currentPath] ?? 'ALMS POS and Inventory Management System'}</h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden sm:block">
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-52 bg-slate-50 focus:bg-white" placeholder="Quick search..." />
            </div>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }} className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[400px]">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-800">Mark all read</button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? 'bg-blue-50/30' : ''}`} onClick={() => setNotifications(notifications.map(item => item.id === n.id ? {...item, read: true} : item))}>
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                          <p className="text-[10px] text-slate-400 whitespace-nowrap ml-2 mt-0.5">{n.time}</p>
                        </div>
                        <p className={`text-xs ${!n.read ? 'text-slate-700' : 'text-slate-500'}`}>{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative ml-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }} className="flex items-center gap-1.5 pl-1 pr-1 py-1 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold border border-blue-200 flex-shrink-0">
                  {userName.charAt(0)}
                </div>
                <div className="text-left hidden md:block pr-1">
                  <div className="text-[11px] font-semibold text-slate-900 whitespace-nowrap">{userName}</div>
                  <div className="text-[10px] text-slate-500 capitalize font-medium">{userRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>
              
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{userName}</p>
                    <p className="text-xs text-slate-500 capitalize">{userRole}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { navigate('/profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <User className="w-4 h-4 text-slate-400" /> My Profile
                    </button>
                    <button onClick={() => { navigate('/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50">
                      <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
