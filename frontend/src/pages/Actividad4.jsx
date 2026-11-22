import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { formReducer, initialFormState } from "../actividad4/formReducer.js";
import "../styles/actividad4.css";

/** Página académica: sin lecturas ni escrituras sobre clientes/pedidos reales. */
export default function Actividad4() {
  const { usuario } = useAuth(); // Context API + useContext
  const [estado, setEstado] = useState("Consultando API..."); // useState
  const [form, dispatch] = useReducer(formReducer, initialFormState); // useReducer

  useEffect(() => { // useEffect + HTTP GET mediante Axios
    const controller = new AbortController();
    api.get("/actividad4/estado", { signal: controller.signal })
      .then((r) => setEstado(r.data.disponible ? "Conectada" : "No disponible"))
      .catch((e) => { if (e.code !== "ERR_CANCELED") setEstado("Sin conexión"); });
    return () => controller.abort();
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (form.enviando) return;
    dispatch({ type: "ENVIANDO" });
    try {
      const { data } = await api.post("/actividad4/validar-datos", {
        nombre: form.nombre,
        cantidad: Number(form.cantidad),
      });
      dispatch({ type: "EXITO", resultado: data.mensaje });
    } catch (error) {
      const mensaje = error.response?.data?.errores?.join(" ") ||
        error.response?.data?.mensaje || "No fue posible validar los datos.";
      dispatch({ type: "ERROR", mensaje });
    }
  }

  return (
    <main className="a4-contenedor">
      <header className="a4-cabecera">
        <div>
          <p className="a4-etiqueta">Universidad · Electiva Desarrollo de aplicaciones web</p>
          <h1>Actividad 4 · Frontend y API REST</h1>
          <p>Demostración independiente: no modifica información de WebBuys.</p>
        </div>
        <Link to="/">Regresar al inicio</Link>
      </header>
      <section className="a4-ficha" aria-label="Estado del servicio">
        <h2>Integración de tecnologías</h2>
        <p><strong>Context API:</strong> sesión {usuario?.usuario || usuario?.nombres || "activa"}</p>
        <p><strong>Axios + useEffect:</strong> API {estado}</p>
        <p><strong>Swagger:</strong> <a href="http://127.0.0.1:5000/api-docs" target="_blank" rel="noreferrer">Documentación de la API local</a></p>
      </section>
      <section className="a4-ficha" aria-label="Formulario de demostración">
        <h2>Formulario controlado con useReducer</h2>
        <p>Validación académica de nombre y cantidad. No crea productos ni pedidos.</p>
        <form onSubmit={enviar} className="a4-formulario">
          <label htmlFor="a4-nombre">Nombre de ejemplo</label>
          <input id="a4-nombre" value={form.nombre} maxLength={80}
            onChange={(e) => dispatch({ type: "CAMPO", campo: "nombre", valor: e.target.value })}
            placeholder="Ej.: Queso de demostración" />
          <label htmlFor="a4-cantidad">Cantidad (1 a 100)</label>
          <input id="a4-cantidad" type="number" min="1" max="100" step="1"
            value={form.cantidad}
            onChange={(e) => dispatch({ type: "CAMPO", campo: "cantidad", valor: e.target.value })} />
          <div className="a4-acciones">
            <button type="submit" disabled={form.enviando}>{form.enviando ? "Validando..." : "Validar con la API"}</button>
            <button type="button" className="a4-secundario" onClick={() => dispatch({ type: "REINICIAR" })}>Limpiar</button>
          </div>
        </form>
        {form.resultado && <p className="a4-exito" role="status">{form.resultado}</p>}
        {form.error && <p className="a4-error" role="alert">{form.error}</p>}
      </section>
    </main>
  );
}
