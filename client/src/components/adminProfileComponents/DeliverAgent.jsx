// src/pages/DeliveryAgentManagement.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import { Plus, Loader2, Trash2 } from "lucide-react";

function DeliveryAgentManagement() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("delivery");
  const [phone, setContact] = useState(""); 

  const validatePhone = (phone) => /^07\d{8}$/.test(phone);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("admin/profile/deliveryagentdata");
      console.log("Answer: ", res.data)
      setAgents(res.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load delivery agents"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || password.length < 8 || !validatePhone(phone)) {
      toast.error("Fill all fields correctly. Password must be at least 8 characters.");
      return;
    }

    try {
      setAdding(true);

      const res = await axiosInstance.post("/api/auth/addDeliveryAgent", {
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
      });

      await fetchAgents();
      toast.success("Agent created successfully!");

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setContact("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create delivery agent");
    } finally {
      setAdding(false);
    }
  };

 const handleDeleteAgent = async (agentId) => {
  // Function to proceed with deletion
  const proceedWithDelete = async (agentId) => {
    try {
      setDeleting(agentId);
      await axiosInstance.get(`/api/auth/deleteDeliveryAgent/${agentId}`);
      
      await fetchAgents();
      toast.success("Agent deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete delivery agent");
    } finally {
      setDeleting(null);
    }
  };

  // Create a confirmation toast
  toast.dismiss(); // Clear any existing toasts
  
  toast(
    ({ closeToast }) => (
      <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-gray-800 dark:text-gray-200">
          <strong>Delete Delivery Agent</strong>
        </div>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          Are you sure you want to delete this delivery agent? This action cannot be undone.
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              closeToast();
              proceedWithDelete(agentId);
            }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Delete
          </button>
          <button
            onClick={closeToast}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    ),
    {
      position: "top-center",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      closeButton: false,
      className: "!bg-transparent !p-0",
    }
  );
};

  const getStatusBadge = (status) => {
    let color = "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    if (status === "free")
      color =
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200";
    if (status === "on_delivery")
      color =
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200";
    if (status === "inactive")
      color =
        "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200";

    return (
      <span
        className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${color}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="p-3 sm:p-6 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 dark:text-gray-200">
        Delivery Agent Management
      </h1>

      {/* Add Agent Form */}
      <form
        onSubmit={handleAddAgent}
        className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md mb-6 sm:mb-8"
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-300">
          Add New Agent
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="block text-sm w-full px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="block text-sm w-full px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block text-sm w-full px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block text-sm w-full px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
          />
          <input
            type="text"
            placeholder="Phone Number (07xxxxxxxx)"
            value={phone}
            onChange={(e) => setContact(e.target.value)}
            className="block text-sm w-full px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className={`mt-3 sm:mt-4 flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold shadow-lg transition-all duration-200 transform ${adding
            ? "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 hover:scale-[1.02] cursor-pointer"
            }`}
        >
          {adding ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
          {adding ? "Adding..." : "Add Agent"}
        </button>
      </form>

      {/* Agent List */}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading agents...</p>
      ) : agents.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          No delivery agents found. Add your first agent above.
        </p>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {agent.firstName} {agent.lastName}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-all">
                      {agent.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(agent.status)}
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      disabled={deleting === agent.id}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      title="Delete agent"
                    >
                      {deleting === agent.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Phone:</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{agent.phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-hidden rounded-xl shadow-md">
              <table className="min-w-full bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Name
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Email
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      phone
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 w-35">
                      Status
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                        {agent.firstName} {agent.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {agent.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {agent.phone}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(agent.status)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {new Date(agent.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          disabled={deleting === agent.id}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          title="Delete agent"
                        >
                          {deleting === agent.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DeliveryAgentManagement;