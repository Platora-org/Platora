import db from '../config/db.js';

// Fetch messages for an order
export const fetchMessages = async (req, res) => {
  const { orderId } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE order_id = $1 ORDER BY timestamp ASC',
      [orderId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('SQL error in fetchMessages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {

    console.log("req.user:", req.user);

  try {
    const { order_id, recipient, content } = req.body;
    if (!order_id || !recipient || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const sender = "testcustomer@example.com";//temp
    if (!sender) return res.status(401).json({ error: "Unauthorized" });

    const result = await db.query(
      `INSERT INTO messages (sender, recipient, order_id, content, timestamp)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [sender, recipient, order_id, content]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("SQL error in sendMessage:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};