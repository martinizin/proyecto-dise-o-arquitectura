import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        setError("");
        const data = await apiGet("/api/orders");
        if (!cancelled) setOrders(data);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function createOrder() {
    setError("");
    try {
      await apiPost("/api/orders", { customerName, items: [] });
      setCustomerName("");
      // recarga
      const data = await apiGet("/api/orders");
      setOrders(data);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Pedidos</h2>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={customerName}
          placeholder="customerName"
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <button onClick={createOrder} disabled={!customerName}>Crear</button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <ul>
        {orders.map((o) => (
          <li key={o.id}>#{o.id} — {o.customerName ?? "N/A"}</li>
        ))}
      </ul>
    </div>
  );
}
