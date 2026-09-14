import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  Mic,
  FolderOpen,
  Clock,
  Settings,
  User,
  Info,
  Home,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const createLinks = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

const workspaceLinks = [
  { to: '/create/3d', label: '3D Generator', icon: Box },
  { to: '/create/voice', label: 'Voice Generator', icon: Mic },
  { to: '/assets', label: 'My Assets', icon: FolderOpen },
  { to: '/history', label: 'History', icon: Clock },
];

const bottomLinks = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/about', label: 'About', icon: Info },
];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''}`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { isAuthenticated } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">FC</div>
        <span className="logo-text">ForgeCraft</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <SidebarLink to="/" label="Home" icon={Home} />
        </div>

        {isAuthenticated && (
          <>
            <div className="sidebar-section">
              <span className="sidebar-section-title">Workspace</span>
              {[...createLinks, ...workspaceLinks].map((link) => (
                <SidebarLink key={link.to} {...link} />
              ))}
            </div>
            <div className="sidebar-section">
              <span className="sidebar-section-title">Account</span>
              {bottomLinks.slice(0, 2).map((link) => (
                <SidebarLink key={link.to} {...link} />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        {isAuthenticated ? (
          <SidebarLink to="/about" label="About" icon={Info} />
        ) : (
          <>
            <SidebarLink to="/login" label="Sign In" icon={LogIn} />
            <SidebarLink to="/register" label="Create Account" icon={UserPlus} />
          </>
        )}
      </div>
    </aside>
  );
}