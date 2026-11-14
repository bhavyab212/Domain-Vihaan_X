import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from './States';

export function NotFoundView() {
  return (
    <EmptyState
      icon={<Compass className="h-7 w-7" aria-hidden />}
      title="Page not found"
      description="That route does not exist. Use the navigation to open one of the five security views."
      action={
        <Link to="/" className="text-sm font-medium text-signal underline underline-offset-2">
          Back to Command Center
        </Link>
      }
    />
  );
}
