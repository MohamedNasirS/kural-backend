import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ActivityLogProvider } from '@/contexts/ActivityLogContext';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import KuralFullLogo from '@/assets/images/Kural_full.png';
import KuralHalfLogo from '@/assets/images/Kural_half.png';
import PartyLogo from '@/assets/images/Electora_AI.png';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  UserCog,
  LogOut,
  Home,
  UserCircle,
  Activity,
  FileText,
  Grid3x3,
  GitCompare,
  TrendingUp,
  ScrollText,
  Menu,
  Map,
  MapPin,
  Target,
  DollarSign,
  Share2,
  Shield,
  MessageSquare,
  Vote,
  Award,
  Database,
  ClipboardList,
  Layers,
  Smartphone,
  Inbox,
  Bell,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleLabels = {
  L0: 'Super Admin',
  L1: 'ACIM Dashboard',
  L2: 'ACI Dashboard',
  L9: 'War Room Command',
  MLA: 'MLA War Room',
};

const dashboardTitles = {
  L0: 'System Dashboard',
  L1: 'ACIM Dashboard',
  L2: 'ACI Dashboard',
  L9: 'War Room Command',
  MLA: 'MLA War Room',
};

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Extract selected AC from URL for L1 dynamic sidebar
  const getSelectedAC = (): number | null => {
    const match = location.pathname.match(/\/l1\/ac\/(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const selectedAC = getSelectedAC();

  const getMenuItems = (): { icon: any; label: string; path: string }[] => {
    switch (user?.role) {
      case 'L0':
        return [
          { icon: LayoutDashboard, label: 'System Dashboard', path: '/l0/dashboard' },
          { icon: Users, label: 'User Management', path: '/l0/users' },
          { icon: Users, label: 'Voter Manager', path: '/l0/voters' },
          { icon: Home, label: 'Family Manager', path: '/l0/families' },
          { icon: Database, label: 'Voter Field Manager', path: '/l0/voter-fields' },
          { icon: Layers, label: 'Master Data', path: '/l0/master-data' },
          { icon: FileText, label: 'Survey Forms', path: '/l0/surveys' },
          { icon: ClipboardList, label: 'Survey Responses', path: '/l0/survey-responses' },
          { icon: Smartphone, label: 'Mobile App Question', path: '/l0/mobile-app-questions' },
          { icon: Inbox, label: 'Mobile App Responses', path: '/l0/mobile-app-responses' },
          { icon: Bell, label: 'Notifications', path: '/shared/notifications' },
          { icon: Home, label: 'Booth Management', path: '/shared/booth-management' },
          { icon: UserCircle, label: 'Booth Agent Management', path: '/shared/booth-agent-management' },
          { icon: ScrollText, label: 'Activity Logs', path: '/l0/activity-logs' },
          { icon: Settings, label: 'Settings', path: '/l0/settings' },
        ];
      case 'L1': {
        // L1 Dynamic Sidebar - AC-specific links appear only after selecting an AC
        const baseItems = [
          { icon: Map, label: 'Constituencies', path: '/l1/constituencies' },
          { icon: BarChart3, label: 'Global Analytics', path: '/l1/analytics' },
          { icon: Grid3x3, label: 'AC Overview', path: '/l1/ac-analytics' },
          { icon: GitCompare, label: 'AC Comparison', path: '/l1/ac-comparison' },
        ];

        // Global data management items (always visible with AC selector inside)
        const dataManagementItems = [
          { icon: Users, label: 'Voter Manager', path: '/l1/voters' },
          { icon: Home, label: 'Family Manager', path: '/l1/families' },
        ];

        // AC-specific items (only show when an AC is selected)
        const acSpecificItems = selectedAC ? [
          { icon: LayoutDashboard, label: `AC ${selectedAC} Dashboard`, path: `/l1/ac/${selectedAC}` },
          { icon: FileText, label: 'Reports', path: `/l1/ac/${selectedAC}/reports` },
        ] : [];

        // Management items (always visible)
        const managementItems = [
          { icon: FileText, label: 'Survey Forms', path: '/l1/surveys' },
          { icon: Activity, label: 'Survey Manager', path: '/l1/survey-manager' },
          { icon: MapPin, label: 'Live Booth Updates', path: '/l1/live-booth-updates' },
          { icon: UserCog, label: 'User Management', path: '/l1/moderators' },
          { icon: Bell, label: 'Notifications', path: '/shared/notifications' },
          { icon: Home, label: 'Booth Management', path: '/shared/booth-management' },
          { icon: UserCircle, label: 'Booth Agent Management', path: '/shared/booth-agent-management' },
          { icon: TrendingUp, label: 'Advanced Analytics', path: '/l1/advanced-analytics' },
          { icon: ScrollText, label: 'Activity Logs', path: '/l1/activity-logs' },
        ];

        return [...baseItems, ...dataManagementItems, ...acSpecificItems, ...managementItems];
      }
      case 'L2':
        return [
          { icon: LayoutDashboard, label: 'My Dashboard', path: '/l2/dashboard' },
          { icon: Users, label: 'Voter Manager', path: '/l2/voters' },
          { icon: Home, label: 'Family Manager', path: '/l2/families' },
          { icon: FileText, label: 'Survey Forms', path: '/l2/survey-forms' },
          { icon: FileText, label: 'Survey Manager', path: '/l2/surveys' },
          { icon: Bell, label: 'Notifications', path: '/shared/notifications' },
          { icon: Home, label: 'Booth Management', path: '/shared/booth-management' },
          { icon: UserCircle, label: 'Booth Agent Management', path: '/shared/booth-agent-management' },
          { icon: Activity, label: 'Live Booth Updates', path: '/l2/live-updates' },
          { icon: BarChart3, label: 'Reports', path: '/l2/reports' },
          { icon: ScrollText, label: 'Activity Logs', path: '/l2/activity-logs' },
        ];
      case 'L9':
        return [
          { icon: LayoutDashboard, label: 'War Room Overview', path: '/l9/war-room' },
          { icon: Map, label: 'Geographic Intelligence', path: '/l9/geographic' },
          { icon: TrendingUp, label: 'Predictive Analytics', path: '/l9/predictive' },
          { icon: Target, label: 'Micro-Targeting', path: '/l9/micro-targeting' },
          { icon: DollarSign, label: 'Financial Intelligence', path: '/l9/financial' },
          { icon: Share2, label: 'Digital Analytics', path: '/l9/digital' },
          { icon: Users, label: 'Team Management', path: '/l9/team' },
          { icon: Shield, label: 'Opposition Intelligence', path: '/l9/opposition' },
          { icon: MessageSquare, label: 'Communication Analytics', path: '/l9/communication' },
          { icon: Vote, label: 'Election Day Ops', path: '/l9/election-day' },
          { icon: FileText, label: 'Survey Intelligence', path: '/l9/surveys' },
          { icon: Award, label: 'Success Metrics', path: '/l9/success' },
        ];
      case 'MLA':
        return [
          { icon: LayoutDashboard, label: 'AC Overview', path: '/mla/dashboard' },
          { icon: MapPin, label: 'All Booths', path: '/mla/booths' },
          { icon: Target, label: 'Priority Targets', path: '/mla/priority-targets' },
          { icon: TrendingUp, label: 'Historical Trends', path: '/mla/trends' },
          { icon: BarChart3, label: 'Competitor Analysis', path: '/mla/competitors' },
          { icon: Share2, label: 'Social Media', path: '/mla/social-media' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  if (!user) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex items-center justify-center transition-all duration-200 p-4 group-data-[collapsible=icon]:p-2">
          <img
            src={KuralFullLogo}
            alt="Kural AI"
            className="h-10 w-auto object-contain group-data-[collapsible=icon]:hidden"
          />
          <img
            src={KuralHalfLogo}
            alt="Kural AI"
            className="h-8 w-8 min-w-8 object-contain flex-shrink-0 hidden group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-2 py-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  onClick={() => navigate(item.path)}
                  isActive={isActive}
                  tooltip={item.label}
                  className="transition-all duration-200 ease-in-out"
                >
                  <item.icon className="h-5 w-5 sidebar-icon" />
                  <span className="truncate">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-0">
        <div className="p-3 space-y-2 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:space-y-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          {/* User info with party logo */}
          <div className="p-3 bg-sidebar-accent rounded-lg group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            {/* Expanded view */}
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <img
                src={PartyLogo}
                alt="Party"
                className="h-10 w-10 rounded-full object-cover flex-shrink-0 bg-white p-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{roleLabels[user?.role || 'L0']}</p>
                {user?.assignedAC && (
                  <p className="text-xs text-sidebar-foreground/70 truncate">
                    AC {user.assignedAC}
                  </p>
                )}
              </div>
            </div>
            {/* Collapsed view - party logo only */}
            <img
              src={PartyLogo}
              alt="Party"
              className="h-7 w-7 min-w-7 rounded-full object-cover flex-shrink-0 bg-white p-0.5 hidden group-data-[collapsible=icon]:block"
            />
          </div>

          {/* Logout button */}
          <SidebarMenuButton
            onClick={handleLogout}
            tooltip="Sign Out"
            className="transition-all duration-200 ease-in-out text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <NotificationProvider userId={user.id} userRole={user.role}>
      <ActivityLogProvider>
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Header with hamburger and notifications */}
              <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
                <SidebarTrigger className="hover:bg-accent rounded-md p-1.5 h-8 w-8 flex items-center justify-center">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationCenter />
                </div>
              </header>
              {/* Main content area */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </ActivityLogProvider>
    </NotificationProvider>
  );
};
