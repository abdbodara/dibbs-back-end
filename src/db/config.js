const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({ 
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise();

const testConnection = async () => {
  try {
    await db.query('SELECT 1');
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  }
};

module.exports = { db, testConnection };

// const testConnection = () => {
//   return new Promise((resolve, reject) => {
//     pool.getConnection((err, connection) => {
//       if (err) {
//         console.error('Error connecting to the database:', err.message);
//         reject(err); 
//       } else {
//         console.log('Database connected successfully');
//         connection.release();
//         resolve();
//       }
//     });
//   });
// };

// module.exports = { pool: pool.promise(), testConnection };
