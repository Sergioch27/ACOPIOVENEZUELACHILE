function splitItems(value) {
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tagList(value, emptyText) {
  const items = Array.isArray(value) ? value : splitItems(value);
  if (!items.length) return `<p class="muted">${escapeHtml(emptyText || "Sin informacion registrada.")}</p>`;
  return `<div class="tag-list">${items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function detailItem(label, value) {
  return `<div class="detail-item"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(value || "No informado")}</span></div>`;
}

async function loadCenterDetail() {
  const id = new URLSearchParams(location.search).get("id");
  const box = document.querySelector("#centerDetail");
  if (!id) {
    box.innerHTML = emptyState("Falta el ID del centro.");
    return;
  }

  box.innerHTML = loader();
  try {
    const c = await apiRequest(`/api/centros/${id}`);
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.direccion || ""}, ${c.comuna || ""}, Chile`)}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Centro de acopio ${c.nombre}: ${location.href}`)}`;
    const phoneHref = String(c.telefono || "").replace(/[^\d+]/g, "");
    const needs = Array.isArray(c.necesidades) ? c.necesidades : [];

    box.innerHTML = `<section class="center-detail">
      <article class="card center-hero-card">
        <div class="center-hero-top">
          <a class="back-link" href="/centros.html">Volver a centros</a>
          ${badge(c.estado)}
        </div>
        <div class="center-hero-content">
          <div class="center-icon" aria-hidden="true">PS</div>
          <div>
            <p class="eyebrow">Centro de acopio verificado</p>
            <h1>${escapeHtml(c.nombre)}</h1>
            <p class="muted">${escapeHtml(c.organizacion_nombre || "Organizacion no informada")}</p>
          </div>
        </div>
      </article>

      <section class="center-summary-grid">
        <article class="card summary-card">
          <span class="summary-label">Direccion</span>
          <strong>${escapeHtml(c.direccion || "No informada")}</strong>
          <p>${escapeHtml([c.comuna, c.region].filter(Boolean).join(", ") || "Ubicacion pendiente")}</p>
        </article>
        <article class="card summary-card">
          <span class="summary-label">Horario</span>
          <strong>${escapeHtml(c.horario || "No informado")}</strong>
          <p>Confirma antes de llevar donaciones.</p>
        </article>
        <article class="card summary-card">
          <span class="summary-label">Contacto</span>
          <strong>${escapeHtml(c.responsable_nombre || "Responsable no informado")}</strong>
          <p>${escapeHtml(c.telefono || "Telefono no informado")}</p>
        </article>
      </section>

      <div class="center-detail-layout">
        <div class="center-main-column">
          <article class="card detail-panel">
            <div class="section-head compact-head">
              <div>
                <h2>Productos</h2>
                <p class="muted">Revisa que el centro reciba lo que vas a donar.</p>
              </div>
            </div>
            <div class="product-block">
              <h3>Recibe</h3>
              ${tagList(c.productos_recibidos, "No hay productos recibidos publicados.")}
            </div>
            <div class="product-block muted-block">
              <h3>No recibe</h3>
              ${tagList(c.productos_no_recibidos, "No hay restricciones publicadas.")}
            </div>
          </article>

          <article class="card detail-panel">
            <h2>Informacion del centro</h2>
            <div class="detail-list">
              ${detailItem("Email", c.email)}
              ${detailItem("Inicio de campana", formatDate(c.fecha_inicio))}
              ${detailItem("Cierre estimado", formatDate(c.fecha_cierre))}
              ${detailItem("Proximo despacho", formatDate(c.proxima_fecha_despacho))}
              ${detailItem("Ultima actualizacion", formatDate(c.ultima_actualizacion))}
            </div>
            ${c.observaciones ? `<div class="note-box"><span class="detail-label">Observaciones</span><p>${escapeHtml(c.observaciones)}</p></div>` : ""}
          </article>
        </div>

        <aside class="center-side-column">
          <article class="card action-panel">
            <h2>Acciones</h2>
            <div class="action-stack">
              <a class="btn btn-primary" target="_blank" href="${maps}">Como llegar</a>
              <a class="btn btn-secondary" href="tel:${escapeHtml(phoneHref)}">Llamar</a>
              <a class="btn btn-secondary" target="_blank" href="${whatsapp}">Compartir por WhatsApp</a>
              <button class="btn btn-ghost" id="reportBtn">Reportar informacion incorrecta</button>
            </div>
          </article>
        </aside>
      </div>

      <section class="section needs-section">
        <div class="section-head">
          <div>
            <h2>Necesidades asociadas</h2>
            <p class="muted">Prioridades publicadas para este centro.</p>
          </div>
        </div>
        <div class="grid grid-3">${needs.map(needCard).join("") || emptyState()}</div>
      </section>
    </section>

    <form class="card section report-card" id="reportForm" hidden>
      <h2>Reportar informacion</h2>
      <input type="hidden" name="centro_id" value="${escapeHtml(c.id)}">
      <div class="form-row">
        <div class="form-group"><label>Nombre</label><input class="form-control" name="nombre_reportante"></div>
        <div class="form-group"><label>Email</label><input class="form-control" name="email_reportante" type="email"></div>
      </div>
      <div class="form-group"><label>Motivo</label><input class="form-control" name="motivo" required></div>
      <div class="form-group"><label>Descripcion</label><textarea class="form-control" name="descripcion" required></textarea></div>
      <button class="btn btn-primary">Enviar reporte</button><div id="reportMsg"></div>
    </form>`;

    document.querySelector("#reportBtn").onclick = () => {
      const form = document.querySelector("#reportForm");
      form.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.querySelector("#reportForm").onsubmit = submitReport;
  } catch (error) {
    box.innerHTML = emptyState(error.message);
  }
}

async function submitReport(event) {
  event.preventDefault();
  try {
    await apiRequest("/api/reportes", { method: "POST", body: formDataObject(event.target) });
    showAlert("#reportMsg", "Reporte enviado.");
    event.target.reset();
  } catch (error) {
    showAlert("#reportMsg", error.message, "danger");
  }
}

loadCenterDetail();
