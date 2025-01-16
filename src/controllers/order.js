const { db } = require("../db/config");

const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.searchTerm || "";

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM orders " +
        "JOIN customers ON orders.customer_id = customers.customer_id " +
        "JOIN stores ON orders.store_id = stores.store_id " +
        "WHERE orders.order_id LIKE ? OR customers.first_name LIKE ? OR customers.last_name LIKE ? OR stores.store_name LIKE ?",
      [
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
      ]
    );

    if (totalRecords === 0) {
      return res.status(200).json({
        data: [],
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        },
      });
    }

    const [orders] = await db.query(
      `SELECT orders.*, customers.first_name, customers.last_name, stores.store_name
       FROM orders
       JOIN customers ON orders.customer_id = customers.customer_id
       JOIN stores ON orders.store_id = stores.store_id
       WHERE orders.order_id LIKE ? OR customers.first_name LIKE ? OR customers.last_name LIKE ? OR stores.store_name LIKE ?
       ORDER BY orders.added_on DESC LIMIT ? OFFSET ?`,
      [
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        limit,
        offset,
      ]
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

        const [orderItemsCount] = await db.query(
          "SELECT COUNT(*) as itemsCount FROM order_items WHERE order_id = ?",
          [order.order_id]
        );

        order.order_items_count = orderItemsCount[0]?.itemsCount;
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
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const searchQuery = req.query.searchTerm || "";

  try {
    const [user] = await db.query(
      "SELECT store_id FROM users WHERE user_id = ?",
      [userId]
    );
    if (!user.length) {
      return res.status(200).json({
        data: [],
        message: "User not found.",
        pagination: null,
      });
    }

    if (!user.length) {
      return res.status(404).json({ error: "User not found." });
    }

    const storeId = user[0].store_id;

    const [[{ totalRecords }]] = await db.query(
      "SELECT COUNT(*) as totalRecords FROM orders o " +
        "JOIN customers c ON o.customer_id = c.customer_id " +
        "JOIN stores s ON o.store_id = s.store_id " +
        "WHERE o.store_id = ? AND (o.order_id LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR s.store_name LIKE ?)",
      [
        storeId,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
      ]
    );

    if (totalRecords === 0) {
      return res.status(200).json({
        data: [],
        message: "No orders found for this store.",
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        },
      });
    }

    const [orders] = await db.query(
      `SELECT o.*, c.first_name, c.last_name, s.store_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN stores s ON o.store_id = s.store_id
       WHERE o.store_id = ? AND (o.order_id LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR s.store_name LIKE ?)
       ORDER BY o.added_on DESC LIMIT ? OFFSET ?`,
      [
        storeId,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        limit,
        offset,
      ]
    );

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

        const [orderItemsCount] = await db.query(
          "SELECT COUNT(*) as itemsCount FROM order_items WHERE order_id = ?",
          [order.order_id]
        );
        order.order_items_count = orderItemsCount[0]?.itemsCount;
        order.customer = customer[0] || {};
        order.store = store[0] || {};

        return order;
      })
    );

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      data: ordersWithCustomerInfo,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
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
