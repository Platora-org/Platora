import React from 'react';

const CustomerReservation = ({ reservation }) => {
    if (!reservation) {
        return <div>No reservation data available.</div>;
    }

    return (
        <div className="customer-reservation">
            <h2>Reservation Details</h2>
            <ul>
                <li><strong>Reservation ID:</strong> {reservation.id}</li>
                <li><strong>Date:</strong> {reservation.date}</li>
                <li><strong>Time:</strong> {reservation.time}</li>
                <li><strong>Guests:</strong> {reservation.guests}</li>
                <li><strong>Status:</strong> {reservation.status}</li>
            </ul>
        </div>
    );
};

export default CustomerReservation;