import React, { useEffect, useState } from "react";
import axiosInstance from '../../utils/axiosInstance';
import { Button, Card } from "./MenuUI";

const InventoryAdjustments = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/restaurants/inventory/adjustments`);
      setAdjustments(res.data);
    } catch (err) {
      console.error("Failed to load adjustments", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    window.open(`http://localhost:3000/restaurants/inventory/adjustments/export`, "_blank");
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

  useEffect(() => {
    load();
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold -mb-9">Inventory Adjustments</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
         <div className=" mb-2 flex justify-end">
            <Button onClick={downloadPDF}>Download PDF</Button>
          </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Direction
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Item Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(a.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {a.direction.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {a.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {a.item_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {a.reason || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

         
        </div>
        </>
      )}
    </Card>
  );
};

export default InventoryAdjustments;
