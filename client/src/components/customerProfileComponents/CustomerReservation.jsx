import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ReservationPage = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [guests, setGuests] = useState("");

  const navigate = useNavigate();

  // Updated time slot ranges
  const timeSlots = [
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
    "8:00 PM - 10:00 PM",
  ];

  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];

  // Convert slot start time to 24-hour comparable timestamp
  const getSlotStartTime = (slot) => {
    const [time, modifier] = slot.split(" - ")[0].split(" ");
    let [hours, minutes] = time.split(":");
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    // Convert to 24-hour format
    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    } else if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    const slotDate = new Date(selectedDate ? selectedDate : todayDate);
    slotDate.setHours(hours, minutes, 0, 0);
    return slotDate;
  };

  // Check if a slot is disabled
  const isSlotDisabled = (slot) => {
    if (!selectedDate) return true; // No date selected yet
    const slotTime = getSlotStartTime(slot);

    // Disable if today and slot time is in the past
    if (selectedDate === todayDate && slotTime <= today) {
      return true;
    }
    return false;
  };

  const handleTimeSelect = (time) => {
    if (isSlotDisabled(time)) return;
    setSelectedTime(time);
  };

  const handleNext = () => {
    navigate("/tables", {
      state: {
        date: selectedDate,
        time: selectedTime,
        guests,
      },
    });
  };

  return (
    // Page background + base text color per your palette
    <div className="min-h-screen bg-emerald-50/50 text-gray-800 dark:bg-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Make a Reservation</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Select your preferred date, time, and party size
        </p>

        {/* Card container */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Date Card */}
          <div className="rounded-xl shadow-lg p-6 border w-[400px] h-[350px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Select Date</h2>
            <select
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-emerald-500
                         bg-white text-gray-800 border-gray-300
                         dark:bg-gray-900 dark:text-white dark:border-gray-700"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime(""); // Reset time when date changes
              }}
            >
              <option value="">Choose a date</option>
              <option value={todayDate}>Today ({today.toDateString()})</option>
              <option value="2025-08-26">Tomorrow (Tue, Aug 26)</option>
              <option value="2025-08-27">Wed, Aug 27</option>
              <option value="2025-08-28">Thu, Aug 28</option>
              <option value="2025-08-29">Fri, Aug 29</option>
            </select>
          </div>

          {/* Time Card */}
          <div className="rounded-xl shadow-lg p-6 border w-[400px] h-[350px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Select Time</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {timeSlots.map((time) => {
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
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Party Size Card */}
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
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} Guests
                </option>
              ))}
            </select>

            <div className="mt-6 p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Reservation Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Date: {selectedDate || "--"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Time: {selectedTime || "--"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Guests: {guests || "--"}
              </p>
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
