import { useMemo, useState } from "react";

import Layout from "./components/layout.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Orders from "./pages/orders.jsx";
import Catalog from "./pages/catalog.jsx";
import Search from "./pages/search.jsx";


export default function App() {
  const [current, setCurrent] = useState("dashboard");

  const meta = useMemo(() => {
    switch (current) {
      case "orders":
        return { title: "Pedidos", subtitle: "CRUD completo + Eventos SQS + Lambda (estado NOTIFIED)" };
      case "catalog":
        return { title: "Catálogo", subtitle: "Gestion de productos con cache Redis" };
      case "search":
        return { title: "Búsqueda", subtitle: "Busqueda full-text con Elasticsearch" };
      default:
        return { title: "Dashboard", subtitle: "Vista general del ecosistema de microservicios" };
    }
  }, [current]);

  return (
    <Layout
      current={current}
      onNavigate={setCurrent}
      title={meta.title}
      subtitle={meta.subtitle}
    >
      {current === "dashboard" && <Dashboard />}
      {current === "orders" && <Orders />}
      {current === "catalog" && <Catalog />}
      {current === "search" && <Search />}
    </Layout>
  );
}
