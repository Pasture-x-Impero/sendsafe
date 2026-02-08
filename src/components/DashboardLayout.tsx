import { NavLink, Outlet } from "react-router-dom";
import { Shield, Users, FileText, ShieldCheck, Send, Settings } from "lucide-react";

const navItems = [
  { to: "/dashboard/leads", label: "Leads", icon: Users },
  { to: "/dashboard/drafts", label: "Drafts", icon: FileText },
  { to: "/dashboard/approval", label: "Approval Queue", icon: ShieldCheck },
  { to: "/dashboard/sent", label: "Sent", icon: Send },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-heading text-lg font-bold text-foreground">DraftGuard</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
