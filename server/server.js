import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;
const dbPath = path.join(__dirname, 'pos.db');
const db = new DatabaseSync(dbPath);

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

const defaultMenu = [
  { id: 1, name: 'Idly', category: 'Breakfast', price: 40, description: 'Soft rice cakes', prefix: '???' },
  { id: 2, name: 'Dosa', category: 'Breakfast', price: 60, description: 'Crispy golden dosa', prefix: '??' },
  { id: 3, name: 'Coffee', category: 'Beverages', price: 35, description: 'Fresh brewed coffee', prefix: '?' },
  { id: 4, name: 'Tea', category: 'Beverages', price: 25, description: 'Hot masala tea', prefix: '??' },
  { id: 5, name: 'Meals', category: 'Main Course', price: 140, description: 'Full meals combo', prefix: '??' },
  { id: 6, name: 'Biriyani', category: 'Rice', price: 180, description: 'Traditional biryani', prefix: '??' },
  { id: 7, name: 'Juice', category: 'Beverages', price: 70, description: 'Fresh fruit juice', prefix: '??' },
  { id: 8, name: 'Kesari Bath', category: 'Breakfast', price: 50, description: 'Sweet semolina delight', prefix: '??' },
  { id: 9, name: 'Gulab Jamun', category: 'Desserts', price: 45, description: 'Soft and sweet', prefix: '??' },
  { id: 10, name: 'Samosa', category: 'Snacks', price: 30, description: 'Crispy savory snack', prefix: '??' }
];

const defaultTables = [
  { id: 1, name: 'Table 01', status: 'available', guests: 2, total: 0 },
  { id: 2, name: 'Table 02', status: 'occupied', guests: 4, total: 255 },
  { id: 3, name: 'Table 03', status: 'billing', guests: 3, total: 170 },
  { id: 4, name: 'Table 04', status: 'available', guests: 2, total: 0 },
  { id: 5, name: 'Table 05', status: 'occupied', guests: 4, total: 295 },
  { id: 6, name: 'Table 06', status: 'available', guests: 2, total: 0 },
  { id: 7, name: 'Table 07', status: 'billing', guests: 5, total: 430 }
];

const defaultTableOrders = {
  2: [
    { id: 1, qty: 2, price: 40 },
    { id: 2, qty: 1, price: 60 },
    { id: 3, qty: 2, price: 35 }
  ],
  3: [
    { id: 5, qty: 1, price: 120 },
    { id: 4, qty: 2, price: 25 }
  ],
  5: [
    { id: 2, qty: 2, price: 60 },
    { id: 5, qty: 1, price: 140 },
    { id: 3, qty: 1, price: 35 }
  ],
  7: [
    { id: 6, qty: 2, price: 180 },
    { id: 7, qty: 1, price: 70 }
  ]
};

const defaultBills = [
  { id: 'BILL-1021', reference: 'Table 02', type: 'table', amount: 255, status: 'ready', itemCount: 5 },
  { id: 'BILL-1022', reference: 'Table 03', type: 'table', amount: 170, status: 'ready', itemCount: 3 },
  { id: 'BILL-1023', reference: 'Parcel #1048', type: 'parcel', amount: 115, status: 'ready', itemCount: 2 }
];

const defaultParcelOrders = [
  {
    id: 1048,
    customer: 'Aarav',
    items: [
      { id: 1, qty: 2, price: 40 },
      { id: 3, qty: 1, price: 35 }
    ],
    total: 115,
    status: 'ready'
  },
  {
    id: 1049,
    customer: 'Maya',
    items: [
      { id: 5, qty: 1, price: 140 }
    ],
    total: 140,
    status: 'preparing'
  }
];

const computeTableTotal = (items) => items.reduce((sum, item) => sum + item.price * item.qty, 0);

const normalizeTable = (row, order = []) => ({
  id: row.id,
  name: row.name,
  status: row.status,
  guests: row.guests,
  total: row.total,
  order
});

