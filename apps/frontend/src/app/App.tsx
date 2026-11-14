import React from 'react';
import { AppProviders } from './providers';
import { Router } from './router';

/**
 * Root Application Container
 * Managed exclusively by Developer B
 */
export function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  );
}
