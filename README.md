# Hotel Management System

A full-stack hotel management and restaurant POS application with a live floor view, dine-in ordering, parcel counter, billing, UPI/cash payment flow, menu management, and reports.

## Features

- Live restaurant floor with table states
- Table order management
- Parcel order workflow
- Billing and payment panel
- UPI payment integration support via Razorpay
- Cash payment flow with automatic change calculation
- Menu management interface
- Reports dashboard
- Responsive custom UI designed for hotel and restaurant operations

## Tech Stack

- React
- Vite
- Express
- SQLite database using Node.js `node:sqlite`
- Razorpay SDK for UPI payments
- Custom CSS UI

## Project Structure

```text
.
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── server/
│   └── server.js
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the full application

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend API runs at `http://localhost:3001`.

### 3. Start only the frontend

```bash
npm run dev:client
```

### 4. Build for production

```bash
npm run build
```

## Database

The backend uses a local SQLite database stored at `server/pos.db`. The database is created automatically when the backend starts and contains menu, table, order, bill, and parcel-order data.

The generated database file is ignored by Git. To inspect or edit it, use a SQLite tool such as DB Browser for SQLite.

## Environment Variables

For real UPI payment support, create a `.env` file in the project root:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## Payment Modes

- Cash: enter customer amount and the app calculates change automatically
- UPI: uses Razorpay checkout when credentials are configured

## Notes

- Real UPI payments require valid Razorpay credentials in `.env`.
- Cash payments calculate the customer change automatically.

## License

This project is for educational/demo purposes.
