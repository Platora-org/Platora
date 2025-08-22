// client/src/components/customerProfileComponents/CustomerReservation.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const hm = (h, m = 0) => `${pad2(h)}:${pad2(m)}`;
const to12 = (h, m = 0) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${pad2(m)} ${ampm}`;
};
const formatLong = (d) => dayjs(d).format("ddd MMM D YYYY");

// select dropdown card
function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function FancyDateSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useOutsideClose(boxRef, () => setOpen(false));

  const today = dayjs().startOf("day");
  // today + 0 .. +4
  const opts = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 4; i++) {
      const d = today.add(i, "day");
      const iso = d.format("YYYY-MM-DD");
      const main =
        i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.format("dddd, MMM D");
      const sub = d.format("ddd MMM D YYYY");
      out.push({ iso, main, sub, raw: d });
    }
    return out;
  }, [today]);

  const selected = opts.find((o) => o.iso === value);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-left text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className="truncate">
          {selected ? `${selected.main}` : "Choose a date"}
        </span>
        <span className="pointer-events-none float-right ml-2 text-white/60">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-[#1a2631] shadow-xl">
          {opts.map((o) => (
            <button
              key={o.iso}
              onClick={() => {
                onChange(o.iso);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-white/10"
            >
              <span className="text-sm font-semibold text-white">{o.main}</span>
              <span className="text-xs text-white/60">{o.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
//cards
function DateCard({ dateISO, onChange }) {
  return (
    <div className="rounded-2xl bg-[#111a22] p-5 shadow ring-1 ring-white/5">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xl">🗓️</span>
        <h3 className="text-lg font-semibold text-white">Select Date</h3>
      </div>
      <FancyDateSelect value={dateISO} onChange={onChange} />
      {dateISO && (
        <p className="mt-3 text-sm text-white/70">You picked: <span className="text-white">{formatLong(dateISO)}</span></p>
      )}
    </div>
  );
}

function TimeCard({ start, setStart, end, setEnd }) {

  // start options every 30 min from 11:00 → 19:30 (to allow max 3h until 22:30)

  const startOpts = useMemo(() => {
    const arr = [];
    let h = 11, m = 0;
    while (h < 20 || (h === 19 && m === 30)) {
      arr.push(hm(h, m));
      m += 30;
      if (m >= 60) { m = 0; h += 1; }
      if (h === 19 && m > 30) break;
    }
    return arr;
  }, []);

  // set default end = start + 2h
  function onStartChange(v) {
    setStart(v);
    const [sh, sm] = v.split(":").map(Number);
    const def = dayjs().hour(sh).minute(sm).add(2, "hour");
    setEnd(def.format("HH:mm"));
  }

  // adjust duration min 2h, max 3h
  function adj(deltaHours) {
    if (!start) return;
    const s = dayjs(`2000-01-01T${start}`);
    const cur = dayjs(`2000-01-01T${end || start}`);
    let dur = Math.round((cur.diff(s, "minute") / 60) * 2) / 2; // round .5
    if (!end) dur = 2;
    let next = Math.min(3, Math.max(2, dur + deltaHours));
    const newEnd = s.add(next, "hour");
    // cap latest end 22:30
    const cap = dayjs(`2000-01-01T22:30`);
    setEnd(newEnd.isAfter(cap) ? cap.format("HH:mm") : newEnd.format("HH:mm"));
  }

  return (
    <div className="rounded-2xl bg-[#111a22] p-5 shadow ring-1 ring-white/5">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xl">⏰</span>
        <h3 className="text-lg font-semibold text-white">Select Time</h3>
      </div>

      <label className="mb-2 block text-sm text-white/70">Start</label>
      <select
        value={start || ""}
        onChange={(e) => onStartChange(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" hidden>Select a start time</option>
        {startOpts.map((t) => (
          <option key={t} value={t} className="bg-[#111a22] text-white">
            {to12(Number(t.split(":")[0]), Number(t.split(":")[1]))}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">Duration</p>
          <p className="text-white">
            {start && end
              ? (() => {
                  const s = dayjs(`2000-01-01T${start}`);
                  const e = dayjs(`2000-01-01T${end}`);
                  const mins = e.diff(s, "minute");
                  const hr = Math.floor(mins / 60);
                  const half = mins % 60 ? 0.5 : 0;
                  return `${hr + half} hours`;
                })()
              : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adj(-0.5)}
            disabled={!start}
            className="rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            title="–30 min"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => adj(+0.5)}
            disabled={!start}
            className="rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            title="+30 min"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/60">From</p>
          <p className="font-semibold text-white">
            {start ? to12(Number(start.split(":")[0]), Number(start.split(":")[1])) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/60">To</p>
          <p className="font-semibold text-white">
            {end ? to12(Number(end.split(":")[0]), Number(end.split(":")[1])) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function PartyCard({ dateISO, start, end, party, setParty, onNext }) {
  const canNext = Boolean(dateISO && start && end && party);

  return (
    <div className="rounded-2xl bg-[#111a22] p-5 shadow ring-1 ring-white/5">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xl">👥</span>
        <h3 className="text-lg font-semibold text-white">Party Size</h3>
      </div>

      <select
        value={party || ""}
        onChange={(e) => setParty(Number(e.target.value))}
        className="mb-4 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" hidden>Select number of guests</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} className="bg-[#111a22] text-white">
            {n} {n === 1 ? "Guest" : "Guests"}
          </option>
        ))}
      </select>

      {/* Summary */}
      <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <h4 className="mb-2 text-sm font-semibold text-white">Reservation Summary</h4>
        <p className="text-sm text-white/80">
          <span className="text-white/60">Date:</span>{" "}
          {dateISO ? <span className="text-white">{formatLong(dateISO)}</span> : "—"}
        </p>
        <p className="text-sm text-white/80">
          <span className="text-white/60">Time:</span>{" "}
          {start && end ? (
            <span className="text-white">
              {to12(Number(start.split(":")[0]), Number(start.split(":")[1]))} –{" "}
              {to12(Number(end.split(":")[0]), Number(end.split(":")[1]))}
            </span>
          ) : (
            "—"
          )}
        </p>
        <p className="text-sm text-white/80">
          <span className="text-white/60">Guests:</span>{" "}
          {party ? <span className="text-white">{party}</span> : "—"}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className={`w-full rounded-lg px-4 py-3 font-medium text-white transition
          ${canNext ? "bg-emerald-500 hover:bg-emerald-600" : "cursor-not-allowed bg-white/10 text-white/60"}`}
      >
        Next: Select Table →
      </button>
    </div>
  );
}

//page
export default function CustomerReservation() {
  const [dateISO, setDateISO] = useState("");     // "YYYY-MM-DD"
  const [start, setStart] = useState("");         // "HH:mm"
  const [end, setEnd] = useState("");             // "HH:mm"
  const [party, setParty] = useState(null);

  function handleNext() {
    // navigate to next page (wire your router here)
    // e.g., navigate("/reservations/select-table", { state: { dateISO, start, end, party } });
    console.log({ dateISO, start, end, party });
  }

  return (
    <div className="min-h-screen bg-[#0b1217] px-6 py-8 text-white">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Make a Reservation</h1>
        <p className="mt-1 text-white/70">
          Select your preferred date, time, and party size
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DateCard dateISO={dateISO} onChange={setDateISO} />
        <TimeCard start={start} setStart={setStart} end={end} setEnd={setEnd} />
        <PartyCard
          dateISO={dateISO}
          start={start}
          end={end}
          party={party}
          setParty={setParty}
          onNext={handleNext}
        />
      </section>
    </div>
  );
}
