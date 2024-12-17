const { db } = require("../db/config");

const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM orders"
    );

    if (totalRecords === 0) {
      return res.status(404).json({ error: "No orders found." });
    }

    const [orders] = await db.query(
      `SELECT * FROM orders ORDER BY added_on DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    if (!orders.length) {
      return res.status(404).json({ error: "No orders found." });
    }

    const ordersWithCustomerInfo = await Promise.all(
      orders.map(async (order) => {
        const [customer] = await db.query(
          "SELECT * FROM customers WHERE customer_id = ?",
          [order.customer_id]
        );

        const [store] = await db.query(
          "SELECT * FROM stores WHERE store_id = ?",
          [order.store_id]
        );

        order.customer = customer || {};
        order.store = store || {};

        return order;
      })
    );

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: ordersWithCustomerInfo,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: parseInt(page, 10),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);

    res.status(500).json({
      error: "An error occurred while fetching the orders.",
      details: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const [order] = await db.query("SELECT * FROM orders WHERE order_id = ?", [
      orderId,
    ]);

    if (!order.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    await db.query("UPDATE orders SET status = ? WHERE order_id = ?", [
      "cancelled",
      orderId,
    ]);

    res.status(200).json({ message: "Order status updated to cancelled." });
  } catch (error) {
    console.error("Error cancelling order:", error);

    res.status(500).json({
      error: "An error occurred while cancelling the order.",
      details: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const [orderItems] = await db.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    );

    if (!orderItems.length) {
      return res.status(404).json({ error: "Order items not found." });
    }

    const orderItemsWithProducts = await Promise.all(
      orderItems.map(async (item) => {
        const [product] = await db.query(
          "SELECT * FROM products WHERE product_id = ?",
          [item.product_id]
        );

        item.product_name = product[0] ? product[0].product_name : null;

        return item;
      })
    );

    res.status(200).json(orderItemsWithProducts);
  } catch (error) {
    console.error("Error fetching order items with product details:", error);

    res.status(500).json({
      error: "An error occurred while fetching the order items and products.",
      details: error.message,
    });
  }
};

const getOrdersByUserId = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [user] = await db.query(
      "SELECT store_id FROM users WHERE user_id = ?",
      [userId]
    );

    if (!user.length) {
      return res.status(404).json({ error: "User not found." });
    }

    const storeId = user[0].store_id;

    const [orders] = await db.query("SELECT * FROM orders WHERE store_id = ?", [
      storeId,
    ]);

    if (!orders.length) {
      return res.status(404).json({ error: "No orders found for this store." });
    }

    const ordersWithCustomerInfo = await Promise.all(
      orders.map(async (order) => {
        const [customer] = await db.query(
          "SELECT * FROM customers WHERE customer_id = ?",
          [order.customer_id]
        );

        const [store] = await db.query(
          "SELECT * FROM stores WHERE store_id = ?",
          [order.store_id]
        );

        order.customer = customer[0] || {};
        order.store = store[0] || {};

        return order;
      })
    );

    res.status(200).json(ordersWithCustomerInfo);
  } catch (error) {
    console.error("Error fetching orders by user ID:", error);

    res.status(500).json({
      error: "An error occurred while fetching orders for this user.",
      details: error.message,
    });
  }
};

module.exports = {
  getOrders,
  cancelOrder,
  getOrderById,
  getOrdersByUserId,
};
