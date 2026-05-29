import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiCalendar, FiLogOut, FiUser, FiActivity } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) => `
    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
    ${isActive(path) 
      ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}
  `;

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2 text-zinc-100 hover:opacity-90">
              <FiActivity className="h-6 w-6 text-zinc-100" />
              <span className="text-lg font-semibold tracking-wider uppercase font-mono">AURA CLINIC</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'patient' ? (
                  <>
                    <Link to="/doctors" className={linkClass('/doctors')}>
                      <span>Doctors</span>
                    </Link>
                    <Link to="/appointments" className={linkClass('/appointments')}>
                      <FiCalendar className="h-4 w-4" />
                      <span>My Bookings</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard" className={linkClass('/dashboard')}>
                      <span>Console Dashboard</span>
                    </Link>
                  </>
                )}

                <div className="h-4 w-px bg-zinc-800" />

                <div className="flex items-center space-x-3 text-zinc-400">
                  <FiUser className="h-4 w-4 text-zinc-500" />
                  <span className="text-xs text-zinc-300 font-mono hidden md:inline">
                    {user.email} ({user.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-zinc-800 rounded text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200"
                    title="Log Out"
                  >
                    <FiLogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-all"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
