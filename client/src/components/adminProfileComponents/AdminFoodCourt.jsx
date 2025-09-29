import React, { useEffect, useState, useCallback, useRef, createRef } from "react";
import Draggable from "react-draggable";
import axios from "axios";

/* ✅ One shared Axios instance for the whole file */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

/* ---------- Blackout Form ---------- */
function BlackoutForm() {
  const [date, setDate] = useState("");
  const [fullDay, setFullDay] = useState(true);
  const [slots, setSlots] = useState([]);              // [{id,label}]
  const [selectedSlots, setSelectedSlots] = useState([]); // ids
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);                // upcoming blackouts
  const [toast, setToast] = useState({ open:false, type:"success", message:"" });

  const todayStr = new Date().toISOString().slice(0,10);

  const show = (type, message, t=2200) => {
    setToast({ open:true, type, message });
    clearTimeout(show._t);
    show._t = setTimeout(()=>setToast(s=>({ ...s, open:false })), t);
  };

  // Helper: parse slot label (e.g., "10:00 AM - 12:00 PM") -> Date for START
  const parseSlotStart = (slotLabel, baseDateStr) => {
    const start = slotLabel.split(" - ")[0];           // "10:00 AM"
    const [time, ampm] = start.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const d = new Date(baseDateStr);
    d.setHours(h, m || 0, 0, 0);
    return d;
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/reservations/availability/time-slots", {
          params: { date: todayStr } // labels + order
        });
        setSlots((data.slots || []).map(s => ({ id:s.id, label:s.label })));
      } catch (e) {
        console.error("load time-slots failed:", e?.response?.data || e.message);
      }
    })();
  }, []);

  // Fetch upcoming blackouts (10-day window)
  const refresh = async () => {
    const from = todayStr;
    const to = new Date(Date.now()+10*24*60*60*1000).toISOString().slice(0,10);
    try {
      const { data } = await api.get("/api/admin/availability/blackouts", { params: { from, to }});
      setList(data.blackouts || []);
    } catch (e) {
      console.error("load blackouts failed:", e?.response?.data || e.message);
    }
  };
  useEffect(() => { refresh(); }, []);

  // Validation helpers
  const isPastDate = (dStr) => dStr && dStr < todayStr;

  const isPastSlotForDate = (slotLabel, dateStr) => {
    if (!dateStr) return true;
    // Only restrict past slots when date is today
    if (dateStr !== todayStr) return false;
    const now = new Date();
    const start = parseSlotStart(slotLabel, dateStr);
    return start <= now;
  };

  const toggleSlot = (id) => {
    setSelectedSlots(prev =>
      prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!date) { show("error","Please choose a date"); return; }
    if (isPastDate(date)) { show("error","You cannot set blackouts for past dates"); return; }
    // If partial-day blackout *today*, ensure no past slots are selected
    if (!fullDay && date === todayStr) {
      const invalid = selectedSlots.some(sid => {
        const s = slots.find(x => x.id === sid);
        return s ? isPastSlotForDate(s.label, date) : false;
      });
      if (invalid) {
        show("error","You cannot blackout past time slots for today");
        return;
      }
    }

    setSaving(true);
    try {
      await api.post("/api/admin/availability/blackouts", {
        date,
        full_day: fullDay,
        slot_ids: fullDay ? [] : selectedSlots
      });
      show("success","Saved holiday/blackout");
      setSelectedSlots([]);
      refresh();
    } catch (e) {
      console.error("save blackout failed:", e?.response?.data || e.message);
      show("error","Failed to save blackout");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/api/admin/availability/blackouts/${id}`);
      show("success", "Blackout removed");
      refresh();
    } catch (e) {
      console.error("delete blackout failed:", e?.response?.data || e.message);
      show("error", "Failed to remove blackout");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs opacity-70 mb-1">Date</label>
          <input
            type="date"
            value={date}
            min={todayStr}                    // {/* ✅ cannot pick before today */}//
            onChange={(e)=>setDate(e.target.value)}
            className="rounded-md border px-3 py-2 bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700"
          />
        </div>

        <div className="flex items-center gap-2 mt-6">
          <input id="fullDayChk" type="checkbox" checked={fullDay} onChange={(e)=>setFullDay(e.target.checked)} />
          <label htmlFor="fullDayChk" className="select-none">Full day</label>
        </div>

        {!fullDay && (
          <div className="w-full mt-3">
            <div className="text-sm mb-2 opacity-80">Select time slots to hide</div>
            <div className="flex flex-wrap gap-2">
              {slots.map(s => {
                const disabled = isPastSlotForDate(s.label, date || todayStr);
                const selected = selectedSlots.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={()=>!disabled && toggleSlot(s.id)}
                    disabled={disabled}
                    className={[
                      "px-3 py-1 rounded-full text-sm border transition",
                      disabled
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                        : selected
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    ].join(" ")}
                    title={disabled ? "Past slot cannot be blacked out" : ""}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="h-[42px] px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          {saving ? "Saving..." : "Save Blackout"}
        </button>
      </div>

      {/* List + cancel buttons */}
      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Upcoming blackouts</div>
        <div className="text-sm space-y-1">
          {list.length === 0 && <div className="opacity-70">None</div>}
          {list.map(b => (
            <div key={b.id} className="opacity-90 flex items-center gap-2">
              <span className="font-mono">{b.date}</span> — {b.full_day ? "Full day" : `Slots: ${b.slot_ids.join(", ") || "-"}`}
              <button
                onClick={() => remove(b.id)}
                className="ml-2 px-2 py-0.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                title="Cancel this blackout"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast.open && (
        <div className="fixed bottom-4 right-4 z-[1000]">
          <div className={`text-white px-4 py-3 rounded-lg shadow-lg ${toast.type === "error" ? "bg-red-600":"bg-emerald-600"}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------- localStorage helpers ---------- */
const LS_TABLES_KEY = "fc_tables_v1";
const loadLocal = () => {
  try { const raw = localStorage.getItem(LS_TABLES_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const saveLocal = (tables) => {
  try { localStorage.setItem(LS_TABLES_KEY, JSON.stringify(tables)); } catch {}
};

/* ---------- small UI bits ---------- */
const Legend = () => (
  <div className="flex flex-wrap items-center gap-3 text-sm">
    <span className="inline-flex items-center gap-2">
      <span className="w-3 h-3 rounded-full bg-gray-900 inline-block" />
      Table
    </span>
    <span className="inline-flex items-center gap-2">
      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
      Drag to place
    </span>
  </div>
);

const TableNode = ({ table }) => (
  <div
    className="rounded- px-4 py-2 text-sm font-medium shadow-sm bg-gray-900 text-white dark:bg-gray-700"
    style={{ width: 130, textAlign: "center" }}
    title={`Table ${table.table_code || table.id} • ${table.capacity} ppl • ${table.price}coins`}
  >
    <div className="text-xs opacity-80">{table.table_code || table.id}</div>
    <div className="text-[11px] opacity-70">
      {table.capacity} people · 
      {table.price}coins
    </div>
  </div>
);

function Toast({ open, type = "success", message, onClose }) {
  if (!open) return null;
  const color = type === "error" ? "bg-red-600" : type === "warn" ? "bg-amber-600" : "bg-emerald-600";
  return (
    <div className="fixed bottom-4 right-4 z-[1000]">
      <div className={`text-white px-4 py-3 rounded-lg shadow-lg ${color}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5">{type === "error" ? "⚠️" : type === "warn" ? "⚠️" : "✅"}</span>
          <div className="whitespace-pre-line">{message}</div>
          <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100" aria-label="Close" title="Close">✕</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function AdminFoodCourt() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPos, setSavingPos] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const [addCapacity, setAddCapacity] = useState(4);
  const [addPrice, setAddPrice] = useState(20);

  const [error, setError] = useState("");

  const [toast, setToast] = useState({ open: false, type: "success", message: "" });
  const showToast = (type, message, timeout = 2500) => {
    setToast({ open: true, type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), timeout);
  };

  const nodeRefs = useRef({});
  const getNodeRef = (id) => {
    if (!nodeRefs.current[id]) nodeRefs.current[id] = createRef();
    return nodeRefs.current[id];
  };

  // Load layout
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/food-court/tables");
        if (!mounted) return;
        const normalized = (res.data?.tables || []).map((t) => ({
          id: t.id,
          table_code: t.table_code,
          capacity: t.capacity,
          price: t.price,
          x: Number(t.pos_x ?? 40),
          y: Number(t.pos_y ?? 40),
        }));
        setTables(normalized);
        saveLocal(normalized);
      } catch (e) {
        console.error("load layout failed:", e?.response?.data || e.message);
        const local = loadLocal();
        setTables(local?.length ? local : [
          { id: "T-1", table_code: "T-1", capacity: 2, price: 10, x: 60, y: 80 },
          { id: "T-2", table_code: "T-2", capacity: 4, price: 15, x: 240, y: 80 },
          { id: "T-3", table_code: "T-3", capacity: 6, price: 25, x: 420, y: 80 },
          { id: "T-4", table_code: "T-4", capacity: 4, price: 15, x: 150, y: 220 },
          { id: "T-5", table_code: "T-5", capacity: 2, price: 10, x: 330, y: 220 },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistPosition = useCallback(async (tableId, x, y) => {
    try {
      await api.patch(`/api/food-court/tables/${tableId}/position`, { x, y });
    } catch (e) {
      console.error("autosave position failed:", e?.response?.data || e.message);
      saveLocal(tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)));
    }
  }, [tables]);

  // After drag ends
  const onDragStop = (id, e, data) => {
    setTables((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, x: data.x, y: data.y } : t));
      saveLocal(next);
      return next;
    });
    // persistPosition(id, data.x, data.y); // optional per-table autosave
    setDirty(true);
  };

  // Bulk confirm (save all positions)
  const confirmLayout = async () => {
    setSavingPos(true);
    setError("");
    try {
      const payload = tables.map(({ id, x, y }) => ({ id, x, y }));
      await api.patch("/api/food-court/tables/positions", { positions: payload });
      setDirty(false);
      showToast("success", "Layout saved successfully ✅");
    } catch (err) {
      console.error("bulk save failed:", err?.response?.data || err.message);
      const msg = err?.response?.data?.message || "Failed to save layout.";
      showToast("error", msg);
    } finally {
      setSavingPos(false);
    }
  };

  // Add N new tables
  const addTables = async (e) => {
    e.preventDefault();
    setError("");

    const count = Math.max(1, Math.min(20, Number(addCount || 1)));
    const capacity = Math.max(1, Math.min(12, Number(addCapacity || 4)));
    const price = Math.max(0, Number(addPrice || 0));

    try {
      const res = await api.post("/api/food-court/tables", { count, capacity, price });
      const created = res.data?.tables || [];
      if (created.length) {
        setTables((prev) => {
          const next = [
            ...prev,
            ...created.map((t, idx) => ({
              id: t.id,
              table_code: t.table_code,
              capacity: t.capacity,
              price: t.price,
              x: Number(t.pos_x ?? 40 + idx * 30),
              y: Number(t.pos_y ?? 40 + idx * 30),
            })),
          ];
          saveLocal(next);
          return next;
        });
        setDirty(true);
        showToast("success", "New tables created.");
      } else {
        const locals = Array.from({ length: count }).map((_, i) => {
          const n = tables.length + 1 + i;
          return { id: `T-${n}`, table_code: `T-${n}`, capacity, price, x: 60 + i * 28, y: 60 + i * 22 };
        });
        setTables((prev) => { const next = [...prev, ...locals]; saveLocal(next); return next; });
        setDirty(true);
        showToast("warn", "Tables added locally (server fallback).");
      }
      setAddOpen(false);
    } catch (err) {
      console.error("create tables failed:", err?.response?.data || err.message);
      const locals = Array.from({ length: count }).map((_, i) => {
        const n = tables.length + 1 + i;
        return { id: `T-${n}`, table_code: `T-${n}`, capacity, price, x: 60 + i * 28, y: 60 + i * 22 };
      });
      setTables((prev) => { const next = [...prev, ...locals]; saveLocal(next); return next; });
      setDirty(true);
      setAddOpen(false);
      showToast("error", "Failed to add on server. Added locally.");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Food Court Layout</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Drag tables to arrange the floor. Click <b>Confirm Layout</b> to save.
          </p>
          <div className="mt-2 text-sm">
            {dirty ? <span className="text-amber-600">Unsaved changes</span> : <span className="opacity-70">No pending changes</span>}
          </div>
          <div className="mt-3"><Legend /></div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            {addOpen ? "Close" : "Add Tables"}
          </button>
          <button
            onClick={confirmLayout}
            disabled={!dirty || savingPos}
            className={`px-4 py-2 rounded-lg font-semibold ${!dirty || savingPos ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
          >
            {savingPos ? "Saving..." : "Confirm Layout"}
          </button>
        </div>
      </div>

      {/* Add Tables Panel */}
      {addOpen && (
        <form
          onSubmit={addTables}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4"
        >
          {/* inputs... */}
          <div>
            <label className="block text-xs mb-1 opacity-70">How many?</label>
            <input type="number" min={1} max={20} value={addCount} onChange={(e) => setAddCount(e.target.value)} className="w-28 rounded-md border px-3 py-2 bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">Capacity</label>
            <input type="number" min={1} max={12} value={addCapacity} onChange={(e) => setAddCapacity(e.target.value)} className="w-28 rounded-md border px-3 py-2 bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">Price</label>
            <input type="number" min={0} value={addPrice} onChange={(e) => setAddPrice(e.target.value)} className="w-28 rounded-md border px-3 py-2 bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700" />
          </div>
          <button type="submit" className="h-[42px] px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600">Create</button>
          {error && <div className="text-red-600 text-sm ml-2">{error}</div>}
        </form>
      )}

      {/* Canvas */}
      <div className="mt-6 relative rounded-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" style={{ height: 540, overflow: "hidden" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {loading && <div className="absolute inset-0 flex items-center justify-center text-sm opacity-80">Loading layout…</div>}
        {!loading && tables.map((t) => {
          const nodeRef = getNodeRef(t.id);
          return (
            <Draggable key={t.id} nodeRef={nodeRef} defaultPosition={{ x: t.x, y: t.y }} grid={[10, 10]} bounds="parent" onStop={(e, data) => onDragStop(t.id, e, data)}>
              <div ref={nodeRef} className="absolute" style={{ touchAction: "none", cursor: "grab" }}>
                <TableNode table={t} />
              </div>
            </Draggable>
          );
        })}
      </div>

      {/* Blackout / Holiday panel */}
      <div className="mt-6 rounded-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-3">Hide Days / Time Slots (Holiday)</h2>
        <BlackoutForm />
        
      </div>

      {/* Footer state */}
      <div className="mt-4 text-sm opacity-80">{savingPos ? "Saving positions…" : "Positions up to date."}</div>

      {/* Toast */}
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
