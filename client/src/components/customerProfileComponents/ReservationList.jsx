// src/pages/customer/ReservationList.jsx
import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosInstance";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ReservationList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  const cancelNow = async (id) => {
    if (
      !window.confirm(
        "Cancel this reservation? If it’s 24+ hours before the start time, it will be cancelled immediately."
      )
    )
      return;
    try {
      await axios.post(`/api/reservations/${id}/cancel`);
      await load();
      alert("Reservation cancelled.");
    } catch (e) {
      const msg = e?.response?.data?.message || "Unable to cancel.";
      alert(msg);
    }
  };

  const formatDateLocal = (isoDate) => {
    return dayjs.utc(isoDate).tz("Asia/Colombo").format("YYYY-MM-DD");
  };

  const isCancellable = (reservedDate) => {
    const now = dayjs().tz("Asia/Colombo");
    const reservationTime = dayjs
      .utc(reservedDate)
      .tz("Asia/Colombo")
      .startOf("day");
    return reservationTime.diff(now, "hour") >= 24;
  };

  return (
    <div className="p-6">
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
                          onClick={() => canCancel && cancelNow(r.id)}
                          className={`px-3 py-1 rounded ${
                            canCancel
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          }`}
                          disabled={!canCancel}
                        >
                          Cancel
                        </button>
                        {!canCancel && (
                          <div className="text-xs text-gray-500 mt-1">
                           
                          </div>
                        )}
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
    </div>
  );
}