const initializeDatabase = () => {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      prefix TEXT
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      guests INTEGER NOT NULL,
      total INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS table_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menu(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      itemCount INTEGER NOT NULL,
      tenderedAmount INTEGER,
      change INTEGER,
      paymentMethod TEXT,
      paidAt TEXT
    );

    CREATE TABLE IF NOT EXISTS parcel_orders (
      id INTEGER PRIMARY KEY,
      customer TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parcel_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcel_order_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      FOREIGN KEY (parcel_order_id) REFERENCES parcel_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menu(id)
    );
  `);

  const menuCount = db.prepare('SELECT COUNT(*) AS cnt FROM menu').get().cnt;
  if (menuCount === 0) {
    const insertMenu = db.prepare(
      'INSERT INTO menu (id, name, category, price, description, prefix) VALUES (?, ?, ?, ?, ?, ?)'
    );

    defaultMenu.forEach((item) => {
      insertMenu.run(item.id, item.name, item.category, item.price, item.description, item.prefix);
    });
  }

  const tableCount = db.prepare('SELECT COUNT(*) AS cnt FROM tables').get().cnt;
  if (tableCount === 0) {
    const insertTable = db.prepare(
      'INSERT INTO tables (id, name, status, guests, total) VALUES (?, ?, ?, ?, ?)'
    );

    defaultTables.forEach((table) => {
      insertTable.run(table.id, table.name, table.status, table.guests, table.total);
    });
  }

  const orderCount = db.prepare('SELECT COUNT(*) AS cnt FROM table_order_items').get().cnt;
  if (orderCount === 0) {
    const insertOrderItem = db.prepare(
      'INSERT INTO table_order_items (table_id, menu_id, qty, price) VALUES (?, ?, ?, ?)'
    );

    Object.entries(defaultTableOrders).forEach(([tableId, items]) => {
      items.forEach((item) => {
        insertOrderItem.run(Number(tableId), item.id, item.qty, item.price);
      });
    });
  }

  const billCount = db.prepare('SELECT COUNT(*) AS cnt FROM bills').get().cnt;
  if (billCount === 0) {
    const insertBill = db.prepare(
      'INSERT INTO bills (id, reference, type, amount, status, itemCount, tenderedAmount, change, paymentMethod, paidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    defaultBills.forEach((bill) => {
      insertBill.run(
        bill.id,
        bill.reference,
        bill.type,
        bill.amount,
        bill.status,
        bill.itemCount,
        bill.tenderedAmount ?? null,
        bill.change ?? null,
        bill.paymentMethod ?? null,
        bill.paidAt ?? null
      );
    });
  }

  const parcelCount = db.prepare('SELECT COUNT(*) AS cnt FROM parcel_orders').get().cnt;
  if (parcelCount === 0) {
    const insertParcel = db.prepare(
      'INSERT INTO parcel_orders (id, customer, total, status) VALUES (?, ?, ?, ?)'
    );
    const insertParcelItem = db.prepare(
      'INSERT INTO parcel_order_items (parcel_order_id, menu_id, qty, price) VALUES (?, ?, ?, ?)'
    );

    defaultParcelOrders.forEach((order) => {
      insertParcel.run(order.id, order.customer, order.total, order.status);
      order.items.forEach((item) => {
        insertParcelItem.run(order.id, item.id, item.qty, item.price);
      });
    });
  }
};

const getMenu = () => db.prepare('SELECT * FROM menu ORDER BY category, id ASC').all();

const getBills = () => db.prepare('SELECT * FROM bills ORDER BY id DESC').all();

const getTables = () => {
  const tables = db.prepare('SELECT * FROM tables ORDER BY id').all();
  const tableRows = db.prepare(`
    SELECT toi.table_id, m.id AS menu_id, m.name, m.category, m.price, toi.qty
    FROM table_order_items toi
    JOIN menu m ON m.id = toi.menu_id
    ORDER BY toi.table_id, toi.id
  `).all();

  const grouped = new Map();
  tables.forEach((table) => grouped.set(table.id, normalizeTable(table, [])));

  tableRows.forEach((row) => {
    const table = grouped.get(row.table_id);
    if (table) {
      table.order.push({
        id: row.menu_id,
        name: row.name,
        qty: row.qty,
        price: row.price,
        category: row.category
      });
    }
  });

  grouped.forEach((table) => {
    table.total = table.order.reduce((sum, item) => sum + item.price * item.qty, 0);
    db.prepare('UPDATE tables SET total = ? WHERE id = ?').run(table.total, table.id);
  });

  return Array.from(grouped.values());
};

const getParcelOrders = () => {
  const orders = db.prepare('SELECT * FROM parcel_orders ORDER BY id DESC').all();
  const items = db.prepare(`
    SELECT poi.parcel_order_id, m.id AS menu_id, m.name, m.category, m.price, poi.qty
    FROM parcel_order_items poi
    JOIN menu m ON m.id = poi.menu_id
    ORDER BY poi.parcel_order_id, poi.id
  `).all();

  const grouped = new Map();
  orders.forEach((order) => grouped.set(order.id, { ...order, items: [] }));

  items.forEach((item) => {
    const order = grouped.get(item.parcel_order_id);
    if (order) {
      order.items.push({
        id: item.menu_id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        category: item.category
      });
    }
  });

  grouped.forEach((order) => {
    order.total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    db.prepare('UPDATE parcel_orders SET total = ? WHERE id = ?').run(order.total, order.id);
  });

  return Array.from(grouped.values());
};

const getOverview = () => {
  const tables = getTables();
  const menu = getMenu();
  const bills = getBills();
  const parcelOrders = getParcelOrders();
  const activeTables = tables.filter((table) => table.status !== 'available').length;
  const paidSales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM bills
    WHERE status = 'paid'
  `).get().total;

  return {
    tables,
    menu,
    bills,
    parcelOrders,
    sales: {
      today: Number(paidSales || 0),
      activeTables,
      parcelOrders: parcelOrders.length,
      pendingBills: bills.filter((bill) => bill.status === 'ready').length
    }
  };
};

