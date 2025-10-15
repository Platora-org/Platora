import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosInstance";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Dialog } from "@headlessui/react";
import toast, { Toaster } from "react-hot-toast";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ReservationList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [refunding, setRefunding] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await axios.get("/api/reservations/mine");
      setRows(data.reservations || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Step 1: Cancel reservation
  const cancelNow = async (id) => {
    try {
      await axios.post(`/api/reservations/${id}/cancel`);
      toast.success("Reservation cancelled successfully.");
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "Unable to cancel.";
      toast.error(msg);
    }
  };

  // Step 2: Process refund
  const handleRefundAfterCancel = async (reservationId) => {
    try {
      setRefunding(reservationId);

      const refundRes = await axios.post("/api/refunds/reservation", {
        reservationId, // updated key for your backend

      });

      if (refundRes.data.success) {
        const { total_amount, items_refunded, new_balance } = refundRes.data.refund;
        toast.success(
          `Refunded ${total_amount} coins. Customer new balance: ${new_balance}`
        );
      } else {
        toast.error("Refund failed: " + refundRes.data.message);
      }
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.message ||
        "Failed to process refund. Please try again later.";
      toast.error(errorMsg);
    } finally {
      setRefunding(null);
    }
  };

  const formatDateLocal = (isoDate) =>
    dayjs.utc(isoDate).tz("Asia/Colombo").format("YYYY-MM-DD");

  const isCancellable = (reservedDate) => {
    const now = dayjs().tz("Asia/Colombo");
    const reservationTime = dayjs.utc(reservedDate).tz("Asia/Colombo").startOf("day");
    return reservationTime.diff(now, "hour") >= 12;
  };

  return (
    <div className="p-6">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#fff",
            borderRadius: "10px",
          },
        }}
      />

      <h1 className="text-2xl font-bold mb-4">My Reservations</h1>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-500">{err}</div>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/40">
            <tr className="text-left">
              <th className="px-4 py-3">UID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Tables</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cancel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((r) => {
              const canCancel = isCancellable(r.reserved_date);

              return (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-mono">{r.id}</td>
                  <td className="px-4 py-3">{formatDateLocal(r.reserved_date)}</td>
                  <td className="px-4 py-3">{r.slot_label}</td>
                  <td className="px-4 py-3">{r.guests}</td>
                  <td className="px-4 py-3">
                    {(r.tables || []).map((t) => t.table_code).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        r.status === "booked"
                          ? "bg-amber-100 text-amber-700"
                          : r.status === "cancelled"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "booked" ? (
                      <div>
                        <button
                          onClick={() => canCancel && setConfirming(r)}
                          className={`px-3 py-1 rounded transition-colors duration-200 ${
                            canCancel
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "bg-rose-200 text-rose-500 cursor-not-allowed"
                          }`}
                          disabled={!canCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center opacity-70" colSpan={7}>
                  No reservations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <Dialog.Title className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Cancel Reservation
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Cancel this reservation? If it’s 24+ hours before the start time, it
              will be cancelled immediately and your payment will be refunded.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!confirming) return;
                  await cancelNow(confirming.id);
                  await handleRefundAfterCancel(confirming.id);
                  setConfirming(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50"
                disabled={!!refunding}
              >
                {refunding === confirming?.id ? "Processing..." : "Confirm"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
