import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

// connect socket
const socket = io("http://localhost:5000");

const ChatBox = ({ orderId, senderEmail, recipientEmail }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [menuOpenIndex, setMenuOpenIndex] = useState(null); // track which message menu is open
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/customer/profile/messages/${orderId}`);
      setMessages(res.data);
    } catch (err) {
      console.warn("No backend yet, starting with empty messages.");
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();

    socket.on("chatMessage", (msg) => {
      if (msg.order_id === orderId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("chatMessage");
    };
  }, [orderId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageObj = {
      order_id: orderId,
      sender: senderEmail,
      recipient: recipientEmail,
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post("http://localhost:3000/customer/profile/messages", messageObj);
    } catch (err) {
      console.warn("Backend not responding, still sending via socket.");
    }

    socket.emit("chatMessage", messageObj);
    setNewMessage("");
    setMessages((prev) => [...prev, messageObj]);
  };

  // Placeholder handlers for Update/Delete
  const handleUpdate = (index) => {
    const updatedContent = prompt("Edit your message:", messages[index].content);
    if (updatedContent !== null) {
      const updatedMessages = [...messages];
      updatedMessages[index].content = updatedContent;
      setMessages(updatedMessages);
      setMenuOpenIndex(null);
    }
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      const updatedMessages = messages.filter((_, i) => i !== index);
      setMessages(updatedMessages);
      setMenuOpenIndex(null);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg flex flex-col">
      <div className="p-3 border-b border-gray-300 dark:border-gray-700">
        <h2 className="font-bold text-gray-700 dark:text-gray-200">Order Chat</h2>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {messages.map((msg, idx) => {
          const isSender = msg.sender === senderEmail;
          return (
            <div key={idx} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
              <div className={`relative px-3 py-2 rounded-lg shadow text-sm ${isSender ? "bg-green-500 text-white rounded-br-none" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-100 rounded-bl-none"}`}>
                <p>{msg.content}</p>
                <small className="block text-xs opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</small>

                {/* Only sender sees menu when trying to edit or update */}
                {isSender && (
                  <div className="absolute top-1 right-1">
                    <button onClick={() => setMenuOpenIndex(menuOpenIndex === idx ? null : idx)}>
                      &#x22EE;
                    </button>
                    {menuOpenIndex === idx && (
                      <div className="absolute right-0 mt-2 w-24 bg-white dark:bg-gray-700 shadow-lg rounded-lg z-10 flex flex-col">
                        <button
                          className="px-2 py-1 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                          onClick={() => handleUpdate(idx)}
                        >
                          Update
                        </button>
                        <button
                          className="px-2 py-1 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                          onClick={() => handleDelete(idx)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-300 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-400 dark:bg-gray-900 dark:text-white"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;


















