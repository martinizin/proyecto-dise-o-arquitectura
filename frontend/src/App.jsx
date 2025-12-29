import { useState } from 'react'

import './App.css'

export default function App() {
  const [page, setPage] = useState("orders");

  return (
    <div>
      <nav style={{ display: "flex", gap: 8, padding: 16 }}>
        <button onClick={() => setPage("orders")}>Pedidos</button>
        <button onClick={() => setPage("catalog")}>Catálogo</button>
      </nav>
      {page === "orders" ? <Orders /> : <Catalog />}
    </div>
  );
}
