import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RoomGraph } from './components/RoomGraph';
import { StudentRequest } from './components/StudentRequest';
import { StaffView } from './components/StaffView';
import { Analytics } from './components/Analytics';
import { QuickGuide } from './components/QuickGuide';
import { AuthPage } from './components/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/auth',
    Component: AuthPage
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        Component: Dashboard
      },
      {
        path: 'graph',
        Component: RoomGraph
      },
      {
        path: 'request',
        Component: StudentRequest
      },
      {
        path: 'staff',
        Component: StaffView
      },
      {
        path: 'analytics',
        Component: Analytics
      },
      {
        path: 'guide',
        Component: QuickGuide
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);