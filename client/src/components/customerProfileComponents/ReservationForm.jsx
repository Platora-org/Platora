// src/pages/reservations/ReservationForm.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../utils/AuthContext";

export default function ReservationForm() {
  const { state } = useLocation(); // { date, time, guests, tables, slot_id }
  const navigate = useNavigate();
  const { user } = useAuth();
  

  useEffect(() => {
    if (!state?.date || !state?.time || !state?.tables?.length) {
      navigate("/reservations", { replace: true });
    }
  }, [state, navigate]);

  const [date] = useState(state?.date || "");
  const [time] = useState(state?.time || "");        // label (for UI)
  const [slotId] = useState(state?.slot_id || null); // numeric if provided
  const [guests] = useState(Number(state?.guests || 0));
  const [tables] = useState(state?.tables || []);
  const [specialRequest, setSpecialRequest] = useState("");
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        firstName: user.first_name || user.firstName || "",
        lastName: user.last_name || user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const [reservationFee, setReservationFee] = useState(0);
  const [reservationId, setReservationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmationMsg, setConfirmationMsg] = useState("");

useEffect(() => {
 
}, []);

  useEffect(() => {
    const coins = (tables || []).reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    setReservationFee(coins);
  }, [tables]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const walletReturn = await axiosInstance.post('/api/wallet/spend', {
      coins: reservationFee,
      reservationId: reservationId,  // Use reservationId instead of orderId
      description: `  Reservation ${reservationId}`,
    });

    } catch (err) {
      console.error("Wallet error:", err?.response?.data || err.message);
      setError(err?.response?.data?.message || "Something went wrong while reserving. Please try again.");
      return;
    }
    

    try {
      const reservation_Id =  await axiosInstance.post("/api/reservations", {
        date,
        // Preferred exact ID; backend also accepts time_label as fallback.
        slot_id: slotId || undefined,
        time_label: !slotId ? time : undefined,
        guests,
        table_ids: tables.map((t) => t.id),
        special_request: specialRequest || null,
      });

      const reservationId = reservation_Id.data.id;

      console.log("Reservation successful, ID:", reservationId);

      setConfirmationMsg(`Reservation Successful! Your reservation ID is ${reservationId}.`);
      setTimeout(() => navigate("/customerprofile/reservations"), 1500);
    } catch (e) {
      console.error("Reservation error:", e?.response?.data || e.message);
      setError(e?.response?.data?.message || "Something went wrong while reserving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservation Form</h1>

          {confirmationMsg && (
            <div className="mb-4 p-4 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300">
              {confirmationMsg}
            </div>
          )}
          {error && (
            <div className="mb-2 p-3 bg-rose-100 text-rose-800 rounded-lg border border-rose-300">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={personalInfo.firstName} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={personalInfo.lastName} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={personalInfo.email} />
              </div>

            </div>
          </section>

          {/* Reservation details */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Reservation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={date} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Slot</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={time} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guest Count</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={guests} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Table IDs</label>
                <input className="border rounded-lg px-4 py-2 w-full bg-gray-100 dark:bg-gray-700" readOnly value={tables.map(t => t.id).join(", ")} />
              </div>
            </div>

            <label className="block mt-4 text-sm font-medium">Special Request (optional)</label>
            <textarea
              className="w-full border rounded-lg px-4 py-2 focus:ring focus:ring-emerald-400"
              rows={3}
              value={specialRequest}
              onChange={(e) => {
                const val = e.target.value;
                
                // allow empty OR must contain at least 1 letter; numbers allowed not as full string
                if (val === "" || /[a-zA-Z]/.test(val)) setSpecialRequest(val);
              }}
              placeholder="E.g. high chair, wheelchair access, birthday arrangement…"
            />
          </section>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="policy" required className="mt-1" />
            <label htmlFor="policy" className="text-sm opacity-90">
              I accept the reservation policy and agree to the terms & conditions.
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
            setDetailsConfirmed(true); 
            setConfirmationMsg("Details confirmed. Review the summary on the right before submitting.");}}

            className="px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Confirm Details
          </button>
        </div>

        {/* RIGHT */}
        <aside className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Reservation Summary</h2>
          <div className="space-y-1 text-sm">
            <p><b>Date:</b> {date}</p>
            <p><b>Time:</b> {time}</p>
            <p><b>Guests:</b> {guests}</p>
            <p><b>Tables:</b> {tables.map((t) => t.id).join(", ")}</p>
          </div>

          <div className="border-t pt-4 mt-4 space-y-1">
            <p className="text-lg">
              Reservation Fee: <span className="font-semibold text-emerald-600">{reservationFee} coins</span>
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            disabled={loading || submitting || !detailsConfirmed}   // added !detailsConfirmed
            onClick={handleSubmit}
            className={`w-full px-6 py-3 rounded-lg text-white ${
               loading || submitting || !detailsConfirmed
               ? "bg-gray-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600"
                 }`}
          >
  {submitting ? "Processing…" : "Reserve Table"}
</button>
        </aside>
      </div>
    </div>
  );
}
