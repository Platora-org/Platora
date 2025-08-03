import React, { useState } from 'react';
import { Card, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/UI/Tab';
import { Input } from '../components/UI/Input';
import { Wallet, CreditCard, FileText } from 'lucide-react';

const CustomerWalletDashboard = () => {
  const [balance, setBalance] = useState(1500);
  const [topUpAmount, setTopUpAmount] = useState("");

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0) {
      setBalance((prev) => prev + amount);
      setTopUpAmount("");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Wallet Balance */}
        <Card className="bg-white shadow-xl rounded-2xl p-4">
          <CardContent>
            <div className="flex items-center gap-4">
              <Wallet className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-xl font-semibold">Rs. {balance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top-Up */}
        <Card className="bg-white shadow-xl rounded-2xl p-4">
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 w-full">
                <CreditCard className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Top-Up Wallet</p>
                </div>
              </div>
              <Input
                placeholder="Enter amount (Rs)"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                type="number"
                min="1"
                className="w-full"
              />
              <Button
                onClick={handleTopUp}
                className="w-full"
                disabled={!topUpAmount || isNaN(parseFloat(topUpAmount)) || parseFloat(topUpAmount) <= 0}
              >
                Top Up Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Download Invoices */}
        <Card className="bg-white shadow-xl rounded-2xl p-4">
          <CardContent>
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Download Invoices</p>
                <Button variant="outline" className="mt-2 w-full">Export All</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="transactions">
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="topups">Top-Ups</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <div className="bg-white shadow-md rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Recent Transactions</h2>
            <p className="text-gray-500">(List of all wallet activity here)</p>
          </div>
        </TabsContent>

        <TabsContent value="topups" className="mt-4">
          <div className="bg-white shadow-md rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Top-Up History</h2>
            <p className="text-gray-500">(List of wallet top-up actions)</p>
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <div className="bg-white shadow-md rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Purchase History</h2>
            <p className="text-gray-500">(List of food purchases)</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerWalletDashboard;
