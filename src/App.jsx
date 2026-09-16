import { useEffect, useMemo, useState } from 'react';

const navItems = ['Live Floor', 'Orders', 'Parcel', 'Billing', 'Menu', 'Reports'];

const initialMenu = {
  Breakfast: [
    { id: 1, name: 'Idly', description: 'Soft rice cakes', price: 40, prefix: '🍽️' },
    { id: 2, name: 'Dosa', description: 'Crispy golden dosa', price: 60, prefix: '🥞' },
    { id: 8, name: 'Kesari Bath', description: 'Sweet semolina delight', price: 50, prefix: '🍚' }
  ],
  'Main Course': [
    { id: 5, name: 'Meals', description: 'Full meals combo', price: 140, prefix: '🍲' }
  ],
  Rice: [
    { id: 6, name: 'Biriyani', description: 'Traditional biryani', price: 180, prefix: '🍛' }
  ],
  Snacks: [
    { id: 10, name: 'Samosa', description: 'Crispy savory snack', price: 30, prefix: '🥟' }
  ],
  Beverages: [
    { id: 3, name: 'Coffee', description: 'Fresh brewed coffee', price: 35, prefix: '☕' },
    { id: 4, name: 'Tea', description: 'Hot masala tea', price: 25, prefix: '🫖' },
    { id: 7, name: 'Juice', description: 'Fresh fruit juice', price: 70, prefix: '🥤' }
  ],
  Desserts: [
    { id: 9, name: 'Gulab Jamun', description: 'Soft and sweet', price: 45, prefix: '🍮' }
  ]
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function getChange(amount, tendered) {
  const total = Number(amount || 0);
  const paid = Number(tendered || 0);
  return Math.max(0, paid - total);
}

function App() {
  const [activeTab, setActiveTab] = useState('Live Floor');
  const [selectedTableId, setSelectedTableId] = useState(2);
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [bills, setBills] = useState([]);
  const [parcelOrders, setParcelOrders] = useState([]);
  const [sales, setSales] = useState({ today: 0, activeTables: 0, parcelOrders: 0, pendingBills: 0 });
  const [category, setCategory] = useState('Breakfast');
  const [orderItems, setOrderItems] = useState([]);
  const [toast, setToast] = useState('');
  const [parcelForm, setParcelForm] = useState({ customer: '', items: [] });
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/overview');
      const data = await response.json();
      setTables(data.tables);
      setMenu(data.menu.length ? data.menu : Object.values(initialMenu).flat());
      setBills(data.bills);
      setParcelOrders(data.parcelOrders);
      setSales(data.sales);

      const selectedTable = data.tables.find((table) => table.id === 2) || data.tables[0];
      if (selectedTable) {
        setSelectedTableId(selectedTable.id);
        setOrderItems(selectedTable.order || []);
      }
    } catch (error) {
      console.error(error);
      setMenu(Object.values(initialMenu).flat());
      setTables([
        { id: 1, name: 'Table 01', status: 'available', guests: 2, order: [], total: 0 },
        { id: 2, name: 'Table 02', status: 'occupied', guests: 4, order: [{ id: 1, name: 'Idly', qty: 2, price: 40 }, { id: 2, name: 'Dosa', qty: 1, price: 60 }], total: 140 },
        { id: 3, name: 'Table 03', status: 'billing', guests: 3, order: [{ id: 5, name: 'Meals', qty: 1, price: 140 }], total: 140 },
        { id: 4, name: 'Table 04', status: 'available', guests: 2, order: [], total: 0 },
        { id: 5, name: 'Table 05', status: 'occupied', guests: 4, order: [{ id: 2, name: 'Dosa', qty: 1, price: 60 }, { id: 6, name: 'Biriyani', qty: 1, price: 180 }], total: 240 },
        { id: 6, name: 'Table 06', status: 'available', guests: 2, order: [], total: 0 },
        { id: 7, name: 'Table 07', status: 'billing', guests: 5, order: [{ id: 6, name: 'Biriyani', qty: 2, price: 180 }], total: 360 }
      ]);
    }
  };

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) || tables[0],
    [tables, selectedTableId]
  );

  const currentMenu = useMemo(() => {
    const categories = [...new Set(menu.map((item) => item.category))];
    return categories.length ? categories : Object.keys(initialMenu);
  }, [menu]);

  const visibleMenuItems = useMemo(
    () => menu.filter((item) => item.category === category),
    [menu, category]
  );

  const activeOrderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [orderItems]
  );

  const addToOrder = (menuItem) => {
    const existingIndex = orderItems.findIndex((item) => item.id === menuItem.id);
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 };
      setOrderItems(updated);
    } else {
      setOrderItems((previous) => [...previous, { ...menuItem, qty: 1 }]);
    }
    setToast(`${menuItem.name} added to ${selectedTable?.name || 'order'}`);
  };

  const updateQty = (itemId, delta) => {
    setOrderItems((previous) =>
      previous
        .map((item) =>
          item.id === itemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const saveOrder = async () => {
    if (!selectedTable) return;

    const payload = {
      guests: selectedTable.guests || 1,
      items: orderItems,
      status: selectedTable.status === 'billing' ? 'billing' : 'occupied'
    };

    try {
      const response = await fetch(`/api/tables/${selectedTable.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      setToast(result.message || 'Order saved');
      fetchData();
    } catch (error) {
      setToast('Unable to save order right now.');
    }
  };

  const createBill = async () => {
    if (!selectedTable) return;
    try {
      const response = await fetch(`/api/tables/${selectedTable.id}/checkout`, {
        method: 'POST'
      });
      const result = await response.json();
      setToast(result.message || 'Bill generated');
      fetchData();
    } catch (error) {
      setToast('Unable to create bill.');
    }
  };

  const payBill = async (billId, paymentMethod = 'UPI', tenderedAmount = '', paymentData = null) => {
    try {
      const response = await fetch(`/api/bills/${billId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, tenderedAmount, paymentData })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Payment failed');
      }

      setToast(result.message || 'Payment completed');
      setPaymentModal(null);
      fetchData();
    } catch (error) {
      setToast(error.message || 'Payment failed. Try again.');
    }
  };

  const createParcel = async () => {
    if (!parcelForm.customer || !parcelForm.items.length) {
      setToast('Enter customer name and at least one item');
      return;
    }

    try {
      const response = await fetch('/api/parcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parcelForm)
      });
      const result = await response.json();
      setToast(`Parcel #${result.order.id} created`);
      setParcelForm({ customer: '', items: [] });
      fetchData();
    } catch (error) {
      setToast('Parcel order failed');
    }
  };

  const viewReceipt = async (billId) => {
    try {
      const response = await fetch(`/api/receipt/${billId}`);
      const data = await response.json();
      setSelectedReceiptId(data.receipt.id);
      setToast(`Receipt ready for ${data.receipt.reference}`);
    } catch (error) {
      setToast('Receipt unavailable');
    }
  };

  const handleTableSelect = (table) => {
    setSelectedTableId(table.id);
    setOrderItems(table.order || []);
    setActiveTab('Orders');
  };

  const selectedPaymentBill = useMemo(
    () => bills.find((bill) => bill.id === paymentModal?.billId),
    [bills, paymentModal]
  );

  const openPaymentModal = (billId, paymentMethod) => {
    setPaymentModal({ billId, paymentMethod, tenderedAmount: '' });
  };

  const startRazorpayPayment = async (bill) => {
    if (!window.Razorpay) {
      setToast('Razorpay checkout script is not loaded yet.');
      return;
    }

    try {
      const response = await fetch(`/api/bills/${bill.id}/upi-order`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to start UPI payment.');
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Hotel Management System',
        description: `Payment for ${bill.reference}`,
        order_id: data.orderId,
        handler: async function (razorpayResponse) {
          await payBill(bill.id, 'UPI', '', razorpayResponse);
        },
        theme: {
          color: '#f3b761'
        },
        modal: {
          ondismiss: () => {
            setToast('UPI payment cancelled.');
          }
        }
      });

      rzp.open();
    } catch (error) {
      setToast(error.message || 'Unable to start UPI payment.');
    }
  };

  const confirmPayment = async () => {
    if (!selectedPaymentBill) return;

    if (paymentModal.paymentMethod === 'UPI') {
      await startRazorpayPayment(selectedPaymentBill);
      return;
    }

    const tendered = Number(paymentModal.tenderedAmount || 0);
    if (tendered < selectedPaymentBill.amount) {
      setToast('Cash received is less than the bill total.');
      return;
    }

    await payBill(
      selectedPaymentBill.id,
      paymentModal.paymentMethod,
      paymentModal.tenderedAmount
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div className="brand-lockup">
          <div className="brand-mark">S</div>
          <div className="brand-copy">
            <div className="brand-name">Hotel Management System</div>
            <div className="brand-tag">Restaurant POS</div>
          </div>
        </div>

        <nav className="nav-tabs">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-button ${activeTab === item ? 'active' : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <div className="content-shell">
        <main className="main-panel">
          {activeTab === 'Live Floor' && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">Live Floor</h2>
                <span className="pill">{tables.filter((table) => table.status !== 'available').length} active tables</span>
              </div>

              <div className="summary-cards">
                <div className="metric-card">
                  <div className="metric-label">Today</div>
                  <div className="metric-value">{formatCurrency(sales.today)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active tables</div>
                  <div className="metric-value">{sales.activeTables}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Parcel orders</div>
                  <div className="metric-value">{sales.parcelOrders}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Bills pending</div>
                  <div className="metric-value">{sales.pendingBills}</div>
                </div>
              </div>

              <div className="floor-grid" style={{ marginTop: '20px' }}>
                {tables.map((table) => (
                  <button
                    key={table.id}
                    className={`table-card ${table.status} ${selectedTableId === table.id ? 'selected' : ''}`}
                    onClick={() => handleTableSelect(table)}
                  >
                    <div className="table-header">
                      <span className="table-name">{table.name}</span>
                      <span className={`table-state ${table.status}`}>
                        {table.status === 'available' ? 'Available' : table.status === 'occupied' ? 'Active' : 'Billing'}
                      </span>
                    </div>
                    <div className="table-body">
                      <div className="table-meta">
                        {table.status === 'available' ? 'Available' : `${table.guests} guests`}
                      </div>
                      <div className="table-money">
                        {table.status === 'available' ? 'Open' : formatCurrency(table.total || 0)}
                      </div>
                      <div className="table-meta">
                        {table.order.length ? `${table.order.reduce((count, item) => count + item.qty, 0)} items` : 'Ready for seating'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Orders' && selectedTable && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">{selectedTable.name}</h2>
                <span className="pill">{selectedTable.status}</span>
              </div>

              <div className="order-details">
                <div className="detail-card">
                  <div className="detail-top">
                    <div>
                      <h3>{selectedTable.name}</h3>
                      <p className="subtle-text">{selectedTable.guests} guests • {selectedTable.status.toUpperCase()}</p>
                    </div>
                    <span className={`status-tag ${selectedTable.status}`}>
                      {selectedTable.status === 'available' ? 'Available' : selectedTable.status === 'occupied' ? 'Active order' : 'Bill ready'}
                    </span>
                  </div>

                  <div className="action-row">
                    <button className="primary-button" onClick={saveOrder}>Save Order</button>
                    <button className="secondary-button" onClick={createBill}>Generate Bill</button>
                    <button className="ghost-button" onClick={() => setOrderItems([])}>Clear Items</button>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="section-header">
                    <h3 className="section-title">Menu</h3>
                    <span className="pill">{currentMenu.length} categories</span>
                  </div>

                  <div className="category-list">
                    {currentMenu.map((categoryName) => (
                      <button
                        key={categoryName}
                        className={`category-button ${category === categoryName ? 'active' : ''}`}
                        onClick={() => setCategory(categoryName)}
                      >
                        {categoryName}
                      </button>
                    ))}
                  </div>

                  <div className="menu-grid" style={{ marginTop: '16px' }}>
                    {visibleMenuItems.map((item) => (
                      <div key={item.id} className="menu-card">
                        <div>
                          <div style={{ fontSize: '2rem' }}>{item.prefix || '🍽️'}</div>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </div>
                        <div className="menu-card-footer">
                          <div className="menu-price">{formatCurrency(item.price)}</div>
                          <button className="primary-button" onClick={() => addToOrder(item)}>+ Add</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-card">
                  <div className="section-header">
                    <h3 className="section-title">Current Order</h3>
                    <span className="pill">{orderItems.reduce((count, item) => count + item.qty, 0)} items</span>
                  </div>

                  <div className="order-list">
                    {orderItems.length ? (
                      orderItems.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <strong>{item.name}</strong>
                          <div className="qty-controls">
                            <button onClick={() => updateQty(item.id, -1)}>-</button>
                            <span className="qty-value">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)}>+</button>
                          </div>
                          <span>{formatCurrency(item.price * item.qty)}</span>
                          <button className="danger-button" onClick={() => updateQty(item.id, -item.qty)}>Remove</button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <div>
                          <h3>No items yet</h3>
                          <p>Select from the menu to begin the table order.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="order-total">
                    <span>Total</span>
                    <span>{formatCurrency(activeOrderTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Parcel' && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">Parcel Counter</h2>
                <span className="pill">Parcel # {parcelOrders[0]?.id || 1048}</span>
              </div>

              <div className="order-details">
                <div className="detail-card">
                  <div className="form-grid">
                    <input
                      placeholder="Customer name"
                      value={parcelForm.customer}
                      onChange={(event) => setParcelForm({ ...parcelForm, customer: event.target.value })}
                    />
                    <input value={`Parcel #${Math.max(1048, ...parcelOrders.map((order) => order.id)) + 1}`} readOnly />
                  </div>
                  <div className="action-row">
                    <button className="primary-button" onClick={createParcel}>Create Parcel Order</button>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="section-header">
                    <h3 className="section-title">Menu</h3>
                    <span className="pill">Quick add</span>
                  </div>

                  <div className="category-list">
                    {currentMenu.map((categoryName) => (
                      <button
                        key={categoryName}
                        className={`category-button ${category === categoryName ? 'active' : ''}`}
                        onClick={() => setCategory(categoryName)}
                      >
                        {categoryName}
                      </button>
                    ))}
                  </div>

                  <div className="menu-grid" style={{ marginTop: '16px' }}>
                    {visibleMenuItems.map((item) => (
                      <button
                        key={item.id}
                        className="menu-card"
                        onClick={() => {
                          const existing = parcelForm.items.find((entry) => entry.id === item.id);
                          if (existing) {
                            setParcelForm({
                              ...parcelForm,
                              items: parcelForm.items.map((entry) =>
                                entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry
                              )
                            });
                          } else {
                            setParcelForm({
                              ...parcelForm,
                              items: [...parcelForm.items, { ...item, qty: 1 }]
                            });
                          }
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '2rem' }}>{item.prefix || '🍽️'}</div>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </div>
                        <div className="menu-card-footer">
                          <div className="menu-price">{formatCurrency(item.price)}</div>
                          <span className="pill">+ Add</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detail-card">
                  <div className="section-header">
                    <h3 className="section-title">Parcel Items</h3>
                    <span className="pill">{parcelForm.items.reduce((count, item) => count + item.qty, 0)} items</span>
                  </div>

                  <div className="order-list">
                    {parcelForm.items.length ? (
                      parcelForm.items.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <strong>{item.name}</strong>
                          <div className="qty-controls">
                            <button onClick={() => setParcelForm({
                              ...parcelForm,
                              items: parcelForm.items
                                .map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(0, entry.qty - 1) } : entry)
                                .filter((entry) => entry.qty > 0)
                            })}>-</button>
                            <span className="qty-value">{item.qty}</span>
                            <button onClick={() => setParcelForm({
                              ...parcelForm,
                              items: parcelForm.items.map((entry) =>
                                entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry
                              )
                            })}>+</button>
                          </div>
                          <span>{formatCurrency(item.price * item.qty)}</span>
                          <button className="danger-button" onClick={() => setParcelForm({
                            ...parcelForm,
                            items: parcelForm.items.filter((entry) => entry.id !== item.id)
                          })}>Remove</button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <div>
                          <h3>No parcel items</h3>
                          <p>Build a parcel order from the menu cards.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Billing' && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">Bills Ready</h2>
                <span className="pill">{bills.filter((bill) => bill.status === 'ready').length} awaiting payment</span>
              </div>

              {bills.length ? (
                <div>
                  {bills.map((bill) => (
                    <div key={bill.id} className="bill-card">
                      <div className="bill-header">
                        <div>
                          <div className="bill-reference">{bill.reference}</div>
                          <div className="subtle-text">{bill.itemCount} items</div>
                        </div>
                        <div className="bill-total">{formatCurrency(bill.amount)}</div>
                      </div>
                      <div className="action-row">
                        <button className="secondary-button" onClick={() => viewReceipt(bill.id)}>Open</button>
                        <button className="primary-button" onClick={() => openPaymentModal(bill.id, 'cash')}>Cash</button>
                        <button className="ghost-button" onClick={() => openPaymentModal(bill.id, 'UPI')}>UPI</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div>
                    <h3>No pending bills</h3>
                    <p>Nothing is waiting for payment.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Menu' && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">Menu Management</h2>
                <span className="pill">{menu.length} items</span>
              </div>

              <div className="detail-card">
                <div className="menu-grid">
                  {menu.map((item) => (
                    <div key={item.id} className="menu-card">
                      <div>
                        <div style={{ fontSize: '2rem' }}>{item.prefix || '🍽️'}</div>
                        <h4>{item.name}</h4>
                        <p>{item.category}</p>
                      </div>
                      <div className="menu-card-footer">
                        <div className="menu-price">{formatCurrency(item.price)}</div>
                        <button className="secondary-button">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Reports' && (
            <div className="panel order-workspace">
              <div className="section-header">
                <h2 className="section-title">Operations Report</h2>
                <span className="pill">Live metrics</span>
              </div>

              <div className="summary-cards">
                <div className="metric-card">
                  <div className="metric-label">Net Sales</div>
                  <div className="metric-value">{formatCurrency(sales.today)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active Tables</div>
                  <div className="metric-value">{sales.activeTables}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Parcel Orders</div>
                  <div className="metric-value">{sales.parcelOrders}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Pending Bills</div>
                  <div className="metric-value">{sales.pendingBills}</div>
                </div>
              </div>

              <div className="detail-card" style={{ marginTop: '18px' }}>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id}>
                        <td>{bill.reference}</td>
                        <td>{bill.type}</td>
                        <td>{bill.itemCount}</td>
                        <td>{formatCurrency(bill.amount)}</td>
                        <td>{bill.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        <aside className="side-panel">
          <div className="panel order-workspace">
            <div className="section-header">
              <h3 className="section-title">Current Table</h3>
              <span className="pill">{selectedTable?.name || 'None'}</span>
            </div>

            <div className="order-list">
              {selectedTable?.order?.length ? (
                selectedTable.order.map((item) => (
                  <div key={`${selectedTable.id}-${item.id}`} className="order-item-row">
                    <strong>{item.name}</strong>
                    <small>x{item.qty}</small>
                    <span>{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div>
                    <h3>No active order</h3>
                    <p>All tables are currently available.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="order-total">
              <span>Current total</span>
              <span>{formatCurrency(selectedTable?.total || 0)}</span>
            </div>

            <div className="action-row">
              <button className="primary-button" onClick={saveOrder}>Save Order</button>
              <button className="secondary-button" onClick={createBill}>Bill</button>
            </div>
          </div>

          <div className="panel order-workspace" style={{ marginTop: '20px' }}>
            <div className="section-header">
              <h3 className="section-title">Receipt</h3>
              <span className="pill">{selectedReceiptId || 'None'}</span>
            </div>

            <div className="detail-card">
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', textAlign: 'center' }}>Hotel Management System</div>
              <p className="subtle-text" style={{ textAlign: 'center' }}>Table 02 • Paid</p>
              <table className="bill-list">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {[{ name: 'Dosa', qty: 1, total: 60 }, { name: 'Coffee', qty: 2, total: 70 }, { name: 'Meals', qty: 1, total: 140 }].map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.qty}</td>
                      <td>{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="order-total">
                <span>Total</span>
                <span>₹270</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {paymentModal && selectedPaymentBill && (
        <div className="payment-overlay">
          <div className="payment-modal panel">
            <div className="section-header">
              <h3 className="section-title">
                {paymentModal.paymentMethod === 'cash' ? 'Cash Payment' : 'UPI Payment'}
              </h3>
              <button className="secondary-button" onClick={() => setPaymentModal(null)}>Close</button>
            </div>

            <div className="detail-card">
              <div className="bill-reference">{selectedPaymentBill.reference}</div>
              <p className="subtle-text">Bill total: {formatCurrency(selectedPaymentBill.amount)}</p>

              {paymentModal.paymentMethod === 'cash' ? (
                <>
                  <label className="form-label" htmlFor="cashTendered">Cash received from customer</label>
                  <input
                    id="cashTendered"
                    type="number"
                    min="0"
                    placeholder="Enter amount"
                    value={paymentModal.tenderedAmount}
                    onChange={(event) => setPaymentModal({
                      ...paymentModal,
                      tenderedAmount: event.target.value
                    })}
                  />

                  <div className="payment-summary">
                    <span>Change to return</span>
                    <strong>{formatCurrency(getChange(selectedPaymentBill.amount, paymentModal.tenderedAmount))}</strong>
                  </div>
                </>
              ) : (
                <div className="payment-summary">
                  <span>UPI ID</span>
                  <strong>hotelmanagement@upi</strong>
                </div>
              )}
            </div>

            <div className="action-row">
              <button className="primary-button" onClick={confirmPayment}>
                {paymentModal.paymentMethod === 'cash' ? 'Complete Cash Payment' : 'Complete UPI Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#1d1d1d',
          border: '1px solid rgba(243,183,97,0.4)',
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: 'var(--shadow)',
          color: 'var(--text)'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
