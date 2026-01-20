import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut } from "../api.js";

function StockBadge({ stock }) {
  if (stock === 0) return <span className="badge bad">Sin stock</span>;
  if (stock <= 5) return <span className="badge warn">Bajo</span>;
  return <span className="badge ok">OK</span>;
}

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [lastFetch, setLastFetch] = useState(null);
  const [cacheHint, setCacheHint] = useState(null);

  const fetchProducts = useCallback(async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet("/api/catalog/products");
      const elapsed = Date.now() - startTime;
      setProducts(data);
      setLastFetch(new Date().toLocaleTimeString());
      
      // Hint about cache based on response time
      if (elapsed < 50) {
        setCacheHint("Cache HIT (respuesta rapida)");
      } else {
        setCacheHint("Cache MISS o primera carga");
      }
    } catch (err) {
      setError(err.message);
      setCacheHint(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleUpdateStock = async (id) => {
    if (newStock === "" || isNaN(parseInt(newStock))) {
      setError("Ingresa un valor de stock valido");
      return;
    }
    try {
      setError(null);
      await apiPut(`/api/catalog/products/${id}/stock`, parseInt(newStock));
      setEditingId(null);
      setNewStock("");
      setCacheHint("Cache invalidado - proxima carga desde DB");
      await fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(filter.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  return (
    <div className="grid">
      {/* Stats */}
      <section className="card" style={{ gridColumn: "span 3", textAlign: "center" }}>
        <div className="small">Total Productos</div>
        <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "var(--space-2) 0" }}>
          {products.length}
        </div>
        <div className="small">en catalogo</div>
      </section>

      <section className="card" style={{ gridColumn: "span 3", textAlign: "center" }}>
        <div className="small">Stock Total</div>
        <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "var(--space-2) 0" }}>
          {totalStock}
        </div>
        <div className="small">unidades</div>
      </section>

      <section className="card" style={{ gridColumn: "span 3", textAlign: "center" }}>
        <div className="small">Stock Bajo</div>
        <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "var(--space-2) 0" }}>
          <span className={`badge ${lowStockCount > 0 ? "warn" : "ok"}`} style={{ fontSize: "1.5rem", padding: "var(--space-2) var(--space-4)" }}>
            {lowStockCount}
          </span>
        </div>
        <div className="small">productos</div>
      </section>

      <section className="card" style={{ gridColumn: "span 3", textAlign: "center" }}>
        <div className="small">Sin Stock</div>
        <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "var(--space-2) 0" }}>
          <span className={`badge ${outOfStockCount > 0 ? "bad" : "ok"}`} style={{ fontSize: "1.5rem", padding: "var(--space-2) var(--space-4)" }}>
            {outOfStockCount}
          </span>
        </div>
        <div className="small">productos</div>
      </section>

      {/* Main Table */}
      <section className="card" style={{ gridColumn: "span 8" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <div>
            <h3 className="h3">Productos</h3>
            <p className="small">Gestion de inventario con cache Redis</p>
          </div>
        </div>

        <div className="row" style={{ marginBottom: "var(--space-4)" }}>
          <input 
            className="input" 
            placeholder="Filtrar por nombre" 
            style={{ maxWidth: "300px" }}
            aria-label="Filtrar productos"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button 
            className="btn secondary" 
            type="button" 
            onClick={fetchProducts}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        {error && (
          <div className="small" style={{ marginBottom: "var(--space-4)", color: "var(--bad)" }}>
            Error: {error}
          </div>
        )}

        {loading && products.length === 0 && (
          <p className="small">Cargando productos...</p>
        )}

        {!loading && products.length === 0 && !error && (
          <p className="small">No hay productos en el catalogo.</p>
        )}

        {filteredProducts.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>${p.price?.toFixed(2) || "0.00"}</td>
                  <td>
                    {editingId === p.id ? (
                      <input
                        className="input"
                        type="number"
                        style={{ width: "80px" }}
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td><StockBadge stock={p.stock} /></td>
                  <td>
                    {editingId === p.id ? (
                      <div className="row" style={{ gap: "var(--space-2)" }}>
                        <button
                          className="btn primary"
                          type="button"
                          onClick={() => handleUpdateStock(p.id)}
                          style={{ padding: "var(--space-1) var(--space-2)", fontSize: "0.75rem" }}
                        >
                          Guardar
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => { setEditingId(null); setNewStock(""); }}
                          style={{ padding: "var(--space-1) var(--space-2)", fontSize: "0.75rem" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => { setEditingId(p.id); setNewStock(String(p.stock)); }}
                        style={{ padding: "var(--space-1) var(--space-2)", fontSize: "0.75rem" }}
                      >
                        Editar Stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && products.length > 0 && filteredProducts.length === 0 && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>
            No se encontraron productos que coincidan con "{filter}".
          </p>
        )}
      </section>

      {/* Cache Info */}
      <section className="card" style={{ gridColumn: "span 4" }}>
        <h3 className="h3">Cache Redis</h3>
        <div className="small" style={{ marginBottom: "var(--space-4)" }}>
          Sistema de cache distribuido para mejorar rendimiento
        </div>

        <div style={{ 
          padding: "var(--space-3)", 
          background: "var(--bg-secondary)", 
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-3)"
        }}>
          <div className="small" style={{ marginBottom: "var(--space-2)" }}>
            <strong>Ultima carga:</strong>
          </div>
          <div>{lastFetch || "---"}</div>
          {cacheHint && (
            <div className={`badge ${cacheHint.includes("HIT") ? "ok" : "warn"}`} style={{ marginTop: "var(--space-2)" }}>
              {cacheHint}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "var(--space-4)" }}>
          <strong className="small">Configuracion:</strong>
          <ul className="small" style={{ marginTop: "var(--space-2)" }}>
            <li>TTL: 5 minutos</li>
            <li>Prefijo: <code>catalog:</code></li>
            <li>Patron: Cache-Aside</li>
          </ul>
        </div>

        <div style={{ 
          padding: "var(--space-3)", 
          background: "var(--bg-secondary)", 
          borderRadius: "var(--radius-md)",
          fontFamily: "monospace",
          fontSize: "11px"
        }}>
          <strong>Comportamiento:</strong>
          <div style={{ marginTop: "var(--space-2)" }}>
            • GET → @Cacheable<br/>
            • PUT stock → @CacheEvict<br/>
            • Cache key: products::all
          </div>
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          <strong className="small">Probar el cache:</strong>
          <ol className="small" style={{ marginTop: "var(--space-2)" }}>
            <li>Click "Refrescar" 2 veces</li>
            <li>Segunda carga sera mas rapida (HIT)</li>
            <li>Editar stock invalida el cache</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
