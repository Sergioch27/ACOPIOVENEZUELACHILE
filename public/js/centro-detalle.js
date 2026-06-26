async function loadCenterDetail() {
  const id = new URLSearchParams(location.search).get("id");
  const box = document.querySelector("#centerDetail");
  if (!id) { box.innerHTML = emptyState("Falta el ID del centro."); return; }
  box.innerHTML = loader();
  try {
    const c = await apiRequest(`/api/centros/${id}`);
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.direccion}, ${c.comuna}, Chile`)}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Centro de acopio ${c.nombre}: ${location.href}`)}`;
    box.innerHTML = `<div class="card">
      <div class="actions">${badge(c.estado)}</div>
      <h1>${escapeHtml(c.nombre)}</h1>
      <p><strong>Organizacion:</strong> ${escapeHtml(c.organizacion_nombre || "")}</p>
      <div class="grid grid-2">
        <p><strong>Contacto:</strong> ${escapeHtml(c.responsable_nombre)} · ${escapeHtml(c.telefono)} · ${escapeHtml(c.email)}</p>
        <p><strong>Ubicacion:</strong> ${escapeHtml(c.direccion)}, ${escapeHtml(c.comuna)}, ${escapeHtml(c.region)}</p>
        <p><strong>Horario:</strong> ${escapeHtml(c.horario)}</p>
        <p><strong>Fechas:</strong> ${formatDate(c.fecha_inicio)} a ${formatDate(c.fecha_cierre)}</p>
        <p><strong>Proximo despacho:</strong> ${formatDate(c.proxima_fecha_despacho)}</p>
        <p><strong>Ultima actualizacion:</strong> ${formatDate(c.ultima_actualizacion)}</p>
      </div>
      <p><strong>Recibe:</strong> ${escapeHtml(c.productos_recibidos || "")}</p>
      <p><strong>No recibe:</strong> ${escapeHtml(c.productos_no_recibidos || "")}</p>
      <p><strong>Destino:</strong> ${escapeHtml(c.destino_donaciones || "")}</p>
      <p><strong>Observaciones:</strong> ${escapeHtml(c.observaciones || "")}</p>
      <div class="actions">
        <a class="btn btn-primary" target="_blank" href="${maps}">Como llegar</a>
        <a class="btn btn-secondary" href="tel:${escapeHtml(c.telefono)}">Llamar</a>
        <a class="btn btn-secondary" target="_blank" href="${whatsapp}">Compartir por WhatsApp</a>
        <button class="btn btn-ghost" id="reportBtn">Reportar informacion incorrecta</button>
      </div>
    </div>
    <section class="section"><h2>Necesidades asociadas</h2><div class="grid grid-3">${c.necesidades.map(needCard).join("") || emptyState()}</div></section>
    <form class="card section" id="reportForm" hidden>
      <h2>Reportar informacion</h2>
      <input type="hidden" name="centro_id" value="${c.id}">
      <div class="form-row"><div class="form-group"><label>Nombre</label><input class="form-control" name="nombre_reportante"></div><div class="form-group"><label>Email</label><input class="form-control" name="email_reportante" type="email"></div></div>
      <div class="form-group"><label>Motivo</label><input class="form-control" name="motivo" required></div>
      <div class="form-group"><label>Descripcion</label><textarea class="form-control" name="descripcion" required></textarea></div>
      <button class="btn btn-primary">Enviar reporte</button><div id="reportMsg"></div>
    </form>`;
    document.querySelector("#reportBtn").onclick = () => document.querySelector("#reportForm").hidden = false;
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
  } catch (error) { showAlert("#reportMsg", error.message, "danger"); }
}
loadCenterDetail();
