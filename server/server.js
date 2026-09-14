import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data.json');
const defaultData = {
  tables: [
    { id: 1, name: 'Table 01', status: 'available', guests: 2, order: [], total: 0 },
    { id: 2, name: 'Table 02', status: 'occupied', guests: 4, order: [
      { id: 1, name: 'Idly', qty: 2, price: 40 },
      { id: 2, name: 'Dosa', qty: 1, price: 60 },
      { id: 3, name: 'Coffee', qty: 2, price: 35 }
    ], total: 255 },
    { id: 3, name: 'Table 03', status: 'billing', guests: 3, order: [
      { id: 1, name: 'Meals', qty: 1, price: 120 },
      { id: 4, name: 'Tea', qty: 2, price: 25 }
    ], total: 170 },
    { id: 4, name: 'Table 04', status: 'available', guests: 2, order: [], total: 0 },
    { id: 5, name: 'Table 05', status: 'occupied', guests: 4, order: [
      { id: 2, name: 'Dosa', qty: 2, price: 60 },
      { id: 5, name: 'Meals', qty: 1, price: 140 },
      { id: 3, name: 'Coffee', qty: 1, price: 35 }
    ], total: 295 },
    { id: 6, name: 'Table 06', status: 'available', guests: 2, order: [], total: 0 },
    { id: 7, name: 'Table 07', status: 'billing', guests: 5, order: [
      { id: 6, name: 'Biriyani', qty: 2, price: 180 },
      { id: 7, name: 'Juice', qty: 1, price: 70 }
    ], total: 430 }
  ],
  parcelOrders: [
    { id: 1048, customer: 'Aarav', items: [
      { id: 1, name: 'Idly', qty: 2, price: 40 },
      { id: 3, name: 'Coffee', qty: 1, price: 35 }
    ], total: 115, status: 'ready' },
    { id: 1049, customer: 'Maya', items: [
      { id: 5, name: 'Meals', qty: 1, price: 140 }
    ], total: 140, status: 'preparing' }
  ],
  bills: [
    { id: 'BILL-1021', reference: 'Table 02', type: 'table', amount: 255, status: 'ready', itemCount: 3 },
    { id: 'BILL-1022', reference: 'Table 03', type: 'table', amount: 170, status: 'ready', itemCount: 2 },
    { id: 'BILL-1023', reference: 'Parcel #1048', type: 'parcel', amount: 115, status: 'ready', itemCount: 2 }
  ],
  menu: [
    { id: 1, name: 'Idly', category: 'Breakfast', price: 40, description: 'Soft rice cakes', image: '🍽️' },
    { id: 2, name: 'Dosa', category: 'Breakfast', price: 60, description: 'Crispy golden dosa', image: '🥞' },
    { id: 3, name: 'Coffee', category: 'Beverages', price: 35, description: 'Fresh brewed coffee', image: '☕' },
    { id: 4, name: 'Tea', category: 'Beverages', price: 25, description: 'Hot masala tea', image: '🫖' },
    { id: 5, name: 'Meals', category: 'Main Course', price: 140, description: 'Full meals combo', image: '🍲' },
    { id: 6, name: 'Biriyani', category: 'Rice', price: 180, description: 'Traditional biryani', image: '🍛' },
    { id: 7, name: 'Juice', category: 'Beverages', price: 70, description: 'Fresh fruit juice', image: '🥤' },
    { id: 8, name: 'Kesari Bath', category: 'Breakfast', price: 50, description: 'Sweet semolina delight', image: '🍚' },
    { id: 9, name: 'Gulab Jamun', category: 'Desserts', price: 45, description: 'Soft and sweet', image: '🍮' },
    { id: 10, name: 'Samosa', category: 'Snacks', price: 30, description: 'Crispy savory snack', image: '🥟' }
  ],
  sales: { today: 3255, activeTables: 3, parcelOrders: 2, pendingBills: 3 }
};

const ensureData = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
  }
};

const readData = () => {
  ensureData();
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
};

const writeData = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const computeTableTotal = (items) => items.reduce((sum, item) => sum + item.price * item.qty, 0);

app.get('/api/overview', (_req, res) => {
  const data = readData();
  const tables = data.tables;
  const activeTables = tables.filter((table) => table.status !== 'available').length;
  res.json({
    tables,
    menu: data.menu,
    bills: data.bills,
    parcelOrders: data.parcelOrders,
    sales: {
      today: data.sales.today,
      activeTables,
      parcelOrders: data.parcelOrders.length,
      pendingBills: data.bills.length
    }
  });
});

