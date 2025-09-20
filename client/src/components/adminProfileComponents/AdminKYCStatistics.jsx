// AdminKYCStatistics.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminKYCStatistics = () => {
  const [stats, setStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const response = await axios.get("/api/restaurant/kyc/statistics", {
            withCredentials: true,
            });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching statistics:", error);
        } finally {
            setLoading(false);
        }
        };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Applications</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_count}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending_count}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
           <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved_count}</p>
         </div>
         <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
           <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
         </div>
       </div>
     </div>

     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
           <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected_count}</p>
         </div>
         <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
           <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
         </div>
       </div>
     </div>
   </div>
 );
};

export default AdminKYCStatistics;