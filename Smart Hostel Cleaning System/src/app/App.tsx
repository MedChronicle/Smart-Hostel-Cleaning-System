import { RouterProvider } from 'react-router';
import { router } from './routes';
import { HostelProvider } from './context/HostelContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <HostelProvider>
        <RouterProvider router={router} />
        <Toaster />
      </HostelProvider>
    </AuthProvider>
  );
}