async function loadTokenCenter() {
  const token = new URLSearchParams(location.search).get("token");
  const box = document.querySelector("#updateBox");
  if (!token) { box.innerHTML = emptyState("Falta el token del centro."); return; }
  box.innerHTML = loader();
  try {
    const c = await apiRequest(`/api/actualizar-centro/${token}`);
    box.classList.add("quick-update-shell");
    box.innerHTML = `<form id="quickUpdate">
      <div class="quick-update-header"><div><a class="btn btn-secondary" href="/">Volver</a></div><div><h1>Actualizar centro</h1><p class="muted">Actualiza la informacion operativa del centro.</p></div></div>
      <section class="card quick-update-card">
        <h2>${escapeHtml(c.nombre)}</h2>
        <p>${badge(c.estado)} | Ultima actualizacion: ${formatDate(c.ultima_actualizacion)}</p>
      </section>
      <section class="card quick-update-card">
        <h2>El centro sigue funcionando?</h2>
        <div class="quick-status">
          <label class="choice-card is-yes"><input type="radio" name="sigue_funcionando" value="si" checked> Si</label>
          <label class="choice-card is-no"><input type="radio" name="sigue_funcionando" value="no"> No</label>
        </div>
      </section>
      <section class="card quick-update-card">
        <h2>Cantidades recibidas hoy</h2>
        ${c.necesidades.map((n) => `<div class="quantity-row"><label>${escapeHtml(n.nombre)}</label><input class="form-control" type="number" min="0" name="need_${n.id}" placeholder="0"><span class="muted">${escapeHtml(n.unidad)}</span></div>`).join("") || emptyState("No hay necesidades activas asociadas.")}
      </section>
      <section class="card quick-update-card">
        <div class="form-group"><label>Cambio de horario</label><input class="form-control" name="horario" value="${escapeHtml(c.horario || "")}"></div>
        <div class="form-group"><label>Observaciones</label><textarea class="form-control" name="observaciones" placeholder="Escribe algun detalle relevante...">${escapeHtml(c.observaciones || "")}</textarea></div>
        <button class="btn btn-primary">Guardar actualizacion</button><div id="updateMsg"></div>
      </section>
    </form>`;
    document.querySelector("#quickUpdate").onsubmit = async (event) => {
      event.preventDefault();
      const data = formDataObject(event.target);
      data.actualizaciones = c.necesidades.map((n) => ({ necesidad_id: n.id, cantidad: data[`need_${n.id}`] || 0 }));
      await apiRequest(`/api/actualizar-centro/${token}`, { method: "POST", body: data });
      showAlert("#updateMsg", "Actualizacion guardada.");
    };
  } catch (error) { box.innerHTML = emptyState(error.message); }
}
loadTokenCenter();
