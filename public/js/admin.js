async function requireSession() {
  const data = await apiRequest("/api/admin/session");
  if (!data.user && !location.pathname.endsWith("/login.html")) location.href = "/admin/login.html";
  return data.user;
}

document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await apiRequest("/api/admin/login", { method: "POST", body: formDataObject(event.target) });
    location.href = "/admin/dashboard.html";
  } catch (error) { showAlert("#loginMsg", error.message, "danger"); }
});

async function logout() {
  await apiRequest("/api/admin/logout", { method: "POST" });
  location.href = "/admin/login.html";
}

function adminShell(title) {
  return `<aside class="admin-sidebar">
    <a class="brand" href="/admin/dashboard.html">Puente Solidario<span>Admin</span></a>
    <a href="/admin/dashboard.html">Resumen</a><a href="/admin/centros.html">Centros</a><a href="/admin/necesidades.html">Necesidades</a>
    <a href="#">Reportes</a><a href="#">Usuarios</a><button onclick="logout()">Cerrar sesion</button>
  </aside><main class="admin-main"><div class="admin-top"><div><h1>${escapeHtml(title)}</h1><p class="muted">Gestion de centros, necesidades y verificaciones.</p></div><div class="actions"><a class="btn btn-secondary" href="/admin/centro-form.html">Crear centro</a><a class="btn btn-primary" href="/admin/necesidad-form.html">Crear necesidad</a></div></div><div id="adminContent"></div></main>`;
}

async function loadDashboard() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Resumen");
  const box = document.querySelector("#adminContent");
  box.innerHTML = loader();
  const data = await apiRequest("/api/admin/dashboard");
  box.innerHTML = `<div class="grid grid-4">
    <div class="card stat-card"><span>Centros pendientes</span><strong>${data.cards.centros_pendientes}</strong><small class="muted">Requieren verificacion</small></div>
    <div class="card stat-card"><span>Necesidades por verificar</span><strong>${data.cards.necesidades_por_verificar}</strong><small class="muted">Pendientes de revision</small></div>
    <div class="card stat-card"><span>Centros activos</span><strong>${data.cards.centros_activos}</strong><small class="muted">Operativos</small></div>
    <div class="card stat-card"><span>Sin actualizacion</span><strong>${data.cards.centros_sin_actualizacion}</strong><small class="muted">Revisar estado</small></div>
  </div>
  <div class="admin-hero"><div class="section-head"><div><h2>Acciones rapidas</h2><p class="muted">Crea registros o revisa elementos pendientes desde el panel.</p></div><div class="actions"><a class="btn btn-primary" href="/admin/centro-form.html">Crear centro</a><a class="btn btn-secondary" href="/admin/necesidad-form.html">Crear necesidad</a></div></div></div>
  <section class="section"><h2>Centros pendientes</h2>${table(data.centrosPendientes, ["nombre","comuna","responsable_nombre","estado","ultima_actualizacion"], (r) => `<a class="btn btn-secondary" href="/admin/verificar-centro.html?id=${r.id}">Verificar</a>`)}</section>
  <section class="section"><h2>Necesidades pendientes</h2>${table(data.necesidadesPendientes, ["nombre","centro","prioridad","cantidad_objetivo","cantidad_recibida"], (r) => `<button class="btn btn-primary" onclick="needAction(${r.id}, 'aprobar')">Aprobar</button><button class="btn btn-secondary" onclick="needAction(${r.id}, 'pausar')">Pedir correccion</button>`)}</section>
  <section class="section"><h2>Actividad reciente</h2>${table(data.actividad, ["entidad","accion","descripcion","created_at"])}</section>`;
}

function table(rows, cols, action) {
  if (!rows || !rows.length) return emptyState();
  return `<table class="data-table"><thead><tr>${cols.map((c) => `<th>${escapeHtml(c).replaceAll("_", " ")}</th>`).join("")}<th>Acciones</th></tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] ?? "")}</td>`).join("")}<td class="actions table-actions">${action ? action(r) : ""}</td></tr>`).join("")}</tbody></table>`;
}

async function loadAdminCenters() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Centros");
  const box = document.querySelector("#adminContent");
  box.innerHTML = `<form id="adminSearch" class="filters"><input class="form-control" name="q" placeholder="Buscar centro, comuna o estado"><button class="btn btn-primary">Buscar</button></form><div id="rows"></div>`;
  document.querySelector("#adminSearch").onsubmit = (e) => { e.preventDefault(); renderAdminCenters(); };
  renderAdminCenters();
}

