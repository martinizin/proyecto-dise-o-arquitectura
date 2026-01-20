import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api.js";

function StatusBadge({ status }) {
  if (status === "NOTIFIED") {
    return <span className="badge ok">NOTIFIED</span>;
  }
  if (status === "PENDING") {
    return <span className="badge warn">PENDING</span>;
  }
  return <span className="badge">{status}</span>;
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

  // Auto-refresh cada 5 segundos para ver cambios de Lambda
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
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

  const notifiedCount = orders.filter(o => o.status === "NOTIFIED").length;
  const pendingCount = orders.filter(o => o.status === "PENDING").length;

  return (
    <div className="grid">
      {/* Create Order Form */}
      <section className="card" style={{ gridColumn: "span 5" }}>
        <h3 className="h3">Crear pedido</h3>
        <p className="small">
          Al crear un pedido se publica un evento a SQS que Lambda procesara.
        </p>

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

        {/* Event Flow Diagram */}
        <div style={{ 
          marginTop: "var(--space-4)", 
          padding: "var(--space-3)", 
          background: "var(--bg-secondary)", 
          borderRadius: "var(--radius-md)",
          fontSize: "11px"
        }}>
          <strong className="small">Flujo de Eventos:</strong>
          <div style={{ marginTop: "var(--space-2)", fontFamily: "monospace" }}>
            POST /orders → SQS → Lambda → PATCH /status → NOTIFIED
          </div>
        </div>
      </section>

      {/* Orders List */}
      <section className="card" style={{ gridColumn: "span 7" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 className="h3">Listado de pedidos</h3>
            <p className="small">Auto-refresh cada 5s para ver cambios de Lambda</p>
          </div>
          <div className="row">
            <span className="badge ok">{notifiedCount} notificados</span>
            <span className="badge warn">{pendingCount} pendientes</span>
          </div>
        </div>

        {loading && orders.length === 0 && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>Cargando pedidos...</p>
        )}
        
        {!loading && orders.length === 0 && !error && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>No hay pedidos. Crea el primero.</p>
        )}

        {orders.length > 0 && (
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

      {/* Info Card */}
      <section className="card" style={{ gridColumn: "span 12" }}>
        <h3 className="h3">Como funciona el sistema de eventos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>1</div>
            <strong className="small">Crear Pedido</strong>
            <p className="small" style={{ marginTop: "var(--space-1)" }}>
              POST a Order Service, se guarda con estado PENDING
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>2</div>
            <strong className="small">Publicar SQS</strong>
            <p className="small" style={{ marginTop: "var(--space-1)" }}>
              OrderEventPublisher envia mensaje a cola order-created
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>3</div>
            <strong className="small">Lambda Procesa</strong>
            <p className="small" style={{ marginTop: "var(--space-1)" }}>
              Lambda consume el mensaje y procesa la notificacion
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>4</div>
            <strong className="small">Actualizar Estado</strong>
            <p className="small" style={{ marginTop: "var(--space-1)" }}>
              Lambda llama PATCH /orders/id/status → NOTIFIED
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
