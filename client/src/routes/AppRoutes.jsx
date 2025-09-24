import { lazy } from "react";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const NotFound = lazy(() => import("../pages/NotFound"))
const Home = lazy(() => import("../pages/Home"))
const CustomerProfile = lazy(() => import("../pages/CustomerProfile"))
const Dashboard = lazy(() => import("../components/customerProfileComponents/Dashboard"))
const Analysis = lazy(() => import("../components/customerProfileComponents/Analysis"))
const Settings = lazy(() => import("../components/customerProfileComponents/Settings"))
const CustomerPersonalDetails = lazy(() => import("../components/customerProfileComponents/CustomerPersonalDetails"))
const RedirectPage = lazy(() => import("../pages/RedirectPage"));
const RestaurantProfile = lazy(() => import("../pages/RestaurantProfile"))
const RestaurantDashboard = lazy(() => import("../components/restaurantProfileComponents/RestaurantDashboard"))
const AdminDashboard = lazy(() => import("../components/adminProfileComponents/AdminDashboard"))
const AdminProfile = lazy(() => import("../pages/AdminProfile"))
const RestaurantWallet = lazy(() => import("../components/restaurantProfileComponents/RestaurantWallet"));
const DeliveryAgentManagement = lazy(() => import("../components/adminProfileComponents/DeliverAgent"))
const DeliveryAgentDashboard = lazy(() => import("../pages/DeliveryAgentDashboard"));
const CustomerReservation = lazy(() => import("../components/customerProfileComponents/CustomerReservation"))
const kycrequests = lazy(() => import("../components/adminProfileComponents/AdminKycApproval"));
const RestaurantsDisplay = lazy(() => import("../pages/RestaurantsDisplay"));
const RestaurantMenuList = lazy(() => import("../pages/RestaurantMenuList"));
const ReservationList = lazy(() => import("../components/customerProfileComponents/ReservationList"));
const TableAvailability = lazy(() => import("../components/customerProfileComponents/TableAvailability"));
const Menu = lazy(() => import("../components/restaurantProfileComponents/RestaurantOperations"));
const AuditLogs = lazy(() => import("../components/adminProfileComponents/AdminAuditLogs"));
const AdminFoodCourt = lazy(() => import("../components/adminProfileComponents/AdminFoodCourt"));
const CustomerWallet = lazy(() => import("../components/customerProfileComponents/CustomerWalletDashboard"));



export const appRoutes = [
  {
    path: "/login",
    component: LoginPage,
    requiresAuth: false,
    hideHeader: true
  },
  {
    path: "/restaurants",
    component: RestaurantsDisplay,
    requiresAuth: true,
    allowedRoles: ["customer", "guest"],
  },
  {
    path: "/restaurants/:id/menu",
    component: RestaurantMenuList,
    requiresAuth: true,
    allowedRoles: ["customer", "guest"],
  },
  {
    path: "/deliveryagent",
    component: DeliveryAgentDashboard,
    requiresAuth: true,
    hideHeader: true,
    allowedRoles: ["delivery"],
  },
  {
    path: "/register",
    component: RegisterPage,
    requiresAuth: false,
    hideHeader: true
  },
  
  {
    path: "*",
    component: NotFound,
    requiresAuth: false,
    hideHeader: true,
  },

  {
    path: "/",
    component: Home,
    requiresAuth: true,
    allowedRoles: ["customer", "guest"],
  },

  {
    path: "/customerprofile/*",
    component: CustomerProfile,
    requiresAuth: true,
    allowedRoles: ["customer"],
    children: [
      {
        path: "",
        component: Dashboard,
      },
      {
        path: "analysis",
        component: Analysis,
      },
      {
        path: "settings",
        component: Settings,
      },
      {
        path: "details",
        component: CustomerPersonalDetails,
      },
       {
        path: "reservations",
        component: ReservationList,
      },
      {
        path: "wallet",
        component: CustomerWallet, 
      },
     
    ]
  },

  {
    path: "/redirect",
    component: RedirectPage,
    requiresAuth: false,
    hideHeader: true
  },

  {
    path: "/restaurant/*",
    component: RestaurantProfile,
    requiresAuth: true,
    allowedRoles: ["restaurant"],
    children: [
      {
        path: "",
        component: RestaurantDashboard,
      },
      {
        path: "wallet",
        component: RestaurantWallet, 
      },
      {
        path: "menu",
        component: Menu, 
      },
    ]
  },

   {
    path: "/admin/*",
    component: AdminProfile,
    requiresAuth: true,
    allowedRoles: ["admin"],
    children: [
      {
        path: "",
        component: AdminDashboard,
      },
      {
        path: "deliveryagentmanage",
        component: DeliveryAgentManagement,
      },
      {
        path: "kycrequests",
        component: kycrequests,
      },
      {
        path: "auditlogs",
        component: AuditLogs,
      },
      {
        path: "reservations/food-court",
        component: AdminFoodCourt 
      },
      

    ]
  },

   {
    path: "/reservations",           
    component: CustomerReservation,
    requiresAuth: true,
    allowedRoles: ["customer"],      
  },

    {
    path: "/tables",
    component: TableAvailability,
    requiresAuth: true,
    allowedRoles: ["customer"],
  },

]

