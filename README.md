# Solstice Bistro POS

A custom restaurant POS application with a live floor view, dine-in ordering, parcel counter, billing, UPI/cash payment flow, and menu/report management.

## Features

- Live restaurant floor with table states
- Table order management
- Parcel order workflow
- Billing and payment panel
- UPI payment integration support via Razorpay
- Cash payment flow with automatic change calculation
- Menu management interface
- Reports dashboard
- Responsive custom UI designed for restaurant use

## Tech Stack

- React
- Vite
- Express
- Razorpay SDK
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
│   ├── server.js
│   └── data.json
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the backend

```bash
node server/server.js
```

### 3. Start the frontend

```bash
npm run dev:client
```

### 4. Build for production

```bash
npm run build
```

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

- The app uses local JSON-backed demo data for tables, menu items, bills, and parcel orders.
- The current sample data is stored in `server/data.json`.

## License

This project is for educational/demo purposes.
