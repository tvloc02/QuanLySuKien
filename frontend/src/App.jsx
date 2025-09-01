import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Store
import { store } from './store/store';

// Components
import Layout from './components/common/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ProfilePage from './pages/ProfilePage';
import CertificatesPage from './pages/CertificatesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';

// Utils
import { initializeI18n } from './utils/i18n';

// Styles
import './styles/globals.css';
import './styles/antd-custom.css';

// Configure dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');

// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 1,
        },
    },
});

// Initialize i18n
initializeI18n();

function App() {
    const { user, loading, initializeAuth } = useAuth();
    const { connectSocket, disconnectSocket } = useSocket();

    useEffect(() => {
        // Initialize authentication on app start
        initializeAuth();
    }, [initializeAuth]);

    useEffect(() => {
        // Connect to socket when user is authenticated
        if (user) {
            connectSocket(user.id);
        } else {
            disconnectSocket();
        }

        return () => {
            disconnectSocket();
        };
    }, [user, connectSocket, disconnectSocket]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <HelmetProvider>
                <Provider store={store}>
                    <QueryClientProvider client={queryClient}>
                        <ConfigProvider
                            theme={{
                                algorithm: theme.defaultAlgorithm,
                                token: {
                                    colorPrimary: '#1890ff',
                                    colorSuccess: '#52c41a',
                                    colorWarning: '#faad14',
                                    colorError: '#f5222d',
                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    borderRadius: 8,
                                },
                                components: {
                                    Button: {
                                        borderRadius: 8,
                                        controlHeight: 40,
                                    },
                                    Input: {
                                        borderRadius: 8,
                                        controlHeight: 40,
                                    },
                                    Card: {
                                        borderRadius: 12,
                                    },
                                    Modal: {
                                        borderRadius: 12,
                                    },
                                },
                            }}
                        >
                            <Router>
                                <div className="App">
                                    <Routes>
                                        {/* Public Routes */}
                                        <Route path="/" element={<Layout />}>
                                            <Route index element={<HomePage />} />
                                            <Route path="events" element={<EventsPage />} />
                                            <Route path="events/:slug" element={<EventDetailPage />} />
                                        </Route>

                                        {/* Auth Routes */}
                                        <Route path="/login" element={
                                            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
                                        } />
                                        <Route path="/register" element={
                                            user ? <Navigate to="/dashboard" replace /> : <RegisterPage />
                                        } />
                                        <Route path="/forgot-password" element={
                                            user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />
                                        } />
                                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                                        <Route path="/verify-email" element={<VerifyEmailPage />} />

                                        {/* Protected Routes */}
                                        <Route path="/dashboard" element={
                                            <ProtectedRoute>
                                                <Layout>
                                                    <DashboardPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        <Route path="/profile" element={
                                            <ProtectedRoute>
                                                <Layout>
                                                    <ProfilePage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        <Route path="/certificates" element={
                                            <ProtectedRoute>
                                                <Layout>
                                                    <CertificatesPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        <Route path="/notifications" element={
                                            <ProtectedRoute>
                                                <Layout>
                                                    <NotificationsPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        <Route path="/settings" element={
                                            <ProtectedRoute>
                                                <Layout>
                                                    <SettingsPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        {/* Admin Routes */}
                                        <Route path="/admin/*" element={
                                            <ProtectedRoute roles={['admin', 'moderator']}>
                                                <Layout>
                                                    <AdminPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        <Route path="/reports" element={
                                            <ProtectedRoute roles={['admin', 'moderator', 'organizer']}>
                                                <Layout>
                                                    <ReportsPage />
                                                </Layout>
                                            </ProtectedRoute>
                                        } />

                                        {/* Error Routes */}
                                        <Route path="/error" element={<ErrorPage />} />
                                        <Route path="*" element={<NotFoundPage />} />
                                    </Routes>

                                    {/* Global Toast Container */}
                                    <Toaster
                                        position="top-right"
                                        toastOptions={{
                                            duration: 4000,
                                            style: {
                                                background: '#fff',
                                                color: '#333',
                                                borderRadius: '8px',
                                                border: '1px solid #e0e0e0',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                            },
                                            success: {
                                                iconTheme: {
                                                    primary: '#52c41a',
                                                    secondary: '#fff',
                                                },
                                            },
                                            error: {
                                                iconTheme: {
                                                    primary: '#f5222d',
                                                    secondary: '#fff',
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </Router>
                        </ConfigProvider>
                    </QueryClientProvider>
                </Provider>
            </HelmetProvider>
        </ErrorBoundary>
    );
}

export default App;