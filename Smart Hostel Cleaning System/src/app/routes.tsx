import { createBrowserRouter, Link, Navigate, isRouteErrorResponse, useRouteError } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Route metadata. Read it in Layout with useMatches() to set the page title / breadcrumbs. */
export interface RouteHandle {
  title: string;
}

/**
 * Lazy-load a named export. Each page becomes its own chunk, so the first load
 * only ships Layout + the page you open (the graph and analytics code stay out
 * of the initial bundle).
 */
const page = <T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) => async () => ({ Component: (await load())[name] as React.ComponentType });

/* ------------------------------------------------------------------ */
/* Error + 404 screens                                                  */
/* ------------------------------------------------------------------ */

function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';

  return (
    <div role="alert" className="min-h-[60vh] grid place-items-center p-6">
      <div className="glass max-w-md w-full p-6 space-y-4 animate-scale-in shadow-soft">
        <h1>Couldn't load this page</h1>
        <p className="text-sm text-muted-foreground break-words">{message}</p>
        <div className="flex gap-2">
          <button onClick={() => location.reload()} className="focus-ring px-4 py-2 rounded-md bg-primary text-primary-foreground">
            Reload
          </button>
          <Link to="/" className="focus-ring px-4 py-2 rounded-md bg-secondary text-secondary-foreground">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-6 text-center space-y-3">
      <div>
        <p className="font-score text-6xl text-gradient">404</p>
        <h1>Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2">That route doesn't exist in the hostel system.</p>
        <Link to="/" className="focus-ring inline-block mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

/** Shown while a lazy page chunk is downloading. */
function PageFallback() {
  return (
    <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading page">
      <div className="skeleton h-8 w-56" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Router                                                               */
/* ------------------------------------------------------------------ */

export const router = createBrowserRouter([
  {
    path: '/auth',
    lazy: page(() => import('./components/AuthPage'), 'AuthPage'),
    errorElement: <RouteError />,
    HydrateFallback: PageFallback,
    handle: { title: 'Sign in' } satisfies RouteHandle,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    HydrateFallback: PageFallback,
    children: [
      {
        index: true,
        lazy: page(() => import('./components/Dashboard'), 'Dashboard'),
        handle: { title: 'Dashboard' } satisfies RouteHandle,
      },
      {
        path: 'graph',
        lazy: page(() => import('./components/RoomGraph'), 'RoomGraph'),
        handle: { title: 'Room graph' } satisfies RouteHandle,
      },
      {
        path: 'request',
        lazy: page(() => import('./components/StudentRequest'), 'StudentRequest'),
        handle: { title: 'Request cleaning' } satisfies RouteHandle,
      },
      {
        path: 'staff',
        lazy: page(() => import('./components/StaffView'), 'StaffView'),
        handle: { title: 'Staff' } satisfies RouteHandle,
      },
      {
        path: 'analytics',
        lazy: page(() => import('./components/Analytics'), 'Analytics'),
        handle: { title: 'Analytics' } satisfies RouteHandle,
      },
      {
        path: 'guide',
        lazy: page(() => import('./components/QuickGuide'), 'QuickGuide'),
        handle: { title: 'Quick guide' } satisfies RouteHandle,
      },
      // Unknown URL while signed in: show a real 404 inside the layout
      { path: '*', Component: NotFound, handle: { title: 'Not found' } satisfies RouteHandle },
    ],
  },
  // Unknown URL outside the layout (e.g. /auth/xyz): send people home
  { path: '*', element: <Navigate to="/" replace /> },
]);