async function renderAdminCenters() {
  const q = new URLSearchParams(new FormData(document.querySelector("#adminSearch")));
  const rows = await apiRequest(`/api/admin/centros?${q}`);
  document.querySelector("#rows").innerHTML = table(rows, ["id","nombre","organizacion_nombre","comuna","estado","ultima_actualizacion"], (r) => `
    <a class="btn btn-secondary" href="/admin/centro-form.html?id=${r.id}">Editar</a>
    <a class="btn btn-secondary" href="/admin/verificar-centro.html?id=${r.id}">Verificar</a>
    <button class="btn btn-secondary" onclick="centerAction(${r.id}, 'suspender')">Suspender</button>
    <button class="btn btn-secondary" onclick="centerAction(${r.id}, 'cerrar')">Cerrar</button>
    <button class="btn btn-danger" onclick="deleteCenter(${r.id})">Eliminar</button>`);
}

async function centerAction(id, action) {
  if (!confirmAction(`Confirma ${action} este centro.`)) return;
  await apiRequest(`/api/admin/centros/${id}/${action}`, { method: "POST" });
  renderAdminCenters();
}

async function deleteCenter(id) {
  if (!confirmAction("Confirma eliminar este centro.")) return;
  try { await apiRequest(`/api/admin/centros/${id}`, { method: "DELETE" }); renderAdminCenters(); }
  catch (error) { alert(error.message); }
}

async function loadCenterForm() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Formulario de centro");
  const id = new URLSearchParams(location.search).get("id");
  let current = {};
  if (id) current = (await apiRequest("/api/admin/centros")).find((c) => String(c.id) === id) || {};
  document.querySelector("#adminContent").innerHTML = centerForm(current);
  document.querySelector("#centerForm").onsubmit = async (event) => {
    event.preventDefault();
    const body = formDataObject(event.target);
    await apiRequest(id ? `/api/admin/centros/${id}` : "/api/admin/centros", { method: id ? "PUT" : "POST", body });
    location.href = "/admin/centros.html";
  };
}

function input(name, label, value = "", type = "text") {
  return `<div class="form-group"><label>${label}</label><input class="form-control" name="${name}" type="${type}" value="${escapeHtml(value || "")}"></div>`;
}

