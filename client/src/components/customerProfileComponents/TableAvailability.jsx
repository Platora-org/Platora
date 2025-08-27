import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Dot = ({ color = "#a855f7" }) => (
  <span
    style={{ backgroundColor: color }}
    className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
  />
);

/** Badges with light/dark variants aligned to your palette */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    // tiers
    vip: "bg-purple-300 text-purple-800 dark:bg-purple-600/80 dark:text-purple-300",
    premium: "bg-amber-200 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300",
    standard: "bg-sky-200 text-sky-800 dark:bg-sky-400/50 dark:text-sky-200",

    // status
    available: "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white",
    occupied: "bg-rose-600 text-white dark:bg-rose-600 dark:text-white",

    // neutral
    neutral: "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white/70",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
};

const TableCard = ({ table, selected, onSelect }) => {
  const unavailable = table.status !== "available";
  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={() => onSelect(table)}
      className={[
        "w-full text-left rounded-2xl transition-all duration-200 p-5",
        // surfaces (light/dark)
        "bg-white dark:bg-gray-800",
        // borders + hover states
        unavailable
          ? "border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60"
          : selected
          ? "border border-emerald-400/50 ring-2 ring-emerald-400/60"
          : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer",
      ].join(" ")}
      aria-pressed={selected ? "true" : "false"}
    >
      <div className="flex items-start justify-between">
        <div className="font-semibold text-gray-900 dark:text-white">{table.name}</div>
        <Badge
          tone={
            table.tier === "VIP" ? "vip" :
            table.tier === "Premium" ? "premium" : "standard"
          }
        >
          {table.tier}
        </Badge>
      </div>

      <div className="mt-2 text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
        <span role="img" aria-label="guests">👥</span>
        <span>{table.capacity} people</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
          ${table.price}/reservation
        </div>
        <Badge tone={table.status === "available" ? "available" : "occupied"}>
          {table.status === "available" ? "Available" : "Occupied"}
        </Badge>
      </div>
    </button>
  );
};

export default function TableAvailability() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState(null);

  // Data from previous screen (date/time/guests)
  const date = state?.date || "--";
  const time = state?.time || "--";
  const guests = Number(state?.guests || 0);

  // Dummy inventory (you’ll later replace with API data filtered by date/time)
  const inventory = useMemo(
    () => ({
      VIP: [
        { id: 1, name: "VIP Table 1", tier: "VIP", capacity: 4, price: 50, status: "available" },
        { id: 2, name: "VIP Table 2", tier: "VIP", capacity: 6, price: 75, status: "available" },
        { id: 3, name: "VIP Table 3", tier: "VIP", capacity: 8, price: 100, status: "occupied" },
      ],
      Premium: [
        { id: 4, name: "Premium Table 1", tier: "Premium", capacity: 4, price: 30, status: "available" },
        { id: 5, name: "Premium Table 2", tier: "Premium", capacity: 4, price: 30, status: "available" },
        { id: 6, name: "Premium Table 3", tier: "Premium", capacity: 6, price: 45, status: "occupied" },
      ],
      Standard: [
        { id: 7, name: "Standard Table 1", tier: "Standard", capacity: 2, price: 15, status: "available" },
        { id: 8, name: "Standard Table 2", tier: "Standard", capacity: 2, price: 15, status: "available" },
        { id: 9, name: "Standard Table 3", tier: "Standard", capacity: 4, price: 20, status: "available" },
        { id: 10, name: "Standard Table 4", tier: "Standard", capacity: 4, price: 20, status: "occupied" },
      ],
    }),
    []
  );

  // Simple capacity filter: only show tables that can fit the party
  const filtered = useMemo(() => {
    const fit = (t) => (guests ? t.capacity >= guests : true);
    return {
      VIP: inventory.VIP.filter(fit),
      Premium: inventory.Premium.filter(fit),
      Standard: inventory.Standard.filter(fit),
    };
  }, [inventory, guests]);

  const confirm = () => {
    if (!selectedTable) return;
    alert(
      `Reserved: ${selectedTable.name}\nDate: ${date}\nTime: ${time}\nGuests: ${guests || "--"}`
    );
    // navigate("/reservation/review", { state: { date, time, guests, table: selectedTable } });
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 text-gray-800 dark:bg-gray-900 dark:text-white">
      {/* Page container */}
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Table Availability</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Date: <span className="font-semibold">{date}</span> · Time:{" "}
            <span className="font-semibold">{time}</span> · Guests:{" "}
            <span className="font-semibold">{guests || "--"}</span>
          </p>
        </div>

        {/* VIP */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Dot color="#a855f7" />
            VIP Tables
          </h2>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.VIP.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                selected={selectedTable?.id === t.id}
                onSelect={setSelectedTable}
              />
            ))}
          </div>
        </section>

        {/* Premium */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Dot color="#f59e0b" />
            Premium Tables
          </h2>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.Premium.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                selected={selectedTable?.id === t.id}
                onSelect={setSelectedTable}
              />
            ))}
          </div>
        </section>

        {/* Standard */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Dot color="#38bdf8" />
            Standard Tables
          </h2>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.Standard.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                selected={selectedTable?.id === t.id}
                onSelect={setSelectedTable}
              />
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="mt-10 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700"
          >
            ← Back
          </button>
          <button
            onClick={confirm}
            disabled={!selectedTable}
            className={[
              "px-5 py-2 rounded-lg font-semibold transition-colors",
              selectedTable
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700"
            ].join(" ")}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}
