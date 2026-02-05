import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from 'sonner';

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddClient = lazy(() => import("./pages/AddClient"));
const Clients = lazy(() => import("./pages/Clients"));
const CreateReminder = lazy(() => import("./pages/CreateReminder"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

// Global Loading Spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
        {/* Toaster must be inside Router but outside Suspense for global availability */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'inherit',
            },
          }}
        />
        
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/add-client" element={<ProtectedRoute><AddClient /></ProtectedRoute>} />
            <Route path="/create-reminder" element={<ProtectedRoute><CreateReminder /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;