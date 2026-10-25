import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import History from './pages/History';
import Goals from './pages/Goals';
import Journal from './pages/Journal';
import Analytics from './pages/Analytics';
import Gallery from './pages/Gallery';
import AdminUsers from './pages/AdminUsers';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route element={<AppShell />}>
                            <Route index element={<Dashboard />} />
                            <Route path="plans" element={<Plans />} />
                            <Route path="history" element={<History />} />
                            <Route path="goals" element={<Goals />} />
                            <Route path="journal" element={<Journal />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route path="gallery" element={<Gallery />} />
                            <Route path="profile" element={<Profile />} />
                            <Route path="admin" element={<AdminUsers />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
