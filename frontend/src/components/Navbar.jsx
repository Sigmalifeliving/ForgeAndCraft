import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Settings, Box, Mic, Crown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isToolboxActive = location.pathname === '/dashboard' || location.pathname === '/toolbox';

  return (
    <>
      <header className="forge-header">
        {/* Left: Brand Logo */}
        <div className="forge-header-left">
          <Link to="/" className="forge-brand">
            <div className="forge-brand-icon">
              {/* Modern geometric hammer & crystal glyph */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h7v7H4z" fill="#3b82f6" />
                <path d="M13 4h7v7h-7z" fill="#60a5fa" />
                <path d="M4 13h7v7H4z" fill="#2563eb" />
                <path d="M13 13l7 7m0-7l-7 7" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="forge-brand-text">
              Forge<span className="forge-brand-accent">Craft</span>
            </span>
          </Link>
        </div>

        {/* Center: Floating Capsule Navigation Pill */}
        <nav className="forge-nav-pill">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `forge-pill-item ${isActive ? 'active' : ''}`}
          >
            Home
          </NavLink>

          <NavLink
            to="/dashboard"
            className={`forge-pill-item ${isToolboxActive ? 'active' : ''}`}
          >
            Toolbox
          </NavLink>

          <NavLink
            to="/assets"
            className={({ isActive }) => `forge-pill-item ${isActive ? 'active' : ''}`}
          >
            Asset Catalog
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `forge-pill-item ${isActive ? 'active' : ''}`}
          >
            Projects
          </NavLink>
        </nav>

        {/* Right: Upgrade Plan + User Profile */}
        <div className="forge-header-right">
          <button
            type="button"
            className="forge-btn-upgrade"
            onClick={() => setUpgradeModalOpen(true)}
          >
            <Crown size={15} className="upgrade-icon" />
            <span>Upgrade Plan</span>
          </button>

          {user ? (
            <div className="forge-profile-menu-container" ref={dropdownRef}>
              <button
                type="button"
                className="forge-avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                title={user.email}
              >
                <div className="forge-avatar-circle">
                  {user.username ? user.username[0].toUpperCase() : 'U'}
                </div>
              </button>

              {dropdownOpen && (
                <div className="forge-profile-dropdown">
                  <div className="forge-dropdown-header">
                    <span className="forge-dropdown-name">{user.username}</span>
                    <span className="forge-dropdown-email">{user.email || 'Creator Account'}</span>
                  </div>

                  <div className="forge-dropdown-divider" />

                  <div className="forge-dropdown-links">
                    <Link
                      to="/create/3d"
                      className="forge-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Box size={16} />
                      <span>3D Asset Studio</span>
                    </Link>

                    <Link
                      to="/create/voice"
                      className="forge-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Mic size={16} />
                      <span>Sound & Voice Studio</span>
                    </Link>

                    <Link
                      to="/profile"
                      className="forge-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="forge-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="forge-dropdown-divider" />

                  <button
                    type="button"
                    className="forge-dropdown-item logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="forge-auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Upgrade Plan Modal */}
      {upgradeModalOpen && (
        <div className="toolbox-modal-overlay" onClick={() => setUpgradeModalOpen(false)}>
          <div className="toolbox-modal-content forge-upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upgrade-header">
              <div className="upgrade-crown-icon">
                <Crown size={28} />
              </div>
              <h2>Upgrade to ForgeCraft Pro</h2>
              <p>Unlock unlimited 3D mesh exports, 4K PBR textures, and priority GPU rendering.</p>
            </div>

            <div className="upgrade-tiers-grid">
              <div className="upgrade-tier-card">
                <h3>Starter</h3>
                <div className="tier-price">$0 <span>/ month</span></div>
                <ul>
                  <li>✓ 10 3D Models / month</li>
                  <li>✓ Standard Roblox & Minecraft export</li>
                  <li>✓ Community Luau templates</li>
                </ul>
                <button className="btn btn-secondary full-width" disabled>Current Plan</button>
              </div>

              <div className="upgrade-tier-card pro featured">
                <div className="tier-badge">RECOMMENDED</div>
                <h3>Pro Creator</h3>
                <div className="tier-price">$19 <span>/ month</span></div>
                <ul>
                  <li>✓ Unlimited AI 3D Mesh Generation</li>
                  <li>✓ High-poly & Rigged Mesh Exports</li>
                  <li>✓ Unlimited Roblox GUI & Luau Scripts</li>
                  <li>✓ Custom SFX & Voice Synthesis</li>
                  <li>✓ Priority Cloud GPU Queues</li>
                </ul>
                <button
                  className="btn btn-primary full-width"
                  onClick={() => {
                    alert('Pro checkout initiated! Thank you for supporting ForgeCraft.');
                    setUpgradeModalOpen(false);
                  }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>

            <button className="btn-text close-upgrade" onClick={() => setUpgradeModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}