function centerForm(c) {
  return `<form class="card" id="centerForm">
    <div class="form-row">${input("nombre","Nombre",c.nombre)}${input("organizacion","Organizacion",c.organizacion_nombre)}</div>
    <div class="form-row">${input("responsable_nombre","Responsable",c.responsable_nombre)}${input("telefono","Telefono",c.telefono)}</div>
    <div class="form-row">${input("email","Correo",c.email,"email")}${input("region","Region",c.region)}</div>
    <div class="form-row">${input("comuna","Comuna",c.comuna)}${input("direccion","Direccion",c.direccion)}</div>
    ${input("referencia","Referencia",c.referencia)}${input("horario","Horario",c.horario)}
    <div class="form-row">${input("fecha_inicio","Fecha inicio",c.fecha_inicio,"date")}${input("fecha_cierre","Fecha cierre",c.fecha_cierre,"date")}</div>
    ${input("proxima_fecha_despacho","Proxima fecha despacho",c.proxima_fecha_despacho,"date")}
    <div class="form-group"><label>Productos recibidos</label><textarea class="form-control" name="productos_recibidos">${escapeHtml(c.productos_recibidos || "")}</textarea></div>
    <div class="form-group"><label>Productos no recibidos</label><textarea class="form-control" name="productos_no_recibidos">${escapeHtml(c.productos_no_recibidos || "")}</textarea></div>
    ${input("destino_donaciones","Destino",c.destino_donaciones)}
    <div class="form-group"><label>Estado</label><select class="form-control" name="estado">${["borrador","pendiente","verificado","requiere_actualizacion","suspendido","cerrado","rechazado"].map((s) => `<option ${c.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    <div class="form-group"><label>Observaciones</label><textarea class="form-control" name="observaciones">${escapeHtml(c.observaciones || "")}</textarea></div>
    <button class="btn btn-primary">Guardar</button>
  </form>`;
}

async function loadVerifyCenter() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Verificar centro");
  const id = new URLSearchParams(location.search).get("id");
  const center = (await apiRequest("/api/admin/centros")).find((c) => String(c.id) === id);
  const checks = ["contacto_confirmado","direccion_confirmada","centro_activo","horario_confirmado","productos_confirmados","destino_confirmado","organizacion_confirmada"];
  document.querySelector("#adminContent").innerHTML = `<div class="card"><h2>${escapeHtml(center?.nombre || "Centro")}</h2><p>${escapeHtml(center?.direccion || "")}</p></div><form class="card section" id="verifyForm"><div class="checklist">${checks.map((c) => `<label class="check-item"><input type="checkbox" name="${c}"> ${c.replaceAll("_", " ")}</label>`).join("")}</div><div class="form-group"><label>Resultado</label><select class="form-control" name="resultado"><option value="aprobado">Aprobar</option><option value="correccion">Pedir correccion</option><option value="rechazado">Rechazar</option></select></div><div class="form-group"><label>Comentario</label><textarea class="form-control" name="comentario"></textarea></div><button class="btn btn-primary">Guardar verificacion</button></form>`;
  document.querySelector("#verifyForm").onsubmit = async (event) => {
    event.preventDefault();
    const body = formDataObject(event.target);
    checks.forEach((key) => body[key] = event.target.elements[key].checked);
    await apiRequest(`/api/admin/centros/${id}/verificar`, { method: "POST", body });
    location.href = "/admin/centros.html";
  };
}

async function loadAdminNeeds() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Necesidades");
  const rows = await apiRequest("/api/admin/necesidades");
  document.querySelector("#adminContent").innerHTML = table(rows, ["id","nombre","categoria_nombre","prioridad","estado","cantidad_objetivo","cantidad_recibida","centros_nombres"], (r) => `
    <a class="btn btn-secondary" href="/admin/necesidad-form.html?id=${r.id}">Editar</a>
    <button class="btn btn-primary" onclick="needAction(${r.id}, 'aprobar')">Aprobar</button>
    <button class="btn btn-secondary" onclick="needAction(${r.id}, 'pausar')">Pausar</button>
    <button class="btn btn-secondary" onclick="needAction(${r.id}, 'completar')">Completar</button>
    <button class="btn btn-danger" onclick="deleteNeed(${r.id})">Eliminar</button>`);
}

async function needAction(id, action) {
  await apiRequest(`/api/admin/necesidades/${id}/${action}`, { method: "POST" });
  if (location.pathname.endsWith("necesidades.html")) loadAdminNeeds();
}

async function deleteNeed(id) {
  if (!confirmAction("Confirma eliminar esta necesidad.")) return;
  await apiRequest(`/api/admin/necesidades/${id}`, { method: "DELETE" });
  loadAdminNeeds();
}

async function loadNeedForm() {
  await requireSession();
  document.querySelector("#adminApp").innerHTML = adminShell("Formulario de necesidad");
  const id = new URLSearchParams(location.search).get("id");
  const [categories, centers, needs] = await Promise.all([apiRequest("/api/admin/categorias"), apiRequest("/api/admin/centros"), apiRequest("/api/admin/necesidades")]);
  const current = id ? needs.find((n) => String(n.id) === id) || {} : {};
  const selected = String(current.centro_ids || "").split(",");
  document.querySelector("#adminContent").innerHTML = `<form class="card" id="needForm">
    <div class="form-row">${input("nombre","Nombre",current.nombre)}<div class="form-group"><label>Categoria</label><select class="form-control" name="categoria_id">${categories.map((c) => `<option value="${c.id}" ${current.categoria_id === c.id ? "selected" : ""}>${escapeHtml(c.nombre)}</option>`).join("")}</select></div></div>
    <div class="form-group"><label>Descripcion</label><textarea class="form-control" name="descripcion">${escapeHtml(current.descripcion || "")}</textarea></div>
    <div class="form-row"><div class="form-group"><label>Prioridad</label><select class="form-control" name="prioridad">${["baja","media","alta","urgente"].map((p) => `<option ${current.prioridad === p ? "selected" : ""}>${p}</option>`).join("")}</select></div><div class="form-group"><label>Estado</label><select class="form-control" name="estado">${["borrador","pendiente","publicada","pausada","completada","cerrada"].map((s) => `<option ${current.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>
    <div class="form-row">${input("cantidad_objetivo","Cantidad objetivo",current.cantidad_objetivo,"number")}${input("cantidad_recibida","Cantidad recibida",current.cantidad_recibida,"number")}</div>
    <div class="form-row">${input("unidad","Unidad",current.unidad)}${input("fecha_limite","Fecha limite",current.fecha_limite,"date")}</div>
    ${input("destino","Destino",current.destino)}${input("solicitante","Solicitante",current.solicitante)}${input("fuente","Fuente",current.fuente)}
    <div class="form-group"><label>Centros asociados</label><select class="form-control" name="centro_ids" multiple>${centers.map((c) => `<option value="${c.id}" ${selected.includes(String(c.id)) ? "selected" : ""}>${escapeHtml(c.nombre)}</option>`).join("")}</select></div>
    <label class="check-item"><input type="checkbox" name="verificada" ${current.verificada ? "checked" : ""}> Verificada</label>
    <button class="btn btn-primary">Guardar</button>
  </form>`;
  document.querySelector("#needForm").onsubmit = async (event) => {
    event.preventDefault();
    const body = formDataObject(event.target);
    body.verificada = event.target.elements.verificada.checked;
    body.centro_ids = Array.from(event.target.elements.centro_ids.selectedOptions).map((o) => o.value);
    await apiRequest(id ? `/api/admin/necesidades/${id}` : "/api/admin/necesidades", { method: id ? "PUT" : "POST", body });
    location.href = "/admin/necesidades.html";
  };
}
