import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);


const cls = (...s) => s.filter(Boolean).join(" ");

const formatDateColombo = (dateStr) => {
  return dayjs.utc(dateStr).tz("Asia/Colombo").format("YYYY-MM-DD");
};


// Replace the old helpers with these:


function parseSlotStartFromLabel(label) {
  if (!label) return null;
  const part = label.split(/–|-/)[0]?.trim(); // left side of dash
  if (!part) return null;
  const [time, ampm] = part.split(/\s+/);
  if (!time || !ampm) return null;
  let [h, m = "0"] = time.split(":");
  let hour = Number(h), minute = Number(m);
  const cap = ampm.toUpperCase();
  if (cap === "PM" && hour !== 12) hour += 12;
  if (cap === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function toStartDate(reservedDate /* 'YYYY-MM-DD' or ISO */, startTime /* 'HH:MM:SS' | null */, slotLabel) {
  // 1) normalize the date to YYYY-MM-DD
  const match = String(reservedDate).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const [y, m, d] = match[1].split("-").map(Number);

  // 2) get hour/minute from startTime or fallback to label
  let hour = 0, minute = 0;
  if (startTime) {
    const [h = "0", min = "0"] = String(startTime).split(":");
    hour = Number(h) || 0;
    minute = Number(min) || 0;
  } else {
    const tm = parseSlotStartFromLabel(slotLabel);
    if (!tm) return null;
    hour = tm.hour;
    minute = tm.minute;
  }

  // 3) construct a local Date (avoids the “Z” offset issue)
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function refundEligibility(reservedDate, slotLabel, status, startTime) {
  if (status !== "cancelled") return { eligible: false, reason: "" };
  const start = toStartDate(reservedDate, startTime, slotLabel);
  if (!start || isNaN(start)) return { eligible: false, reason: "Invalid time" };

  const ms24h = 24 * 60 * 60 * 1000;
  const now = new Date();
  return now <= new Date(start.getTime() - ms24h)
    ? { eligible: true, reason: "Cancelled ≥ 12h before" }
    : { eligible: false, reason: "Cancelled < 12h before" };
}

function Badge({ kind = "default", children }) {
  const map = {
    default: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    booked: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
    completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
    cancelled: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200",
    warn: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
    info: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200",
  };
  return (
    <span className={cls("px-2 py-0.5 rounded text-xs font-semibold", map[kind] || map.default)}>
      {children}
    </span>
  );
}


export default function AdminReservationList() {
  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  // modal (pretty details viewer)
  const [viewItem, setViewItem] = useState(null);

  const load = async () => {
    setLoading(true);
    setFetchErr("");
    try {
      const { data } = await axiosInstance.get("/api/admin/reservations", {
        params: {
          q: q || undefined,
          status: status !== "all" ? status : undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setRows(data.reservations || []);
    } catch (e) {
      console.error("Admin reservations fetch failed:", e?.response?.data || e.message);
      setFetchErr("Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (status !== "all") out = out.filter((r) => r.status === status);
    if (from) out = out.filter((r) => r.reserved_date >= from);
    if (to) out = out.filter((r) => r.reserved_date <= to);
    if (q) {
      const k = q.toLowerCase();
      out = out.filter((r) => {
        const fields = [
          r.id,
          r.customer_name,
          r.customer_email,
          r.slot_label,
          (r.tables || []).map((t) => t.table_code).join(", "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(k);
      });
    }
    out.sort((a, b) => {
      const da = (a.reserved_date || "") + (a.slot_label || "");
      const db = (b.reserved_date || "") + (b.slot_label || "");
      return da < db ? 1 : da > db ? -1 : 0;
    });
    return out;
  }, [rows, status, from, to, q]);

  const handleFromChange = (e) => {
  const value = e.target.value;
  if (to && value > to) {
    alert("From Date cannot be after To Date.");
    return;
  }
  setFrom(value);
};

  const handleToChange = (e) => {
  const value = e.target.value;
  if (from && value < from) {
    alert("To Date cannot be before From Date.");
    return;
  }
  setTo(value);
};



  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Reservation List</h1>
      <p className="text-sm opacity-80 mb-4">
        View all customer reservations. Cancellations appear with refund eligibility based on the 24-hour rule.
      </p>
      

      {/* Filter section with labels */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">Search (UID / Email / Name / Table)</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Enter UID, email, name or table code"
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">Reservation Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All statuses</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">From Date</label>
          <input
            type="date"
            value={from}
            onChange={handleFromChange}
            max={to || undefined}
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">To Date</label>
          <input
            type="date"
            value={to}
            onChange={handleToChange}
            min={from || undefined}
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>

   {/* Admin Reports & Analytics Section */}
<div className="mb-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between">
  <div className="flex items-center gap-3 mb-4 md:mb-0">
    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-2-8V5a2 2 0 012-2h2m4 0h2a2 2 0 012 2v6"
        />
      </svg>
    </div>
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Admin Reports & Analytics
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Generate comprehensive PDF reports for the selected date range
      </p>
    </div>
  </div>

  <button
    onClick={() => {
      const params = new URLSearchParams({ from, to, status });
      window.open(`/api/admin/reservations/report?${params.toString()}`, "_blank");
    }}
    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
      />
    </svg>
    Generate Report
  </button>
</div>




      <div className="flex items-center gap-2 mb-3 text-sm">
        <Badge kind="booked">Booked</Badge>
        <Badge kind="completed">Completed</Badge>
        <Badge kind="cancelled">Cancelled</Badge>
        <span className="opacity-60">•</span>
        <Badge kind="warn">Eligible for refund</Badge>
        <Badge kind="info">Refunded</Badge>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/40 text-left">
              <tr>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Tables</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center opacity-70">
                    Loading reservations…
                  </td>
                </tr>
              )}
              {!loading && fetchErr && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-rose-500">{fetchErr}</td>
                </tr>
              )}
              {!loading && !fetchErr && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center opacity-70">
                    No reservations match the filters.
                  </td>
                </tr>
              )}
              {!loading && !fetchErr && filtered.map((r) => {
                const tables = (r.tables || []).map((t) => t.table_code).join(", ");
                const { eligible, reason } = refundEligibility(r.reserved_date, r.slot_label, r.status, r.start_time);
                const newCancellation =
                  r.status === "cancelled" &&
                  !r.refunded_at &&
                  r.cancelled_at &&
                  new Date().getTime() - new Date(r.cancelled_at).getTime() < 24 * 60 * 60 * 1000;

                return (
                  <tr key={r.id} className="border-t dark:border-gray-700">
                    <td className="px-4 py-3 font-mono">{r.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customer_name || "—"}</div>
                      <div className="opacity-70">{r.customer_email || ""}</div></td>
                      <td className="px-4 py-3">{formatDateColombo(r.reserved_date)}</td>
                    <td className="px-4 py-3">{r.slot_label || "—"}</td>
                    <td className="px-4 py-3">{r.guests}</td>
                    <td className="px-4 py-3">{tables || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge kind={r.status}>{r.status}</Badge>
                        {newCancellation && <Badge kind="warn">New cancel</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.status !== "cancelled" && <Badge>—</Badge>}
                      {r.status === "cancelled" && r.refunded_at && <Badge kind="info">Refunded</Badge>}
                      {r.status === "cancelled" && !r.refunded_at && eligible && <Badge kind="warn">Eligible</Badge>}
                      {r.status === "cancelled" && !r.refunded_at && !eligible && <Badge>Not eligible</Badge>}
                      <div className="text-[11px] opacity-70 mt-0.5">{r.status === "cancelled" ? reason : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="px-3 py-1 rounded bg-emerald-500 hover:opacity-90"
                        onClick={() => setViewItem(r)}
                        title="View details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* simple modal for “View” */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-5">
            <h3 className="text-lg font-semibold mb-3">Reservation Details</h3>
            <div className="space-y-1 text-sm">
              <div><b>UID:</b> {viewItem.reservation_uid}</div>
              <div><b>Customer:</b> {viewItem.customer_name} · {viewItem.customer_email}</div>
              <div><b>Date:</b> {viewItem.reserved_date}</div>
              <div><b>Time:</b> {viewItem.slot_label}</div>
              <div><b>Guests:</b> {viewItem.guests}</div>
              <div><b>Tables:</b> {(viewItem.tables || []).map(t => t.table_code).join(", ") || "—"}</div>
              <div><b>Status:</b> {viewItem.status}</div>
              {viewItem.special_request && <div><b>Note:</b> {viewItem.special_request}</div>}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                className="px-4 py-2 rounded bg-emerald-500 hover:opacity-90"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs opacity-70 mt-3">
        * Refund eligibility: customer cancelled at least 24 hours before the reserved start time.
      </div>
    </div>
  );
}
