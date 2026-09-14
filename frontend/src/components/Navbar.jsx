import { Bell, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-title">AI Creative Platform</span>
      </div>
      <div className="navbar-right">
        <button className="btn-icon" aria-label="Notifications">
          <Bell size={18} />
        </button>
        {user ? (
          <>
            <span className="navbar-user">{user.username}</span>
            <div className="avatar" title={user.email}>
              {user.username[0].toUpperCase()}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={14} />
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}