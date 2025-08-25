// client/src/components/customerProfileComponents/CustomerReservationsTable.jsx
import React, { useMemo, useState } from "react";

const FAKE_ROWS = [
  { id: 101, date: "2025-08-10", start: "18:00", end: "20:00", guests: 4, status: "completed" },
  { id: 102, date: "2025-08-08", start: "12:30", end: "14:30", guests: 2, status: "completed" },
  { id: 103, date: "2025-08-05", start: "19:00", end: "21:00", guests: 6, status: "cancelled" },
  { id: 104, date: "2025-07-30", start: "11:00", end: "13:00", guests: 3, status: "completed" },
  { id: 105, date: "2025-07-22", start: "17:30", end: "19:30", guests: 5, status: "completed" },
  { id: 106, date: "2025-07-18", start: "13:00", end: "15:00", guests: 2, status: "completed" },
  { id: 107, date: "2025-07-11", start: "20:00", end: "22:00", guests: 4, status: "completed" },
];

function to12(hm) {
  const [h, m] = hm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function CustomerReservationsTable() {
  const [rows, setRows] = useState(FAKE_ROWS);

  const handleDelete = (id) => {
    if (!window.confirm("Delete this reservation?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [rows]
  );

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Past Reservations (Dummy)
      </h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {sorted.length === 0 ? (
          <div className="p-6 text-gray-600 dark:text-gray-300">
            No reservations (dummy list is empty).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Reservation Date</th>
                  <th className="px-6 py-3 text-left font-semibold">Time</th>
                  <th className="px-6 py-3 text-left font-semibold">Number of Guests</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                      {to12(r.start)} – {to12(r.end)}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{r.guests}</td>
                    <td className="px-6 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (r.status === "cancelled"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
