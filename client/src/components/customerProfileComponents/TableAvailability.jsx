// src/pages/reservations/TableAvailability.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

const TABLE_W = 150;
const TABLE_H = 60;

const DEFAULT_TABLES = [
  { id: 1, table_code: "T-1", capacity: 2, price: 10, x: 60,  y: 70 },
  { id: 2, table_code: "T-2", capacity: 2, price: 10, x: 220, y: 80 },
  { id: 3, table_code: "T-3", capacity: 4, price: 15, x: 380, y: 70 },
];

const LS_LAYOUT_KEY = "platora_table_layout_v1";
const loadLayout = () => {
  try { const raw = localStorage.getItem(LS_LAYOUT_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const saveLayout = (tables) => { try { localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(tables)); } catch {} };

const TableNode = ({ table, occupied, selected, selectable, onSelect }) => {
  const base = "rounded-md text-sm font-medium shadow-sm select-none flex flex-col items-center justify-center";
  const colors = occupied
    ? "bg-rose-600 text-white cursor-not-allowed"
    : selected
    ? "bg-emerald-500 text-white"
    : selectable
    ? "bg-gray-900 text-white hover:bg-gray-700 cursor-pointer"
    : "bg-gray-300 text-gray-600 cursor-not-allowed";

  return (
    <div
      className={`${base} ${colors}`}
      style={{ width: TABLE_W, height: TABLE_H, textAlign: "center" }}
      title={
        occupied
          ? "Occupied"
          : `${table.table_code} • ${table.capacity} people • ${table.price} coins` 
      }
      onClick={() => !occupied && selectable && onSelect?.(table.id)}
    >
      <div className="text-xs opacity-80">{table.table_code}</div>
      <div className="text-[11px] opacity-70">{table.capacity} people · {table.price} Coins</div>
    </div>
  );
};

export default function TableAvailability() {
  const { state } = useLocation(); // expects { date, time, guests }
  const navigate = useNavigate();

  const date   = state?.date || "";
  const time   = state?.time || "";        // label (e.g. "6:00 PM – 8:00 PM")
  const guests = Number(state?.guests || 0);

  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [loading, setLoading] = useState(true);

  const [slotId, setSlotId] = useState(null);
  const [occupiedIds, setOccupiedIds] = useState([]);

  // fetch tables layout
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/api/food-court/tables");
        if (!mounted) return;
        const normalized = (res.data?.tables || []).map((t) => ({
          id: Number(t.id),
          table_code: t.table_code,
          capacity: t.capacity,
          price: t.price,
          x: Number(t.pos_x ?? 40),
          y: Number(t.pos_y ?? 40),
        }));
        if (normalized.length) {
          setTables(normalized);
          saveLayout(normalized);
        } else {
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
    return () => { mounted = false; };
  }, []);

  // look up slot_id from label
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/api/reservations/time-slots");
        const slots = data?.slots || [];

        // normalize like the backend fuzzy matcher
        const norm = (s) => s.toLowerCase().replaceAll("–","-").replaceAll(" ","");

        const found = slots.find(s => norm(s.label) === norm(time));
        if (found) setSlotId(found.id);
        else setSlotId(null);
      } catch {
        setSlotId(null);
      }
    })();
    return () => { mounted = false; };
  }, [time]);

  // fetch occupied table IDs for this date/slot
  useEffect(() => {
    if (!date || !slotId) return;
    let cancel = false;

    (async () => {
      try {
        const { data } = await axiosInstance.get("/api/reservations/occupied", {
          params: { date, slot_id: slotId }
        });
        if (!cancel) setOccupiedIds((data?.occupied || []).map(Number));
      } catch (e) {
        console.error("Failed to fetch occupied tables", e);
        if (!cancel) setOccupiedIds([]);
      }
    })();

    return () => { cancel = true; };
  }, [date, slotId]);

  // select up to 2 tables that fit guest count
  const [selected, setSelected] = useState([]);
  const toggleSelect = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const proceed = () => {
    const chosen = tables.filter((t) => selected.includes(t.id));
    navigate("/reservation-form", {
      state: { date, time, guests, tables: chosen, slot_id: slotId },
    });
  };

  useEffect(() => {
    if (!date || !time || !guests) {
      navigate("/reservations", { replace: true });
    }
  }, [date, time, guests, navigate]);

  return (
    <div className="min-h-screen bg-emerald-50/50 dark:bg-gray-900 text-gray-800 dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Select a Table</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              <span className="font-medium">Date:</span> {date} &nbsp;•&nbsp;
              <span className="font-medium">Time:</span> {time} &nbsp;•&nbsp;
              <span className="font-medium">Guests:</span> {guests}
            </p>
            <p className="text-sm mt-1 opacity-80">You can select up to <b>2</b> tables for this time slot.</p>
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
              className={`px-4 py-2 rounded-lg font-semibold ${
                selected.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-600"
              }`}
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
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
            Occupied
          </span>
        </div>

        {/* Canvas */}
        <div
          className="mt-6 relative rounded-xl border bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          style={{ height: 520, overflow: "hidden" }}
        >
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
              const occupied = occupiedIds.includes(Number(t.id));
              const isSelected = selected.includes(t.id);
              const fitsGuests = guests ? t.capacity >= guests : true;
              const selectable = !occupied && fitsGuests;

              return (
                <div key={t.id} className="absolute" style={{ left: t.x, top: t.y }}>
                  <div style={{ width: TABLE_W }}>
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

        <div className="mt-6 text-sm opacity-80">
          Selected ({selected.length}/2):{" "}
          {selected.length ? selected.join(", ") : "No tables selected yet."}
        </div>
      </div>
    </div>
  );
}
