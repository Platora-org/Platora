import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

// ----- axios instance -----
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

// ----- local fallback + defaults -----
const DEFAULT_TABLES = [
  { id: "T-1", capacity: 2, price: 10, x: 60, y: 70 },
  { id: "T-2", capacity: 2, price: 10, x: 220, y: 80 },
  { id: "T-3", capacity: 4, price: 15, x: 380, y: 70 },
  { id: "T-4", capacity: 4, price: 15, x: 540, y: 80 },
  { id: "T-5", capacity: 6, price: 20, x: 120, y: 220 },
  { id: "T-6", capacity: 6, price: 20, x: 320, y: 220 },
  { id: "T-7", capacity: 4, price: 15, x: 520, y: 220 },
  { id: "T-8", capacity: 2, price: 10, x: 200, y: 360 },
  { id: "T-9", capacity: 4, price: 15, x: 380, y: 360 },
];

// demo occupied (replace with backend later)
const MOCK_OCCUPIED = [
  { tableId: "T-6", date: "2025-08-27", time: "4:00 PM - 6:00 PM" },
  { tableId: "T-3", date: "2025-08-27", time: "4:00 PM - 6:00 PM" },
  { tableId: "T-9", date: "2025-08-29", time: "8:00 PM - 10:00 PM" },
];

// localStorage mirror (so customer still sees something if API is down)
const LS_LAYOUT_KEY = "platora_table_layout_v1";
const loadLayout = () => {
  try {
    const raw = localStorage.getItem(LS_LAYOUT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveLayout = (tables) => {
  try {
    localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(tables));
  } catch {}
};

// ----- pill table UI -----
const TableNode = ({
  table,
  occupied,
  selected,
  selectable,
  onSelect,
}) => {
  const base =
    "rounded-full px-4 py-2 text-sm font-medium shadow-sm select-none";
  const colors = occupied
    ? "bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200 cursor-not-allowed"
    : selected
    ? "bg-emerald-500 text-white"
    : selectable
    ? "bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 cursor-pointer"
    : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300 cursor-not-allowed";

  return (
    <div
      onClick={() => {
        if (selectable && !occupied) onSelect?.(table.id);
      }}
      className={`${base} ${colors}`}
      style={{ width: 140, textAlign: "center" }}
      title={
        occupied
          ? "Occupied"
          : `Table ${table.id} • Capacity ${table.capacity} • $${table.price}`
      }
    >
      <div className="text-xs opacity-80">Table {table.id}</div>
      <div className="text-[11px] opacity-70">
        {table.capacity} ppl · ${table.price}
      </div>
    </div>
  );
};

export default function TableAvailability() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // from ReservationPage
  const date = state?.date || "";
  const time = state?.time || "";
  const guests = Number(state?.guests || 0);

  // fetch the admin layout for customers
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [loading, setLoading] = useState(true);

  // load layout from backend (mirror admin)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/food-court/tables");
        if (!mounted) return;
        const normalized = (res.data?.tables || []).map((t) => ({
          id: t.id,
          capacity: t.capacity,
          price: t.price,
          x: Number(t.pos_x ?? 40),
          y: Number(t.pos_y ?? 40),
        }));
        if (normalized.length) {
          setTables(normalized);
          saveLayout(normalized);
        } else {
          // backend returned nothing -> try local, else defaults
          const local = loadLayout();
          setTables(local?.length ? local : DEFAULT_TABLES);
        }
      } catch {
        const local = loadLayout();
        setTables(local?.length ? local : DEFAULT_TABLES);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Occupied by date/time
  const occupiedSet = useMemo(() => {
    return new Set(
      MOCK_OCCUPIED.filter((r) => r.date === date && r.time === time).map(
        (r) => r.tableId
      )
    );
  }, [date, time]);

  // selection
  const [selected, setSelected] = useState([]); // up to 2
  const toggleSelect = (tableId) => {
    setSelected((prev) => {
      if (prev.includes(tableId)) return prev.filter((id) => id !== tableId);
      if (prev.length >= 2) return prev;
      return [...prev, tableId];
    });
  };

  const proceed = () => {
    const chosen = tables.filter((t) => selected.includes(t.id));
    navigate("/reservation-form", {
      state: {
        date,
        time,
        guests,
        tables: chosen,
        totalFee: chosen.reduce((s, t) => s + (t.price || 0), 0),
      },
    });
  };

  // Guard: user came directly
  useEffect(() => {
    if (!date || !time || !guests) {
      navigate("/reservations", { replace: true });
    }
  }, [date, time, guests, navigate]);

  return (
    <div className="min-h-screen bg-emerald-50/50 dark:bg-gray-900 text-gray-800 dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Select a Table</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              <span className="font-medium">Date:</span> {date} &nbsp;•&nbsp;
              <span className="font-medium">Time:</span> {time} &nbsp;•&nbsp;
              <span className="font-medium">Guests:</span> {guests}
            </p>
            <p className="text-sm mt-1 opacity-80">
              You can select up to <b>2</b> tables for this time slot.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              Back
            </button>
            <button
              disabled={selected.length === 0}
              onClick={proceed}
              className={[
                "px-4 py-2 rounded-lg font-semibold",
                selected.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                  : "bg-emerald-500 text-white hover:bg-emerald-600",
              ].join(" ")}
            >
              Continue
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            Selected
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-900 inline-block" />
            Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            Occupied
          </span>
        </div>

        {/* Canvas */}
        <div
          className="mt-6 relative rounded-xl border bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          style={{ height: 520, overflow: "hidden" }}
        >
          {/* grid feel */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm opacity-80">
              Loading tables…
            </div>
          )}

          {!loading &&
            tables.map((t) => {
              const occupied = occupiedSet.has(t.id);
              const isSelected = selected.includes(t.id);

              const fitsGuests = guests ? t.capacity >= guests : true;
              const selectable = !occupied && fitsGuests;

              return (
                <div
                  key={t.id}
                  className="absolute"
                  style={{ left: t.x, top: t.y }}
                >
                  <div style={{ width: 140 }}>
                    <TableNode
                      table={t}
                      occupied={occupied}
                      selected={isSelected}
                      selectable={selectable}
                      onSelect={toggleSelect}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-sm opacity-80">
          Selected ({selected.length}/2):{" "}
          {selected.length ? selected.join(", ") : "No tables selected yet."}
        </div>
      </div>
    </div>
  );
}