app.get('/api/menu', (_req, res) => {
  const data = readData();
  res.json(data.menu);
});

app.get('/api/tables', (_req, res) => {
  const data = readData();
  res.json(data.tables);
});

app.get('/api/bills', (_req, res) => {
  const data = readData();
  res.json(data.bills);
});

app.get('/api/parcel', (_req, res) => {
  const data = readData();
  res.json(data.parcelOrders);
});

app.get('/api/payment/config', (_req, res) => {
  res.json({
    configured: Boolean(razorpay),
    keyId: process.env.RAZORPAY_KEY_ID || '',
    provider: 'razorpay'
  });
});

app.post('/api/bills/:id/upi-order', async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({
      message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.'
    });
  }

  const data = readData();
  const bill = data.bills.find((entry) => entry.id === req.params.id);
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

app.post('/api/tables/:id/order', (req, res) => {
  const data = readData();
  const table = data.tables.find((entry) => entry.id === Number(req.params.id));
  if (!table) {
    return res.status(404).json({ message: 'Table not found.' });
  }

  const { items = [], status = 'occupied' } = req.body;
  table.order = items;
  table.total = computeTableTotal(items);
  table.status = items.length ? status : 'available';
  table.guests = req.body.guests || table.guests;

  writeData(data);
  res.json({ message: 'Order updated', table });
});

app.post('/api/tables/:id/checkout', (req, res) => {
  const data = readData();
  const table = data.tables.find((entry) => entry.id === Number(req.params.id));
  if (!table) {
    return res.status(404).json({ message: 'Table not found.' });
  }

  const now = new Date();
  const billId = `BILL-${String(now.getMinutes()).padStart(2, '0')}${Math.floor(Math.random() * 90 + 10)}`;
  const itemCount = table.order.reduce((count, item) => count + item.qty, 0);

  data.bills.push({
    id: billId,
    reference: table.name,
    type: 'table',
    amount: table.total,
    status: 'ready',
    itemCount
  });

  table.status = 'billing';
  table.total = table.total;

  writeData(data);
  res.json({ message: 'Bill generated', billId, table });
});

app.post('/api/bills/:id/pay', (req, res) => {
  const data = readData();
  const bill = data.bills.find((entry) => entry.id === req.params.id);
  if (!bill) {
    return res.status(404).json({ message: 'Bill not found.' });
  }

  const { paymentMethod = 'UPI', tenderedAmount } = req.body || {};

  if (paymentMethod === 'cash') {
    const tendered = Number(tenderedAmount || 0);
    if (tendered < bill.amount) {
      return res.status(400).json({ message: 'Cash received is less than the bill amount.' });
    }

    bill.tenderedAmount = tendered;
    bill.change = tendered - bill.amount;
  } else {
    bill.tenderedAmount = bill.amount;
    bill.change = 0;
  }

  bill.status = 'paid';
  bill.paymentMethod = paymentMethod;
  bill.paidAt = new Date().toISOString();

  const table = data.tables.find((entry) => entry.name === bill.reference);
  if (table) {
    table.status = 'available';
    table.order = [];
    table.total = 0;
  }

  writeData(data);
  res.json({
    message: paymentMethod === 'cash'
      ? `Cash payment completed. Return ${bill.change}`
      : 'UPI payment completed.',
    bill
  });
});

app.post('/api/parcel', (req, res) => {
  const data = readData();
  const { customer, items } = req.body;
  const newOrder = {
    id: Math.max(0, ...data.parcelOrders.map((o) => o.id)) + 1,
    customer: customer || 'Walk-in',
    items,
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    status: 'preparing'
  };

  data.parcelOrders.push(newOrder);
  writeData(data);
  res.json({ message: 'Parcel order created', order: newOrder });
});

app.get('/api/receipt/:id', (req, res) => {
  const data = readData();
  const bill = data.bills.find((entry) => entry.id === req.params.id);
  if (!bill) {
    return res.status(404).json({ message: 'Receipt not found.' });
  }
  res.json({ receipt: { ...bill, title: bill.reference } });
});

app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`POS server running on http://localhost:${PORT}`);
});
