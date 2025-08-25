import React from "react";

const WalletDashboard = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Wallet Dashboard</h2>
      <p className="mb-2">Balance: $1000</p>
      <p>Recent transactions will be shown here.</p>
    </div>
  );
};

export default React.memo(WalletDashboard);

