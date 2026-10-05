import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from './components/ui';
import Layout, { type PageId } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import LaundryPage from './pages/LaundryPage';
import WaterRefillingPage from './pages/WaterRefillingPage';
import PaymentPage from './pages/PaymentPage';
import InventoryPage from './pages/InventoryPage';
import FinancePage from './pages/FinancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';

function AppRoutes() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = (role: 'admin' | 'staff', name: string) => {
    login(role, name);
  };

  const mapPageToPath = (page: PageId): string => {
    const map: Record<PageId, string> = {
      dashboard: '/dashboard',
      users: '/users', employees: '/users/employees', roles: '/users/roles', 'activity-logs': '/users/activity-logs',
      laundry: '/laundry/orders', 'laundry-new': '/laundry/new', 'laundry-orders': '/laundry/orders', 'laundry-history': '/laundry/history', 'laundry-services': '/laundry/services',
      water: '/water/new', 'water-new': '/water/new', 'water-history': '/water/history', 'water-products': '/water/products',
      payments: '/payments/new', 'payments-new': '/payments/new', 'payments-history': '/payments/history',
      inventory: '/inventory/items', 'inventory-products': '/inventory/products', 'inventory-items': '/inventory/items', 'inventory-stock': '/inventory/stock', 'inventory-suppliers': '/inventory/suppliers', 'inventory-purchase': '/inventory/purchase',
      finance: '/finance/reports', 'finance-expenses': '/finance/expenses', 'finance-reports': '/finance/reports',
      analytics: '/analytics',
      settings: '/settings', profile: '/profile', 'change-password': '/change-password'
    };
    return map[page] ?? '/dashboard';
  };
  
  // Create a wrapper component for routes that need auth data
  const AuthRoute = ({ component: Component, adminOnly = false, subPage, ...props }: any) => {
    if (!auth) return <Navigate to="/login" replace />;
    if (adminOnly && auth.role !== 'admin') return <Navigate to="/dashboard" replace />; // or AccessDenied
    
    return <Component subPage={subPage} userName={auth.name} userRole={auth.role} onNavigate={(p: PageId) => navigate(mapPageToPath(p))} {...props} />;
  };

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="dashboard" element={<AuthRoute component={DashboardPage} />} />
        
        {/* User Management */}
        <Route path="users" element={<AuthRoute component={UserManagementPage} adminOnly subPage="users" />} />
        <Route path="users/employees" element={<AuthRoute component={UserManagementPage} adminOnly subPage="employees" />} />
        <Route path="users/roles" element={<AuthRoute component={UserManagementPage} adminOnly subPage="roles" />} />
        <Route path="users/activity-logs" element={<AuthRoute component={UserManagementPage} adminOnly subPage="activity-logs" />} />

        {/* Laundry Operations */}
        <Route path="laundry" element={<Navigate to="/laundry/orders" replace />} />
        <Route path="laundry/new" element={<AuthRoute component={LaundryPage} subPage="laundry-new" />} />
        <Route path="laundry/orders" element={<AuthRoute component={LaundryPage} subPage="laundry-orders" />} />
        <Route path="laundry/history" element={<AuthRoute component={LaundryPage} subPage="laundry-history" />} />
        <Route path="laundry/services" element={<AuthRoute component={LaundryPage} adminOnly subPage="laundry-services" />} />

        {/* Water Refilling */}
        <Route path="water" element={<Navigate to="/water/new" replace />} />
        <Route path="water/new" element={<AuthRoute component={WaterRefillingPage} subPage="water-new" />} />
        <Route path="water/history" element={<AuthRoute component={WaterRefillingPage} subPage="water-history" />} />
        <Route path="water/products" element={<AuthRoute component={WaterRefillingPage} adminOnly subPage="water-products" />} />

        {/* Payments */}
        <Route path="payments" element={<Navigate to="/payments/new" replace />} />
        <Route path="payments/new" element={<AuthRoute component={PaymentPage} subPage="payments-new" />} />
        <Route path="payments/history" element={<AuthRoute component={PaymentPage} subPage="payments-history" />} />

        {/* Inventory */}
        <Route path="inventory" element={<Navigate to="/inventory/products" replace />} />
        <Route path="inventory/products" element={<AuthRoute component={InventoryPage} subPage="inventory-products" />} />
        <Route path="inventory/items" element={<AuthRoute component={InventoryPage} subPage="inventory-items" />} />
        <Route path="inventory/stock" element={<AuthRoute component={InventoryPage} subPage="inventory-stock" />} />
        <Route path="inventory/suppliers" element={<AuthRoute component={InventoryPage} subPage="inventory-suppliers" />} />
        <Route path="inventory/purchase" element={<AuthRoute component={InventoryPage} subPage="inventory-purchase" />} />

        {/* Finance */}
        <Route path="finance" element={<ProtectedRoute adminOnly><Navigate to="/finance/reports" replace /></ProtectedRoute>} />
        <Route path="finance/expenses" element={<AuthRoute component={FinancePage} adminOnly subPage="finance-expenses" />} />
        <Route path="finance/reports" element={<AuthRoute component={FinancePage} adminOnly subPage="finance-reports" />} />

        {/* Analytics */}
        <Route path="analytics" element={<AuthRoute component={AnalyticsPage} adminOnly />} />

        {/* Profile / Settings */}
        <Route path="profile" element={<AuthRoute component={ProfilePage} subPage="profile" />} />
        <Route path="change-password" element={<AuthRoute component={ProfilePage} subPage="change-password" />} />
        <Route path="settings" element={<AuthRoute component={ProfilePage} subPage="settings" />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
