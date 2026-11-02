import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { toast } from 'sonner';
import { router } from './routes';
import { HostelProvider } from './context/HostelContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

/**
 * Tells staff when the connection drops. State is saved locally, so work can
 * continue offline, but they should know it hasn't synced anywhere.
 */
function NetworkStatus() {
  useEffect(() => {
    const id = 'network-status';
    const offline = () =>
      toast.warning('You are offline', {
        id,
        duration: Infinity,
        description: 'Changes are saved on this device.',
      });
    const online = () => toast.success('Back online', { id, duration: 2500 });

    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <HostelProvider>
        <RouterProvider router={router} />
        <NetworkStatus />
        <Toaster position="top-right" closeButton richColors visibleToasts={4} />
      </HostelProvider>
    </AuthProvider>
  );
}
