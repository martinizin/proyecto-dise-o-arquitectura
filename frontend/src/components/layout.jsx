export default function Layout({ current, onNavigate, title, subtitle, children }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Pedidos", icon: "🧾" },
    { id: "catalog", label: "Catálogo", icon: "📦" },
    { id: "search", label: "Búsqueda", icon: "🔎" },
  ];

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <div className="brand-title">Microservicios</div>
            <div className="brand-sub">Arquitectura Completa</div>
          </div>
        </div>

        <nav className="nav">
          {items.map((it) => (
            <button
              key={it.id}
              className={`nav-item ${current === it.id ? "active" : ""}`}
              onClick={() => onNavigate(it.id)}
              type="button"
              aria-label={`Navegar a ${it.label}`}
              aria-current={current === it.id ? "page" : undefined}
            >
              <span aria-hidden="true">{it.icon}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </nav>

        <div className="card" style={{ marginTop: "auto" }}>
          <h3 className="h3">Servicios Activos</h3>
          <div className="small">
            Todos los componentes del ecosistema estan operativos.
          </div>
          <div className="row" style={{ marginTop: "var(--space-3)", flexWrap: "wrap" }}>
            <span className="badge ok">Gateway :8080</span>
            <span className="badge ok">Orders :8081</span>
            <span className="badge ok">Catalog :8082</span>
          </div>
          <div className="row" style={{ marginTop: "var(--space-2)", flexWrap: "wrap" }}>
            <span className="badge ok">PostgreSQL</span>
            <span className="badge ok">Redis</span>
            <span className="badge ok">Elasticsearch</span>
          </div>
          <div className="row" style={{ marginTop: "var(--space-2)" }}>
            <span className="badge ok">SQS + Lambda</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="h1">{title}</h1>
            <p className="p">{subtitle}</p>
          </div>
          <div className="row">
            <span className="badge ok">Online</span>
            <span className="badge">Gateway :8080</span>
            <span className="badge">Front :5173</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
