import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api.js";

function StatusBadge({ status }) {
  const cls = status === "NOTIFIED" ? "ok" : "warn";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [total, setTotal] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet("/api/orders");
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreate = async () => {
    if (!customerName.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const newOrder = {
        customerName: customerName.trim(),
        total: parseFloat(total) || 0,
      };
      await apiPost("/api/orders", newOrder);
      setCustomerName("");
      setTotal("");
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid">
      <section className="card" style={{ gridColumn: "span 5" }}>
        <h3 className="h3">Crear pedido</h3>
        <p className="small">Conectado al API Gateway: <code>/api/orders</code></p>

        <div style={{ marginTop: "var(--space-4)", display: "grid", gap: "var(--space-4)" }}>
          <div>
            <label htmlFor="customer-name" className="small" style={{ display: "block", marginBottom: "var(--space-2)", color: "var(--text)" }}>
              Nombre del cliente
            </label>
            <input 
              id="customer-name"
              className="input" 
              placeholder="Ej: Martin Jimenez"
              aria-label="Nombre del cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={creating}
            />
          </div>

          <div>
            <label htmlFor="total" className="small" style={{ display: "block", marginBottom: "var(--space-2)", color: "var(--text)" }}>
              Total
            </label>
            <input 
              id="total"
              className="input" 
              type="number"
              step="0.01"
              placeholder="Ej: 25.50"
              aria-label="Total del pedido"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              disabled={creating}
            />
          </div>

          {error && (
            <div className="small" style={{ color: "var(--red)" }}>
              Error: {error}
            </div>
          )}

          <div className="row">
            <button 
              className="btn primary" 
              type="button" 
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creando..." : "Crear pedido"}
            </button>
            <button 
              className="btn secondary" 
              type="button" 
              onClick={fetchOrders}
              disabled={loading}
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>
        </div>
      </section>

      <section className="card" style={{ gridColumn: "span 7" }}>
        <h3 className="h3">Listado de pedidos</h3>
        <p className="small">Datos reales desde Order Service (puerto 8081).</p>

        {loading && <p className="small" style={{ marginTop: "var(--space-4)" }}>Cargando pedidos...</p>}
        
        {!loading && orders.length === 0 && !error && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>No hay pedidos. Crea el primero.</p>
        )}

        {!loading && orders.length > 0 && (
          <table className="table" style={{ marginTop: "var(--space-4)" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.customerName}</td>
                  <td>${o.total?.toFixed(2) || "0.00"}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
