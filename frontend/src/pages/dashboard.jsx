import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../api.js";

function ServiceStatus({ name, port, endpoint, description }) {
  const [status, setStatus] = useState("checking");
  const [data, setData] = useState(null);

  useEffect(() => {
    const checkService = async () => {
      try {
        const result = await apiGet(endpoint);
        setStatus("online");
        setData(result);
      } catch {
        setStatus("offline");
        setData(null);
      }
    };
    checkService();
  }, [endpoint]);

  const badgeClass = status === "online" ? "ok" : status === "offline" ? "bad" : "warn";
  const statusText = status === "online" ? "Online" : status === "offline" ? "Offline" : "...";

  return (
    <div style={{ 
      padding: "var(--space-4)", 
      border: "1px solid var(--border)", 
      borderRadius: "var(--radius-md)",
      background: "var(--panel-hover)"
    }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <strong>{name}</strong>
        <span className={`badge ${badgeClass}`}>{statusText}</span>
      </div>
      <div className="small" style={{ marginBottom: "var(--space-2)" }}>{description}</div>
      <code style={{ fontSize: "11px" }}>:{port}</code>
      {status === "online" && data && (
        <div className="small" style={{ marginTop: "var(--space-2)", color: "var(--ok)" }}>
          {Array.isArray(data) ? `${data.length} registros` : "Conectado"}
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, subtitle, type = "default" }) {
  const badgeClass = type === "success" ? "ok" : type === "warning" ? "warn" : type === "error" ? "bad" : "";
  
  return (
    <div className="card" style={{ gridColumn: "span 3", textAlign: "center" }}>
      <div className="small">{title}</div>
      <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "var(--space-2) 0" }}>
        {badgeClass ? <span className={`badge ${badgeClass}`} style={{ fontSize: "1.5rem", padding: "var(--space-2) var(--space-4)" }}>{value}</span> : value}
      </div>
      <div className="small">{subtitle}</div>
    </div>
  );
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, productsData, statsData] = await Promise.allSettled([
        apiGet("/api/orders"),
        apiGet("/api/catalog/products"),
        apiGet("/api/catalog/search/stats")
      ]);
      
      if (ordersData.status === "fulfilled") setOrders(ordersData.value);
      if (productsData.status === "fulfilled") setProducts(productsData.value);
      if (statsData.status === "fulfilled") setSearchStats(statsData.value);
    } catch {
      // Silent fail, individual components will show their status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ordersNotified = orders.filter(o => o.status === "NOTIFIED").length;
  const ordersPending = orders.filter(o => o.status === "PENDING").length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  return (
    <div className="grid">
      {/* Stats Row */}
      <StatsCard 
        title="Total Pedidos" 
        value={orders.length} 
        subtitle="En el sistema"
      />
      <StatsCard 
        title="Notificados" 
        value={ordersNotified} 
        subtitle="Procesados por Lambda"
        type="success"
      />
      <StatsCard 
        title="Pendientes" 
        value={ordersPending} 
        subtitle="Esperando SQS"
        type="warning"
      />
      <StatsCard 
        title="Productos" 
        value={products.length} 
        subtitle="En catalogo"
      />

      {/* Architecture Overview */}
      <section className="card" style={{ gridColumn: "span 8" }}>
        <h3 className="h3">Arquitectura del Sistema</h3>
        <div className="small" style={{ marginBottom: "var(--space-4)" }}>
          Ecosistema de microservicios completo con mensajeria asincrona
        </div>
        
        <div style={{ 
          background: "var(--bg-secondary)", 
          padding: "var(--space-4)", 
          borderRadius: "var(--radius-md)",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.4",
          overflowX: "auto"
        }}>
          <pre style={{ margin: 0 }}>{`
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React :5173)                    │
│         Dashboard │ Orders │ Catalog │ Search               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (Spring Cloud :8080)                │
│                    /api/orders, /api/catalog                 │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
    ┌──────────▼──────────┐       ┌──────────▼──────────┐
    │  ORDER SERVICE      │       │  CATALOG SERVICE    │
    │      :8081          │       │      :8082          │
    │  ┌───────────────┐  │       │  ┌───────────────┐  │
    │  │ CRUD Orders   │  │       │  │ CRUD Products │  │
    │  │ Publish SQS   │  │       │  │ Redis Cache   │  │
    │  └───────┬───────┘  │       │  │ ES Search     │  │
    └──────────┼──────────┘       │  └───────────────┘  │
               │                  └──────────┬──────────┘
               ▼                             │
    ┌──────────────────┐          ┌──────────┴──────────┐
    │   LOCALSTACK     │          │                     │
    │   SQS :4566      │          │  REDIS    :6379     │
    │ [order-created]  │          │  ELASTIC  :9200     │
    └────────┬─────────┘          └─────────────────────┘
             │
             ▼
    ┌──────────────────┐
    │   AWS LAMBDA     │
    │ (Java 17)        │
    │ PATCH → NOTIFIED │
    └──────────────────┘
          `}</pre>
        </div>
      </section>

      {/* Service Health */}
      <section className="card" style={{ gridColumn: "span 4" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <h3 className="h3">Estado de Servicios</h3>
          <button className="btn secondary" onClick={fetchData} disabled={loading} style={{ padding: "var(--space-1) var(--space-3)", fontSize: "12px" }}>
            {loading ? "..." : "Refrescar"}
          </button>
        </div>
        
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <ServiceStatus 
            name="Order Service" 
            port="8081" 
            endpoint="/api/orders"
            description="CRUD + SQS Events"
          />
          <ServiceStatus 
            name="Catalog Service" 
            port="8082" 
            endpoint="/api/catalog/products"
            description="CRUD + Redis Cache"
          />
          <ServiceStatus 
            name="Elasticsearch" 
            port="9200" 
            endpoint="/api/catalog/search/stats"
            description="Full-text Search"
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="card" style={{ gridColumn: "span 4" }}>
        <h3 className="h3">Pedidos + SQS + Lambda</h3>
        <div className="small">Sistema de eventos asincrono</div>
        <ul className="small" style={{ marginTop: "var(--space-3)" }}>
          <li>Crear pedido → Publica a SQS</li>
          <li>Lambda consume el mensaje</li>
          <li>Actualiza estado a NOTIFIED</li>
        </ul>
        <div className="row" style={{ marginTop: "var(--space-3)" }}>
          <span className="badge ok">Fase 2</span>
          <span className="badge">LocalStack SQS</span>
        </div>
      </section>

      <section className="card" style={{ gridColumn: "span 4" }}>
        <h3 className="h3">Catalogo + Redis Cache</h3>
        <div className="small">Cache distribuido para rendimiento</div>
        <ul className="small" style={{ marginTop: "var(--space-3)" }}>
          <li>TTL de 5 minutos</li>
          <li>Patron Cache-Aside</li>
          <li>Invalidacion al actualizar</li>
        </ul>
        <div className="row" style={{ marginTop: "var(--space-3)" }}>
          <span className="badge ok">Fase 3</span>
          <span className="badge">@Cacheable</span>
        </div>
      </section>

      <section className="card" style={{ gridColumn: "span 4" }}>
        <h3 className="h3">Busqueda + Elasticsearch</h3>
        <div className="small">Busqueda full-text avanzada</div>
        <ul className="small" style={{ marginTop: "var(--space-3)" }}>
          <li>Busqueda por nombre</li>
          <li>Filtro por estado stock</li>
          <li>Filtro por precio maximo</li>
        </ul>
        <div className="row" style={{ marginTop: "var(--space-3)" }}>
          <span className="badge ok">Fase 4</span>
          {searchStats && <span className="badge">{searchStats.totalIndexed} indexados</span>}
        </div>
      </section>

      {/* Quick Stats */}
      {(lowStock > 0 || outOfStock > 0) && (
        <section className="card" style={{ gridColumn: "span 12" }}>
          <h3 className="h3">Alertas de Inventario</h3>
          <div className="row" style={{ marginTop: "var(--space-3)" }}>
            {lowStock > 0 && (
              <span className="badge warn">{lowStock} producto(s) con stock bajo</span>
            )}
            {outOfStock > 0 && (
              <span className="badge bad">{outOfStock} producto(s) sin stock</span>
            )}
          </div>
        </section>
      )}

      {/* Endpoints Reference */}
      <section className="card" style={{ gridColumn: "span 12" }}>
        <h3 className="h3">Endpoints Disponibles</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <div>
            <strong className="small">Order Service</strong>
            <ul className="small" style={{ marginTop: "var(--space-2)" }}>
              <li><code>GET /api/orders</code></li>
              <li><code>POST /api/orders</code></li>
              <li><code>PATCH /api/orders/:id/status</code></li>
            </ul>
          </div>
          <div>
            <strong className="small">Catalog Service</strong>
            <ul className="small" style={{ marginTop: "var(--space-2)" }}>
              <li><code>GET /api/catalog/products</code></li>
              <li><code>PUT /api/catalog/products/:id/stock</code></li>
            </ul>
          </div>
          <div>
            <strong className="small">Search (Elasticsearch)</strong>
            <ul className="small" style={{ marginTop: "var(--space-2)" }}>
              <li><code>GET /api/catalog/search?q=</code></li>
              <li><code>POST /api/catalog/search/sync</code></li>
              <li><code>GET /api/catalog/search/stats</code></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