initializeDatabase();

app.use(cors());
app.use(express.json());

app.get('/api/overview', (_req, res) => {
  res.json(getOverview());
});

app.get('/api/menu', (_req, res) => {
  res.json(getMenu());
});

app.get('/api/tables', (_req, res) => {
  res.json(getTables());
});

app.get('/api/bills', (_req, res) => {
  res.json(getBills());
});

app.get('/api/parcel', (_req, res) => {
  res.json(getParcelOrders());
});

app.get('/api/payment/config', (_req, res) => {
  res.json({
    configured: Boolean(razorpay),
    keyId: process.env.RAZORPAY_KEY_ID || '',
    provider: 'razorpay'
  });
});

app.post('/api/tables/:id/order', (req, res) => {
  const tableId = Number(req.params.id);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);

  if (!table) {
    return res.status(404).json({ message: 'Table not found.' });
  }

  const { items = [], status = 'occupied', guests } = req.body;
  const total = computeTableTotal(items);

  db.exec('BEGIN');
  db.prepare('DELETE FROM table_order_items WHERE table_id = ?').run(tableId);

  if (items.length) {
    const insertItem = db.prepare(
      'INSERT INTO table_order_items (table_id, menu_id, qty, price) VALUES (?, ?, ?, ?)'
    );

    items.forEach((item) => {
      insertItem.run(tableId, item.id, item.qty, item.price);
    });
  }

  db.prepare(
    'UPDATE tables SET status = ?, guests = ?, total = ? WHERE id = ?'
  ).run(items.length ? status : 'available', guests || table.guests, total, tableId);
  db.exec('COMMIT');

  res.json({
    message: 'Order updated',
    table: normalizeTable(
      db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId),
      items
    )
  });
});

app.post('/api/tables/:id/checkout', (req, res) => {
  const tableId = Number(req.params.id);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);

  if (!table) {
    return res.status(404).json({ message: 'Table not found.' });
  }

  const orderItems = db.prepare(`
    SELECT toi.menu_id AS id, m.name, toi.qty, toi.price
    FROM table_order_items toi
    JOIN menu m ON m.id = toi.menu_id
    WHERE toi.table_id = ?
  `).all(tableId);

  if (!orderItems.length) {
    return res.status(400).json({ message: 'Table has no active items to bill.' });
  }

  const amount = computeTableTotal(orderItems);
  const billId = `BILL-${Date.now()}`;

  db.prepare(
    'INSERT INTO bills (id, reference, type, amount, status, itemCount) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(billId, table.name, 'table', amount, 'ready', orderItems.reduce((count, item) => count + item.qty, 0));

  db.prepare('UPDATE tables SET status = ?, total = ? WHERE id = ?').run('billing', amount, tableId);

  res.json({ message: 'Bill generated', billId, table: normalizeTable(table, orderItems) });
});

