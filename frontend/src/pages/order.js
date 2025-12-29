import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchOrders({ signal } = {}) {
    setLoading(true);
    setError("");

    try {
      const data = await apiGet("/api/orders", { signal });
      setOrders(data);
    } catch (e) {
      // AbortError no debe mostrarse como error real
      if (e?.name !== "AbortError") {
        setError(String(e?.message || e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders({ signal: controller.signal });
    return () => controller.abort();
  }, []);

  async function createOrder() {
    setError("");
    try {
      await apiPost("/api/orders", { customerName, items: [] });
      setCustomerName("");
      await fetchOrders(); // recarga lista
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Pedidos</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={customerName}
          placeholder="customerName"
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <button onClick={createOrder} disabled={!customerName || loading}>
          Crear
        </button>
        <button onClick={() => fetchOrders()} disabled={loading}>
          Refrescar
        </button>
        {loading && <span>Cargando...</span>}
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            #{o.id} — {o.customerName ?? "N/A"}
          </li>
        ))}
      </ul>
    </div>
  );
}
