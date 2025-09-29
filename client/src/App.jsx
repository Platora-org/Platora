import { useState, Suspense, lazy } from 'react';
import './App.css';
import { appRoutes } from './routes/AppRoutes';
import DarkModeToggle from './components/DarkModeToggle';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProtectedRoute from './routes/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './utils/AuthContext';

const Header = lazy(() => import('./components/Header'));

function App() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // find the current route
  const currentRoute =
    appRoutes.find(
      (route) =>
        route.path === location.pathname ||
        (route.path?.includes('*') &&
          location.pathname.startsWith(route.path.replace('/*', '')))
    ) || appRoutes.find((route) => route.path === '*');

  const hideHeader = currentRoute?.hideHeader;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-gray-800">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-12 h-12 border-4 border-emerald-500 border-dashed rounded-full animate-spin"></div>
            </div>
          }
        >
          {!hideHeader && <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />}

          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {appRoutes.map((route) => {
                const RouteElement = route.component;

                if (route.children) {
                  return (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          {route.requiresAuth ? (
                            <ProtectedRoute allowedRoles={route.allowedRoles}>
                              <RouteElement />
                            </ProtectedRoute>
                          ) : (
                            <RouteElement />
                          )}
                        </Suspense>
                      }
                    >
                      {route.children.map((child) => {
                        const ChildElement = child.component;
                        return (
                          <Route
                            key={child.path}
                            path={child.path}
                            element={
                              <Suspense fallback={<div>Loading...</div>}>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <ChildElement />
                                </motion.div>
                              </Suspense>
                            }
                          />
                        );
                      })}
                    </Route>
                  );
                }

                return (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {route.requiresAuth ? (
                            <ProtectedRoute allowedRoles={route.allowedRoles}>
                              <RouteElement />
                            </ProtectedRoute>
                          ) : (
                            <RouteElement />
                          )}
                        </motion.div>
                      </Suspense>
                    }
                  />
                );
              })}
            </Routes>
          </AnimatePresence>

          <DarkModeToggle />
          <ToastContainer
            position="top-right"
            autoClose={1000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            toastClassName="custom-toast"
            bodyClassName="custom-toast-body"
            progressClassName="custom-toast-progress"
          />
        </Suspense>
      </div>
    </AuthProvider>
  );
}

export default App;