app.post('/api/bills/:id/pay', (req, res) => {
  const billId = req.params.id;
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);

  if (!bill) {
    return res.status(404).json({ message: 'Bill not found.' });
  }

  const { paymentMethod = 'UPI', tenderedAmount, paymentData } = req.body || {};

  if (paymentMethod === 'cash') {
    const tendered = Number(tenderedAmount || 0);
    if (tendered < bill.amount) {
      return res.status(400).json({ message: 'Cash received is less than the bill amount.' });
    }

    db.prepare(
      'UPDATE bills SET status = ?, paymentMethod = ?, tenderedAmount = ?, change = ?, paidAt = ? WHERE id = ?'
    ).run('paid', 'cash', tendered, tendered - bill.amount, new Date().toISOString(), billId);
  } else {
    db.prepare(
      'UPDATE bills SET status = ?, paymentMethod = ?, tenderedAmount = ?, change = ?, paidAt = ? WHERE id = ?'
    ).run('paid', 'UPI', bill.amount, 0, new Date().toISOString(), billId);

    if (paymentData) {
      db.prepare(
        'UPDATE bills SET paymentMethod = ?, tenderedAmount = ?, change = ?, paidAt = ? WHERE id = ?'
      ).run('UPI', bill.amount, 0, new Date().toISOString(), billId);
    }
  }

  const targetTable = db.prepare('SELECT * FROM tables WHERE name = ?').get(bill.reference);
  if (targetTable) {
    db.prepare('DELETE FROM table_order_items WHERE table_id = ?').run(targetTable.id);
    db.prepare('UPDATE tables SET status = ?, guests = guests, total = 0 WHERE id = ?').run('available', targetTable.id);
  }

  const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
  res.json({
    message: paymentMethod === 'cash'
      ? `Cash payment completed. Return ${updatedBill.change}`
      : 'UPI payment completed.',
    bill: updatedBill
  });
});

app.post('/api/bills/:id/upi-order', async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({
      message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.'
    });
  }

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ message: 'Bill not found.' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(bill.amount * 100),
      currency: 'INR',
      receipt: bill.id,
      notes: {
        reference: bill.reference,
        type: bill.type
      }
    });

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to create Razorpay order.' });
  }
});

app.post('/api/parcel', (req, res) => {
  const { customer, items } = req.body;

  if (!customer || !items || !items.length) {
    return res.status(400).json({ message: 'Customer name and items are required.' });
  }

  const nextId = Number(db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM parcel_orders').get().nextId);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  db.prepare('INSERT INTO parcel_orders (id, customer, total, status) VALUES (?, ?, ?, ?)')
    .run(nextId, customer, total, 'preparing');

  const insertItem = db.prepare(
    'INSERT INTO parcel_order_items (parcel_order_id, menu_id, qty, price) VALUES (?, ?, ?, ?)'
  );

  items.forEach((item) => {
    insertItem.run(nextId, item.id, item.qty, item.price);
  });

  res.json({
    message: 'Parcel order created',
    order: { id: nextId, customer, items, total, status: 'preparing' }
  });
});

app.get('/api/receipt/:id', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);

  if (!bill) {
    return res.status(404).json({ message: 'Receipt not found.' });
  }

  const referenceTable = db.prepare('SELECT * FROM tables WHERE name = ?').get(bill.reference);
  const receiptItems = referenceTable
    ? db.prepare(`
        SELECT m.name, toi.qty, toi.price
        FROM table_order_items toi
        JOIN menu m ON m.id = toi.menu_id
        WHERE toi.table_id = ?
      `).all(referenceTable.id)
    : [];

  res.json({
    receipt: {
      ...bill,
      title: bill.reference,
      items: receiptItems
    }
  });
});

app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`POS server running on http://localhost:${PORT}`);
});
