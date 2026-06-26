async function loadCenters() {
  const params = new URLSearchParams(new FormData(document.querySelector("#filters")));
  const initialQ = new URLSearchParams(location.search).get("q");
  if (initialQ && !params.get("q")) params.set("q", initialQ);
  const list = document.querySelector("#centersList");
  list.innerHTML = loader();
  try {
    const centers = await apiRequest(`/api/centros?${params}`);
    list.innerHTML = centers.map(centerListCard).join("") || emptyState();
  } catch (error) {
    list.innerHTML = emptyState(error.message);
  }
}

function centerListCard(item) {
  return `<article class="card center-card">
    <div class="card-title-row">
      <div>
        <h3>${escapeHtml(item.nombre)}</h3>
        <p class="muted">${escapeHtml(item.organizacion_nombre || "Sin organizacion")}</p>
      </div>
      <div class="actions">${badge(item.estado)}</div>
    </div>
    <div class="info-list">
      <div class="info-item"><span class="info-label">Ubicacion</span><span class="info-value">${escapeHtml(item.region)} | ${escapeHtml(item.comuna)}</span></div>
      <div class="info-item"><span class="info-label">Direccion</span><span class="info-value">${escapeHtml(item.direccion)}</span></div>
      <div class="info-item"><span class="info-label">Horario</span><span class="info-value">${escapeHtml(item.horario || "Sin horario publicado")}</span></div>
      <div class="info-item"><span class="info-label">Telefono</span><span class="info-value">${escapeHtml(item.telefono || "Sin telefono")}</span></div>
    </div>
    <div class="card-section">
      <p class="card-section-title">Productos recibidos</p>
      <p class="center-products">${escapeHtml(item.productos_recibidos || "No hay productos informados.")}</p>
    </div>
    <div class="info-list">
      <div class="info-item"><span class="info-label">Cierre</span><span class="info-value">${formatDate(item.fecha_cierre)}</span></div>
      <div class="info-item"><span class="info-label">Actualizado</span><span class="info-value">${formatDate(item.ultima_actualizacion)}</span></div>
    </div>
    <div class="actions card-actions"><a class="btn btn-primary" href="/centro-detalle.html?id=${item.id}">Abrir detalle</a></div>
  </article>`;
}

loadCenters();
