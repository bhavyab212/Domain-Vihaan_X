import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './providers';
import { AppRoutes } from './router';
import { ROUTER_FUTURE } from './routerFuture';

/** Root application container (browser router). Tests render <AppProviders><MemoryRouter><AppRoutes/> instead. */
export function App() {
  return (
    <AppProviders>
      <BrowserRouter future={ROUTER_FUTURE}>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
