import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './navigation';

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icons/shield.svg" alt="" className="h-8 w-8 rounded-lg" />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-fg">Domain-Vihaan_X</p>
        <p className="text-2xs uppercase text-fg-muted">Security Intelligence</p>
      </div>
    </div>
  );
}

/** Persistent left navigation (desktop). Narrow screens use <CompactNav /> instead. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-ink-900 lg:flex">
      <div className="flex h-14 items-center border-b border-line px-4">
        <BrandMark />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 p-2.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-signal/10 font-medium text-fg' : 'text-fg-muted hover:bg-ink-800 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-signal transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-signal' : 'text-fg-faint group-hover:text-fg-soft')} aria-hidden />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-3 text-2xs leading-relaxed text-fg-faint">
        <p>VIHAAN X Hackathon</p>
        <p>Frontend shell v0.1.0 (TSK-004)</p>
      </div>
    </aside>
  );
}

/** Horizontal nav for < lg viewports so the five views stay reachable. */
export function CompactNav() {
  return (
    <nav aria-label="Primary" className="flex gap-1 overflow-x-auto border-b border-line bg-ink-900 px-2 py-1.5 lg:hidden">
      {NAV_ITEMS.map(({ to, short, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors',
              isActive ? 'bg-signal/10 font-medium text-signal' : 'text-fg-muted hover:bg-ink-800 hover:text-fg',
            )
          }
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {short}
        </NavLink>
      ))}
    </nav>
  );
}
