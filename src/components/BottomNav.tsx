import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

function Tab({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `nav__tab ${isActive ? 'is-active' : ''}`} aria-label={label}>
      <Icon name={icon} />
      <span className="nav__label">{label}</span>
    </NavLink>
  );
}

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="nav" aria-label="Main">
      <Tab to="/" icon="home" label="Home" />
      <Tab to="/calendar" icon="calendar" label="Trends" />
      <button type="button" className="nav__add" onClick={onAdd} aria-label="Add entry">
        <Icon name="plus" size={26} strokeWidth={2.5} />
      </button>
      <Tab to="/log" icon="list" label="Log" />
      <Tab to="/manage" icon="sliders" label="Manage" />
    </nav>
  );
}
