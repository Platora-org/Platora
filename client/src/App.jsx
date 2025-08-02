import { useState, Suspense, lazy, useEffect } from 'react';
import './App.css';
import { appRoutes } from './routes/AppRoutes';
import DarkModeToggle from './components/DarkModeToggle';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
const Header = lazy(() => import('./components/Header'));
import ProtectedRoute from './routes/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import { useAuth } from './utils/AuthContext';

function App() {

  const [userType, setUserType] = useState('customer')
  const [isLogged, setIsLogged] = useState(true);
  const location = useLocation(); // tracks current route
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Define routes where header should NOT be shown
  const currentRoute =
    appRoutes.find((route) =>
      route.path === location.pathname ||
      (route.path?.includes('*') && location.pathname.startsWith(route.path.replace('/*', '')))
    ) || appRoutes.find((route) => route.path === "*");

  console.log(currentRoute);
  const hideHeader = currentRoute?.hideHeader;
  return (

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

                      route.requiresAuth ? (
                        <ProtectedRoute
                          allowedRoles={route.allowedRoles}
                        >
                          <RouteElement/>
                        </ProtectedRoute>
                      ) : (
                        <RouteElement/>
                      )}


                  >
                    {route.children.map((child) => {
                      const ChildElement = child.component;
                      return (
                        <Route
                          key={child.path}
                          path={child.path}
                          element={
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ChildElement />
                            </motion.div>
                          }
                        />
                      );
                    })}
                  </Route>
                );
              }

              // Non-nested routes
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {route.requiresAuth ? (
                        <ProtectedRoute
                          allowedRoles={route.allowedRoles}
                        >
                          <RouteElement/>
                        </ProtectedRoute>
                      ) : (
                        <RouteElement/>
                      )}
                    </motion.div>
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
          theme="colored"  // use the colored theme as base
          toastClassName="custom-toast"
          bodyClassName="custom-toast-body"
          progressClassName="custom-toast-progress"
        />
      </Suspense>

    </div>

  );
}

export default App;

