import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarClock, Users, PieChart, Truck, Settings, Warehouse, Bell
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const navItems = [
  { to: '/', label: '月台排期', icon: CalendarClock },
  { to: '/waitlist', label: '候补补位', icon: Users },
  { to: '/quota', label: '共享额度', icon: PieChart },
  { to: '/dispatch', label: '装卸工派工', icon: Truck },
  { to: '/settings', label: '系统设置', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const notifications = useAppStore(s => s.notifications);
  const dismissNotification = useAppStore(s => s.dismissNotification);

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-500 text-white flex flex-col shadow-xl">
        <div className="px-6 py-5 border-b border-primary-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">月台预约</h1>
              <p className="text-xs text-primary-200">物流园区调度中心</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white border-l-4 border-accent-500 pl-5'
                    : 'text-primary-100 hover:bg-primary-600 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-primary-400">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-300 flex items-center justify-center">
              <span className="text-sm font-bold">管</span>
            </div>
            <div>
              <p className="text-sm font-medium">园区管理员</p>
              <p className="text-xs text-primary-200">admin@park.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
          <h2 className="font-display font-semibold text-lg text-neutral-800">
            {navItems.find(n => n.to === location.pathname)?.label || '月台排期看板'}
          </h2>
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-neutral-100 transition-colors relative">
              <Bell className="w-5 h-5 text-neutral-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`animate-slide-up rounded-lg shadow-xl p-4 text-white ${
              n.type === 'success' ? 'bg-success' :
              n.type === 'error' ? 'bg-danger' :
              n.type === 'warning' ? 'bg-warning text-neutral-800' :
              'bg-primary-500'
            }`}
            onClick={() => dismissNotification(n.id)}
          >
            <p className="font-semibold text-sm">{n.title}</p>
            {n.message && <p className="text-xs mt-1 opacity-90">{n.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
