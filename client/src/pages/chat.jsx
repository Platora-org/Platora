import ChatBox from "../components/ChatBox";

export default function Chat() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Chat for Order #1
      </h1>
      <ChatBox
        orderId={1}
        senderEmail="testcustomer@example.com"
        recipientEmail="newrestaurant@example.com"
      />
    </div>
  );
}







