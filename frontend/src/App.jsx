
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL;

function App() {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [gst, setGst] = useState("0");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [editId, setEditId] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [authMessage, setAuthMessage] = useState("");


  const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

  async function handleLogin(event) {
    event.preventDefault();
    setAuthMessage("");

    try {
      const response = await fetch(`${API}/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthMessage(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);

      setToken(data.token);
      setUsername(data.username);
      setLoginPassword("");
    } catch {
      setAuthMessage("Django server connect aagala.");
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("username");

      setToken("");
      setUsername("");
      setProducts([]);
      setInvoices([]);
      setCart([]);
      setCustomer("");
      setPage("Dashboard");
    }
  }

  async function loadData() {
    try {
      const [pRes, iRes] = await Promise.all([
        fetch(`${API}/products/`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        }),
        fetch(`${API}/invoices/`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        }),
      ]);

      if (!pRes.ok || !iRes.ok) {
        throw new Error("Unable to load data");
      }

      const pData = await pRes.json();
      const iData = await iRes.json();

      setProducts(Array.isArray(pData) ? pData : pData.results || []);
      setInvoices(Array.isArray(iData) ? iData : iData.results || []);
    } catch {
      setMessage("Unable to load data. Please check the backend server.");
    }
  }

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  function addToCart(product) {
    setCart((oldCart) => {
      const found = oldCart.find((item) => item.id === product.id);

      if (found) {
        return oldCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...oldCart, { ...product, quantity: 1 }];
    });

    setPage("Billing");
    setMessage("");
  }

  function changeQuantity(id, quantity) {
    if (quantity < 1) return;

    setCart((oldCart) =>
      oldCart.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const totalGST = cart.reduce(
    (sum, item) =>
      sum +
      (Number(item.price) *
        item.quantity *
        Number(item.gst_rate)) /
      100,
    0
  );

  const total = subtotal + totalGST;

  const totalSales = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.grand_total || 0),
    0
  );

  async function addProduct(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API}/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name,
          price,
          gst_rate: gst,
          quantity: Number(quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(JSON.stringify(data));
        return;
      }

      setName("");
      setPrice("");
      setQuantity("0");
      setGst("0");
      setMessage("Product added successfully!");
      await loadData();
    } catch {
      setMessage("Unable to connect to the backend server. Please try again.");
    }
  }
  async function editProduct(product) {
    setEditId(product.id);
    setName(product.name);
    setPrice(product.price);
    setQuantity(String(product.quantity ?? 0));
    setGst(String(product.gst_rate));
    setPage("Products");
    setMessage("");
  }

  async function saveProduct(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API}/products/${editId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name,
          price,
          gst_rate: gst,
          quantity: Number(quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(JSON.stringify(data));
        return;
      }

      setEditId(null);
      setName("");
      setPrice("");
      setQuantity("0");
      setGst("0");
      setMessage("Product updated successfully!");
      await loadData();
    } catch {
      setMessage("Unable to update product. Please try again.");
    }
  }


  async function deleteProduct(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API}/products/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete failed:", response.status, errorText);

        setMessage(
          `Delete failed! Status: ${response.status}. Please check the browser console.`
        );
        return;
      }

      setCart((oldCart) =>
        oldCart.filter((item) => item.id !== id)
      );

      setMessage("Product deleted successfully!");
      await loadData();
    } catch (error) {
      console.error("Delete error:", error);
      setMessage("Unable to connect to the backend server.");
    }
  }


  function cancelEdit() {
    setEditId(null);
    setName("");
    setPrice("");
    setGst("0");
    setMessage("");
  }

  async function createBill() {
    if (!cart.length) {
      setMessage("Please add products first.");
      return;
    }

    try {
      const response = await fetch(`${API}/create-invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          customer_name: customer || "Walk-in Customer",
          items: cart.map((item) => ({
            product: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(JSON.stringify(data));
        return;
      }

      setMessage(`Invoice #${data.id} created successfully!`);
      await loadData();

      setTimeout(() => {
        window.print();
        setCart([]);
        setCustomer("");
      }, 500);
    } catch {
      setMessage("Unable to create invoice. Please try again.");
    }
  }

  const sortedInvoices = [...invoices].reverse().slice(0, 5);

  const lowStockCount = products.filter(
    (product) => Number(product.quantity) <= 10
  ).length;

  function SidebarButton({ title, icon }) {
    return (
      <button
        className={`nav-button ${page === title ? "active" : ""}`}
        onClick={() => {
          setPage(title);
          setMessage("");
        }}
      >
        <span>{icon}</span>
        {title}
      </button>
    );
  }
  function ProductCards() {
    return (
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-icon">📦</div>

            <h3>{product.name}</h3>
            <p className="product-price">{money(product.price)}</p>
            <small>GST {product.gst_rate}%</small>

            <p className="product-stock">
              Available Stock: {product.quantity}
            </p>

            {product.quantity <= 10 && (
              <p style={{ color: "red", fontWeight: "bold" }}>
                ⚠️ Low Stock! Refill soon
              </p>
            )}

            <button
              className="primary-button"
              onClick={() => addToCart(product)}
            >
              + Add to Bill
            </button>

            {page === "Products" && (
              <div className="product-actions">
                <button
                  className="primary-button"
                  onClick={() => editProduct(product)}
                >
                  ✏️ Edit
                </button>

                <button
                  className="primary-button"
                  onClick={() => deleteProduct(product.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }
  function InvoiceTable({ items }) {
    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const getInvoiceDate = (date) => {
      if (!date) return "";

      const d = new Date(date);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const filteredInvoices = items.filter((invoice) => {
      const invoiceNumber = `INV-${String(invoice.id).padStart(3, "0")}`;
      const customerName = invoice.customer_name || "Walk-in Customer";

      const searchMatch =
        invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        customerName.toLowerCase().includes(search.toLowerCase());

      const dateMatch =
        selectedDate === "" ||
        getInvoiceDate(invoice.created_at) === selectedDate;

      return searchMatch && dateMatch;
    });

    if (!items.length) {
      return (
        <p className="empty">
          Invoices create pannina inga display aagum.
        </p>
      );
    }

    return (
      <>
        {/* Search and Date Filter */}
        <div className="invoice-filters no-print">
          <input
            type="text"
            placeholder="Search invoice number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <button
            type="button"
            className="clear"
            onClick={() => {
              setSearch("");
              setSelectedDate("");
            }}
          >
            Clear Filters
          </button>
        </div>

        <p className="filter-count no-print">
          Showing {filteredInvoices.length} of {items.length} invoices
        </p>

        {/* Invoice Table */}
        {filteredInvoices.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>INV-{String(invoice.id).padStart(3, "0")}</td>

                    <td>
                      {invoice.customer_name || "Walk-in Customer"}
                    </td>

                    <td>
                      {invoice.created_at
                        ? new Date(invoice.created_at).toLocaleDateString("en-IN")
                        : "-"}
                    </td>

                    <td className="table-amount">
                      {money(invoice.grand_total)}
                    </td>

                    <td className="no-print">
                      <button
                        className="view-button"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">
            No invoices found. Search or date filter change pannunga.
          </p>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div className="invoice-modal">
            <div className="invoice-modal-content">
              <div className="modal-heading no-print">
                <h2>Invoice Details</h2>

                <button
                  className="close-button"
                  onClick={() => setSelectedInvoice(null)}
                >
                  ×
                </button>
              </div>

              <div className="invoice-print-area">
                <div className="print-invoice-header">
                  <h1>SUPERMART</h1>
                  <p>GENERAL STORE</p>
                  <h2>TAX INVOICE</h2>
                </div>

                <div className="invoice-details">
                  <p>
                    <strong>Invoice No:</strong>{" "}
                    INV-{String(selectedInvoice.id).padStart(3, "0")}
                  </p>

                  <p>
                    <strong>Customer:</strong>{" "}
                    {selectedInvoice.customer_name || "Walk-in Customer"}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {selectedInvoice.created_at
                      ? new Date(selectedInvoice.created_at).toLocaleDateString("en-IN")
                      : "-"}
                  </p>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>GST</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedInvoice.items || []).map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.product_name}</td>
                          <td>{money(item.price)}</td>
                          <td>{item.quantity}</td>
                          <td>{item.gst_rate}%</td>
                          <td>{money(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-modal-totals">
                  <p>
                    <span>Subtotal</span>
                    <strong>{money(selectedInvoice.subtotal)}</strong>
                  </p>

                  <p>
                    <span>GST</span>
                    <strong>{money(selectedInvoice.gst_amount)}</strong>
                  </p>

                  <p className="grand-total">
                    <span>Grand Total</span>
                    <strong>{money(selectedInvoice.grand_total)}</strong>
                  </p>
                </div>

                <p className="thank-you">
                  Thank you! Visit Again.
                </p>
              </div>

              <div className="modal-actions no-print">
                <button
                  className="primary-button"
                  onClick={() => window.print()}
                >
                  Print Invoice
                </button>

                <button
                  className="clear"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!token) {
    return (
      <div className="login-container">
        <form className="login-form" onSubmit={handleLogin}>
          <h1>SuperMart</h1>
          <h2>Admin Login</h2>

          <label>Username</label>
          <input
            type="text"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="Enter username"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          {authMessage && <p className="login-error">{authMessage}</p>}

          <button type="submit" className="primary-button">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <h2>SuperMart</h2>
            <p>Billing System</p>
          </div>
        </div>

        <p className="nav-heading">MAIN MENU</p>
        <nav className="navigation">
          <SidebarButton title="Dashboard" icon="▦" />
          <SidebarButton title="Billing" icon="▤" />
          <SidebarButton title="Products" icon="▣" />
          <SidebarButton title="Invoices" icon="▧" />
        </nav>

        <div className="sidebar-bottom">
          <span className="online-dot"></span>
          System connected

          <small>Welcome, {username}</small>
          <small>SuperMart v1.0</small>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header no-print">
          <div>
            <p className="breadcrumb">SuperMart / {page}</p>
            <h1>{page}</h1>
            <p className="page-subtitle">
              {page === "Dashboard" && "Your store overview at a glance."}
              {page === "Billing" && "Create and print customer invoices."}
              {page === "Products" && "Manage your store products."}
              {page === "Invoices" && "View your recent billing history."}
            </p>
          </div>
          <div className="header-date">
            <span>📅</span>
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </header>

        {message && (
          <div className="message no-print">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {page === "Dashboard" && (
          <>
            <section className="stats">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Total Products</span>
                  <span className="stat-icon blue">▣</span>
                </div>
                <h2>{products.length}</h2>
                <p>Products in your store</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Total Bills</span>
                  <span className="stat-icon purple">▤</span>
                </div>
                <h2>{invoices.length}</h2>
                <p>Bills generated</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Total Sales</span>
                  <span className="stat-icon green">₹</span>
                </div>
                <h2>{money(totalSales)}</h2>
                <p>Sales across all bills</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Low Stock Products</span>
                  <span className="stat-icon orange">⚠️</span>
                </div>
                <h2>{lowStockCount}</h2>
                <p>Products with stock of 10 or less</p>
              </article>
            </section>

            <section className="panel dashboard-panel">
              <div className="section-heading">
                <div>
                  <h2>Quick Actions</h2>
                  <p>Choose what you want to do next.</p>
                </div>
              </div>

              <div className="quick-actions">
                <button onClick={() => setPage("Billing")}>
                  <span className="action-icon blue">＋</span>
                  <span>
                    <strong>Create New Bill</strong>
                    <small>Start billing a customer</small>
                  </span>
                  <b>→</b>
                </button>

                <button onClick={() => setPage("Products")}>
                  <span className="action-icon green">▣</span>
                  <span>
                    <strong>Manage Products</strong>
                    <small>Add and view products</small>
                  </span>
                  <b>→</b>
                </button>

                <button onClick={() => setPage("Invoices")}>
                  <span className="action-icon purple">▤</span>
                  <span>
                    <strong>View Invoices</strong>
                    <small>Check billing history</small>
                  </span>
                  <b>→</b>
                </button>
              </div>
            </section>

            <section className="panel recent-panel">
              <div className="section-heading">
                <div>
                  <h2>Recent Invoices</h2>
                  <p>Your latest transactions</p>
                </div>
                <button className="text-button" onClick={() => setPage("Invoices")}>
                  View All →
                </button>
              </div>
              <InvoiceTable items={sortedInvoices} />
            </section>
          </>
        )}

        {page === "Products" && (
          <>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Add New Product</h2>
                  <p>Enter product details below.</p>
                </div>
              </div>

              <form className="product-form" onSubmit={editId !== null ? saveProduct : addProduct}>
                <label>
                  Product Name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rice"
                    required
                  />
                </label>

                <label>
                  Price (₹)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
                <label>
                  Quantity (Stock)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter stock quantity"
                    required
                  />
                </label>

                <label>
                  GST Rate (%)
                  <select value={gst} onChange={(e) => setGst(e.target.value)}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </label>


                <button className="primary-button" type="submit">
                  {editId !== null ? "Save Changes" : "+ Add Product"}
                </button>

                {editId !== null && (
                  <button
                    className="clear"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}

              </form>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Available Products</h2>
                  <p>{products.length} products available</p>
                </div>
              </div>
              {products.length ? (
                <ProductCards />
              ) : (
                <p className="empty">Products innum add pannala.</p>
              )}
            </section>
          </>
        )}

        {page === "Billing" && (
          <section className="billing-layout">
            <div className="billing-products panel">
              <div className="section-heading">
                <div>
                  <h2>Select Products</h2>
                  <p>Click a product to add it to the bill.</p>
                </div>
              </div>
              {products.length ? (
                <ProductCards />
              ) : (
                <p className="empty">
                  Products illa. Products page-la first add pannunga.
                </p>
              )}
            </div>

            <article className="panel bill-panel" id="bill">
              <div className="invoice-header">
                <h1>SUPERMART</h1>
                <p>GENERAL STORE</p>
                <h2>TAX INVOICE</h2>
                <div className="invoice-info">
                  <p>
                    <strong>Invoice Number:</strong>{" "}
                    {invoices.length
                      ? `#INV-${String(invoices[invoices.length - 1].id + 1).padStart(3, "0")}`
                      : "New Invoice"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date().toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <h2 className="bill-title">Customer Bill</h2>

              <label className="customer-input no-print">
                Customer Name
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Walk-in Customer"
                />
              </label>

              <div className="print-customer">
                <strong>Customer Name:</strong>{" "}
                {customer.trim() || "Walk-in Customer"}
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Amount</th>
                      <th className="no-print">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>
                          <input
                            className="qty no-print"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              changeQuantity(item.id, Number(e.target.value))
                            }
                          />
                          <span className="print-qty">{item.quantity}</span>
                        </td>
                        <td>{money(item.price)}</td>
                        <td>{money(Number(item.price) * item.quantity)}</td>
                        <td className="no-print">
                          <button
                            className="remove-button"
                            onClick={() =>
                              setCart((old) =>
                                old.filter((p) => p.id !== item.id)
                              )
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!cart.length && (
                <p className="empty">Products select pannunga.</p>
              )}

              <div className="totals">
                <p>
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </p>
                <p>
                  <span>GST</span>
                  <strong>{money(totalGST)}</strong>
                </p>
                <p className="grand-total">
                  <span>Grand Total</span>
                  <strong>{money(total)}</strong>
                </p>
              </div>

              <button className="checkout no-print" onClick={createBill}>
                Create Invoice & Print
              </button>
              <button
                className="clear no-print"
                onClick={() => {
                  setCart([]);
                  setCustomer("");
                  setMessage("");
                }}
              >
                Clear Bill
              </button>
            </article>
          </section>
        )}

        {page === "Invoices" && (
          <section className="panel recent-panel">
            <div className="section-heading">
              <div>
                <h2>All Invoices</h2>
                <p>{invoices.length} invoices generated</p>
              </div>
              <button
                className="primary-button no-print"
                onClick={() => setPage("Billing")}
              >
                + New Bill
              </button>
            </div>
            <InvoiceTable items={[...invoices].reverse()} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
