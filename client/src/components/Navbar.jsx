import { NavLink } from 'react-router-dom';
import { Bug, LayoutDashboard, List, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar__brand">
        <Bug size={22} />
        ProPR
      </NavLink>
      <div className="navbar__links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
        >
          <LayoutDashboard size={16} style={{ verticalAlign: '-2px' }} /> Dashboard
        </NavLink>
        <NavLink
          to="/bugs"
          className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
        >
          <List size={16} style={{ verticalAlign: '-2px' }} /> Bugs
        </NavLink>
        {isAuthenticated ? (
          <button type="button" className="btn btn--secondary" onClick={logout}>
            Log out
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
          >
            <LogIn size={16} style={{ verticalAlign: '-2px' }} /> Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}
