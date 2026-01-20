import { useState, useCallback } from "react";
import { apiGet, apiPost } from "../api.js";

function StockBadge({ status }) {
  if (status === "OUT_OF_STOCK") return <span className="badge bad">Sin stock</span>;
  if (status === "LOW") return <span className="badge warn">Bajo</span>;
  return <span className="badge ok">OK</span>;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/catalog/search";
      const params = new URLSearchParams();
      
      if (query.trim()) params.append("q", query.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (maxPrice) params.append("maxPrice", maxPrice);
      
      if (params.toString()) {
        url += "?" + params.toString();
      }
      
      const data = await apiGet(url);
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, maxPrice]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await apiPost("/api/catalog/search/sync", {});
      setError(null);
      // Refresh stats after sync
      await loadStats();
      await handleSearch();
      alert(`Sincronizacion completada: ${result.productsIndexed} productos indexados`);
    } catch (err) {
      setError("Error sincronizando: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiGet("/api/catalog/search/stats");
      setStats(data);
    } catch (err) {
      // Stats endpoint might fail if ES is not ready
      setStats(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="grid">
      {/* Search Form */}
      <section className="card" style={{ gridColumn: "span 8" }}>
        <h3 className="h3">Busqueda de Productos</h3>
        <p className="small">
          Busqueda full-text usando Elasticsearch via <code>/api/catalog/search</code>
        </p>

        <div style={{ marginTop: "var(--space-4)", display: "grid", gap: "var(--space-4)" }}>
          <div className="row">
            <input 
              className="input" 
              placeholder="Buscar por nombre..." 
              style={{ flex: 1 }}
              aria-label="Buscar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button 
              className="btn primary" 
              type="button" 
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className="row" style={{ gap: "var(--space-4)" }}>
            <div>
              <label className="small" style={{ display: "block", marginBottom: "var(--space-1)" }}>
                Filtrar por estado
              </label>
              <select 
                className="input" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: "150px" }}
              >
                <option value="">Todos</option>
                <option value="OK">En stock</option>
                <option value="LOW">Stock bajo</option>
                <option value="OUT_OF_STOCK">Sin stock</option>
              </select>
            </div>
            <div>
              <label className="small" style={{ display: "block", marginBottom: "var(--space-1)" }}>
                Precio maximo
              </label>
              <input 
                className="input" 
                type="number" 
                step="0.01"
                placeholder="Ej: 50.00"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{ width: "120px" }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="small" style={{ marginTop: "var(--space-4)", color: "var(--red)" }}>
            Error: {error}
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <table className="table" style={{ marginTop: "var(--space-4)" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>${p.price?.toFixed(2) || "0.00"}</td>
                  <td>{p.stock}</td>
                  <td><StockBadge status={p.stockStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && results.length === 0 && query && (
          <p className="small" style={{ marginTop: "var(--space-4)" }}>
            No se encontraron resultados para "{query}".
          </p>
        )}
      </section>

      {/* Stats & Actions */}
      <section className="card" style={{ gridColumn: "span 4" }}>
        <h3 className="h3">Elasticsearch</h3>
        
        <div style={{ marginTop: "var(--space-4)" }}>
          <button 
            className="btn secondary" 
            type="button" 
            onClick={loadStats}
            style={{ width: "100%", marginBottom: "var(--space-2)" }}
          >
            Cargar estadisticas
          </button>
          
          <button 
            className="btn primary" 
            type="button" 
            onClick={handleSync}
            disabled={syncing}
            style={{ width: "100%" }}
          >
            {syncing ? "Sincronizando..." : "Sincronizar desde BD"}
          </button>
        </div>

        {stats && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <h4 className="small" style={{ fontWeight: "bold", marginBottom: "var(--space-2)" }}>
              Estadisticas del Indice
            </h4>
            <table className="table">
              <tbody>
                <tr>
                  <td>Total indexados</td>
                  <td><strong>{stats.totalIndexed}</strong></td>
                </tr>
                <tr>
                  <td>En stock</td>
                  <td><span className="badge ok">{stats.inStock}</span></td>
                </tr>
                <tr>
                  <td>Stock bajo</td>
                  <td><span className="badge warn">{stats.lowStock}</span></td>
                </tr>
                <tr>
                  <td>Sin stock</td>
                  <td><span className="badge bad">{stats.outOfStock}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="small" style={{ marginTop: "var(--space-4)", color: "var(--text-muted)" }}>
          <p><strong>Endpoints disponibles:</strong></p>
          <ul style={{ marginTop: "var(--space-2)", paddingLeft: "var(--space-4)" }}>
            <li><code>GET /search?q=</code></li>
            <li><code>GET /search?status=</code></li>
            <li><code>GET /search?maxPrice=</code></li>
            <li><code>POST /search/sync</code></li>
            <li><code>GET /search/stats</code></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
