import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

const ReservationPage = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [guests, setGuests] = useState("");
  const [slots, setSlots] = useState([
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
    "8:00 PM - 10:00 PM",
  ]);

  const [blackout, setBlackout] = useState(null); // { full_day, slot_ids: [ids], id }
  const [slotIndexByLabel, setSlotIndexByLabel] = useState({}); // label -> slot_id

  const [notice, setNotice] = useState(""); // customer-facing message

  const navigate = useNavigate();

  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];

  // Helper: slot label -> Date for START
  const getSlotStartTime = (slotLabel, baseDateStr) => {
    const [start] = slotLabel.split(" - ");
    const [time, ampm] = start.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const d = new Date(baseDateStr);
    d.setHours(h, m || 0, 0, 0);
    return d;
  };

  // Load master slot list + IDs so we can map blacked-out slot ids to labels
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/reservations/availability/time-slots", {
          params: { date: todayDate }
        });
        const serverSlots = data.slots || [];
        if (serverSlots.length) {
          setSlots(serverSlots.map(s => s.label));
          const map = {};
          serverSlots.forEach(s => { map[s.label] = s.id; });
          setSlotIndexByLabel(map);
        }
      } catch (e) {
        // fall back to static labels already in state
      }
    })();
  }, []);

  // Fetch blackout info when date changes (4-day window was your default view; we query exact date)
  useEffect(() => {
    (async () => {
      setNotice("");
      setBlackout(null);
      setSelectedTime(""); // reset time when date changes
      if (!selectedDate) return;

      try {
        const { data } = await api.get("/api/admin/availability/blackouts", {
          params: { from: selectedDate, to: selectedDate }
        });
        const b = (data.blackouts || [])[0] || null;
        setBlackout(b || null);
        if (b?.full_day) {
          setNotice("We are closed on this date.");
        } else if (b?.slot_ids?.length) {
          setNotice("Some time slots are closed on this date.");
        } else {
          setNotice("");
        }
      } catch {}
    })();
  }, [selectedDate]);

  // Slot disabled logic (past time, full-day blackout, or slot blackout)
  const isSlotDisabled = (slotLabel) => {
    if (!selectedDate) return true;

    // Full-day closed
    if (blackout?.full_day) return true;

    // Past time today
    if (selectedDate === todayDate) {
      const start = getSlotStartTime(slotLabel, selectedDate);
      if (start <= today) return true;
    }

    // Partial-day blackout: check if the slot's id is in slot_ids
    if (blackout?.slot_ids?.length && slotIndexByLabel[slotLabel] != null) {
      if (blackout.slot_ids.includes(slotIndexByLabel[slotLabel])) return true;
    }

    return false;
  };

  const handleTimeSelect = (time) => {
    if (isSlotDisabled(time)) return;
    setSelectedTime(time);
  };

  const handleNext = () => {
    navigate("/tables", {
      state: { date: selectedDate, time: selectedTime, guests },
    });
  };

  // Build the 4-day date options (today + next 3)
  const dateOptions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const val = d.toISOString().slice(0,10);
      arr.push({ value: val, label: d.toDateString() });
    }
    return arr;
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50/50 text-gray-800 dark:bg-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Make a Reservation</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Select your preferred date, time, and party size
        </p>

        {/* Optional notice */}
        {notice && (
          <div className="mb-4 rounded-lg border p-3 text-sm bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">
            {notice}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Date */}
          <div className="rounded-xl shadow-lg p-6 border w-[400px] h-[350px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Select Date</h2>
            <select
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-emerald-500
                         bg-white text-gray-800 border-gray-300
                         dark:bg-gray-900 dark:text-white dark:border-gray-700"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="">Choose a date</option>
              {dateOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.value === todayDate ? `Today (${o.label})` : o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="rounded-xl shadow-lg p-6 border w-[400px] h-[350px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Select Time</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {slots.map((time) => {
                const disabled = isSlotDisabled(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    disabled={disabled}
                    className={[
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                      disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                        : isSelected
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700",
                    ].join(" ")}
                    title={disabled ? "Unavailable" : ""}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guests + Summary */}
          <div className="rounded-xl shadow-lg p-6 border w-[400px] h-[350px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Party Size</h2>
            <select
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-emerald-500
                         bg-white text-gray-800 border-gray-300
                         dark:bg-gray-900 dark:text-white dark:border-gray-700"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            >
              <option value="">Select number of guests</option>
              {[1,2,3,4,5,6,7,8].map((n)=>(
                <option key={n} value={n}>{n} Guests</option>
              ))}
            </select>

            <div className="mt-6 p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Reservation Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date: {selectedDate || "--"}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Time: {selectedTime || "--"}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Guests: {guests || "--"}</p>
            </div>

            <button
              onClick={handleNext}
              disabled={!selectedDate || !selectedTime || !guests}
              className={[
                "mt-4 w-full py-3 rounded-lg font-semibold transition-all duration-300",
                !selectedDate || !selectedTime || !guests
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                  : "bg-emerald-500 text-white hover:bg-emerald-600",
              ].join(" ")}
            >
              Next: Select Table →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
