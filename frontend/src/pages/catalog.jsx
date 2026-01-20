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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet("/api/catalog/products");
      setProducts(data);
    } catch (err) {
      setError(err.message);
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
      await fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="grid">
      <section className="card" style={{ gridColumn: "span 12" }}>
        <h3 className="h3">Catalogo</h3>
        <p className="small">Conectado al API Gateway: <code>/api/catalog/products</code></p>

        <div className="row" style={{ marginTop: "var(--space-4)" }}>
          <input 
            className="input" 
            placeholder="Filtrar por nombre" 
            style={{ maxWidth: "400px" }}
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
          <div className="small" style={{ marginTop: "var(--space-4)", color: "var(--red)" }}>
            Error: {error}
          </div>
        )}

        {loading && <p className="small" style={{ marginTop: "var(--space-4)" }}>Cargando productos...</p>}

        {!loading && products.length === 0 && !error && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>No hay productos en el catalogo.</p>
        )}

        {!loading && filteredProducts.length > 0 && (
          <table className="table" style={{ marginTop: "var(--space-4)" }}>
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
    </div>
  );
}
