import { Outlet } from 'react-router-dom';
import { DataOriginBanner, ResetFeedback } from './Banners';
import { CommandBar } from './CommandBar';
import { CompactNav, Sidebar } from './Sidebar';

/** Application frame: sidebar + command bar + scrolling main content. No bottom dock. */
export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-950 text-fg">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-signal px-3 py-2 text-sm font-medium text-ink-950 focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CommandBar />
        <CompactNav />
        <DataOriginBanner />
        <ResetFeedback />
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 outline-none lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
