async function loadHome() {
  const statsEl = document.querySelector("#stats");
  const needsEl = document.querySelector("#priorityNeeds");
  const centersEl = document.querySelector("#nearCenters");
  statsEl.innerHTML = loader();
  needsEl.innerHTML = loader();
  centersEl.innerHTML = loader();

  try {
    const [stats, needs, centers] = await Promise.all([
      apiRequest("/api/stats"),
      apiRequest("/api/necesidades?prioridad=urgente"),
      apiRequest("/api/centros")
    ]);
    statsEl.innerHTML = `
      <div class="card stat-card"><span>Centros verificados</span><strong>${stats.centros_verificados}</strong><small class="muted">En todo Chile</small></div>
      <div class="card stat-card"><span>Necesidades urgentes</span><strong>${stats.necesidades_urgentes}</strong><small class="muted">Requieren apoyo ahora</small></div>
      <div class="card stat-card"><span>Campanas activas</span><strong>${stats.campanas_activas}</strong><small class="muted">En curso actualmente</small></div>
      <div class="card stat-card"><span>Ultima actualizacion</span><strong>${formatDate(stats.ultima_actualizacion)}</strong><small class="muted">Datos publicados</small></div>
    `;
    needsEl.innerHTML = needs.slice(0, 4).map(needCard).join("") || emptyState();
    centersEl.innerHTML = centers.slice(0, 3).map(centerCard).join("") || emptyState();
  } catch (error) {
    statsEl.innerHTML = emptyState(error.message);
  }
}

function centerCard(item) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.direccion}, ${item.comuna}, Chile`)}`;
  return `<article class="card center-card">
    <div class="card-title-row">
      <div>
        <h3>${escapeHtml(item.nombre)}</h3>
        <p class="muted">${escapeHtml(item.comuna)} | ${escapeHtml(item.direccion)}</p>
      </div>
      <div class="actions">${badge(item.estado)}</div>
    </div>
    <div class="info-list">
      <div class="info-item"><span class="info-label">Horario</span><span class="info-value">${escapeHtml(item.horario || "Sin horario publicado")}</span></div>
      <div class="info-item"><span class="info-label">Recibe</span><span class="info-value">${escapeHtml(item.productos_recibidos || "Productos por confirmar")}</span></div>
    </div>
    <div class="actions card-actions"><a class="btn btn-primary" href="/centro-detalle.html?id=${item.id}">Ver centro</a><a class="btn btn-secondary" target="_blank" href="${maps}">Como llegar</a></div>
  </article>`;
}

document.querySelector("#homeSearch")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const q = encodeURIComponent(event.target.q.value);
  window.location.href = `/centros.html?q=${q}`;
});

loadHome();
