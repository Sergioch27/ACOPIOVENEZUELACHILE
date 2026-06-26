async function loadCenters() {
  const params = new URLSearchParams(new FormData(document.querySelector("#filters")));
  const initialQ = new URLSearchParams(location.search).get("q");
  if (initialQ && !params.get("q")) params.set("q", initialQ);
  const list = document.querySelector("#centersList");
  list.innerHTML = loader();
  try {
    const centers = await apiRequest(`/api/centros?${params}`);
    list.innerHTML = centers.map((item) => `
      <article class="card">
        <div class="actions">${badge(item.estado)}</div>
        <h3>${escapeHtml(item.nombre)}</h3>
        <p><strong>${escapeHtml(item.organizacion_nombre || "Sin organizacion")}</strong></p>
        <p>${escapeHtml(item.region)} · ${escapeHtml(item.comuna)} · ${escapeHtml(item.direccion)}</p>
        <p class="muted">${escapeHtml(item.telefono)} · ${escapeHtml(item.horario)} · Cierre: ${formatDate(item.fecha_cierre)}</p>
        <p>${escapeHtml(item.productos_recibidos || "")}</p>
        <p class="muted">Ultima actualizacion: ${formatDate(item.ultima_actualizacion)}</p>
        <a class="btn btn-primary" href="/centro-detalle.html?id=${item.id}">Abrir detalle</a>
      </article>`).join("") || emptyState();
  } catch (error) {
    list.innerHTML = emptyState(error.message);
  }
}
document.querySelector("#filters")?.addEventListener("submit", (event) => { event.preventDefault(); loadCenters(); });
loadCenters();
