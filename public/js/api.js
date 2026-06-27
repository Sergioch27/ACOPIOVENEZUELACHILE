async function apiRequest(url, options = {}) {
  const config = {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  };
  if (config.body && typeof config.body !== "string") config.body = JSON.stringify(config.body);
  const response = await fetch(url, config);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" });
}

function formatQty(value, unit = "") {
  return `${Number(value || 0).toLocaleString("es-CL")} ${escapeHtml(unit)}`.trim();
}

function progressPercent(item) {
  const objetivo = Number(item.cantidad_objetivo || 0);
  if (!objetivo) return 0;
  return Math.min(100, Math.round((Number(item.cantidad_recibida || 0) * 100) / objetivo));
}

function badge(value) {
  const text = escapeHtml(value || "sin estado");
  const label = text.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const cls = ["verificado", "publicada", "completada", "aprobado"].includes(value) ? "success"
    : ["urgente", "rechazado", "cerrado", "suspendido"].includes(value) ? "danger"
    : ["pendiente", "requiere_actualizacion", "alta"].includes(value) ? "warning"
    : "primary";
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function showAlert(target, message, type = "success") {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function loader(text = "Cargando informacion...") {
  return `<div class="loader">${escapeHtml(text)}</div>`;
}

function emptyState(text = "No hay resultados para mostrar.") {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function confirmAction(text) {
  return window.confirm(text || "Confirma esta accion.");
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function needCard(item) {
  const pct = progressPercent(item);
  return `<article class="card need-card">
    <div class="card-title-row">
      <div>
        <h3>${escapeHtml(item.nombre)}</h3>
        <p class="muted">${escapeHtml(item.categoria_nombre || "Sin categoria")}</p>
      </div>
      <div class="actions">${badge(item.prioridad)}</div>
    </div>
    <p class="muted">${escapeHtml(item.descripcion || "")}</p>
    <div class="info-list">
      <div class="info-item"><span class="info-label">Objetivo</span><span class="info-value">${formatQty(item.cantidad_objetivo, item.unidad)}</span></div>
      <div class="info-item"><span class="info-label">Recibido</span><span class="info-value">${formatQty(item.cantidad_recibida, item.unidad)}</span></div>
    </div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <div class="need-meta"><span>${pct}% cubierto</span><span>Faltan ${formatQty(item.cantidad_faltante, item.unidad)}</span></div>
    <div class="card-section">
      <p class="card-section-title">Destino y centro</p>
      <p class="muted">${escapeHtml(item.destino || "Sin destino")} | ${escapeHtml(item.centros_nombres || "Por asignar")}</p>
    </div>
    <p class="muted">Verificada: ${item.verificada ? "si" : "no"} | Limite: ${formatDate(item.fecha_limite)}</p>
  </article>`;
}

function initMobileMenu() {
  document.querySelectorAll(".site-header .nav").forEach((nav) => {
    const links = nav.querySelector(".nav-links");
    if (!links || nav.querySelector(".menu-toggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-toggle";
    button.setAttribute("aria-label", "Abrir menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = "<span></span><span></span><span></span>";
    nav.insertBefore(button, links);

    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");
    });

    links.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Abrir menu");
      });
    });
  });
}

function initBrandLogo() {
  document.querySelectorAll(".brand").forEach((brand) => {
    if (brand.querySelector(".brand-logo")) return;
    const textNodes = Array.from(brand.childNodes);
    const copy = document.createElement("span");
    copy.className = "brand-copy";
    textNodes.forEach((node) => copy.appendChild(node));

    const logo = document.createElement("img");
    logo.className = "brand-logo";
    logo.src = "/assets/images/logo-acopio.png";
    logo.onerror = () => {
      logo.onerror = null;
      logo.src = "/assets/images/logo-acopio.svg";
    };
    logo.alt = "";
    logo.setAttribute("aria-hidden", "true");

    brand.appendChild(logo);
    brand.appendChild(copy);
  });
}

initBrandLogo();
initMobileMenu();
