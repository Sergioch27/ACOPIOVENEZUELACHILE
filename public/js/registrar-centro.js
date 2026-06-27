let catalogProducts = [];

const form = document.querySelector("#registerCenter");
const phoneInput = document.querySelector("#phoneInput");
const daysSelect = document.querySelector("#daysSelect");
const schedulePreview = document.querySelector("#schedulePreview");
const receivedBox = document.querySelector("#receivedProducts");
const notReceivedPreview = document.querySelector("#notReceivedPreview");
const regionSelect = document.querySelector("#regionSelect");
const communeSelect = document.querySelector("#communeSelect");
let chileComunas = [];

function splitExtraProducts(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("56")) local = local.slice(2);
  if (local.startsWith("9")) local = local.slice(1);
  local = local.slice(0, 8);
  const first = local.slice(0, 4);
  const second = local.slice(4, 8);
  return `+56 9 ${first}${second ? ` ${second}` : ""}`.trimEnd();
}

function validChilePhone(value) {
  return /^\+56 9 \d{4} \d{4}$/.test(value);
}

function formatHour(value) {
  if (!value) return "";
  const [hour, minutes] = value.split(":");
  return `${Number(hour)}:${minutes}`;
}

function updateSchedulePreview() {
  const start = form?.hora_inicio?.value || "";
  const end = form?.hora_fin?.value || "";
  if (schedulePreview) {
    schedulePreview.textContent = `${daysSelect.value} de ${formatHour(start)} a ${formatHour(end)}`;
  }
}

function selectedProducts() {
  return Array.from(form.querySelectorAll('input[name="productos_recibidos_check"]:checked')).map((input) => input.value);
}

function renderNotReceivedPreview() {
  const selected = new Set(selectedProducts());
  const missing = catalogProducts.filter((item) => !selected.has(item.nombre)).map((item) => item.nombre);
  notReceivedPreview.innerHTML = missing.map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("") || `<span class="tag">Todos los productos marcados</span>`;
}

async function loadRegisterOptions() {
  const orgSelect = document.querySelector("#orgSelect");
  try {
    const options = await apiRequest("/api/registro/opciones");
    orgSelect.innerHTML = `<option value="">Selecciona una organizacion</option>${options.organizaciones.map((org) => `<option value="${org.id}">${escapeHtml(org.nombre)}</option>`).join("")}`;
    catalogProducts = options.productos || [];
    receivedBox.innerHTML = catalogProducts.map((product) => `
      <label class="product-check"><input type="checkbox" name="productos_recibidos_check" value="${escapeHtml(product.nombre)}"> ${escapeHtml(product.nombre)}</label>
    `).join("") || emptyState("No hay productos configurados.");
    receivedBox.querySelectorAll("input").forEach((input) => input.addEventListener("change", renderNotReceivedPreview));
    renderNotReceivedPreview();
  } catch (error) {
    orgSelect.innerHTML = `<option value="">No se pudieron cargar organizaciones</option>`;
    receivedBox.innerHTML = emptyState(error.message);
  }
}

function renderCommunes(regionId) {
  const communes = chileComunas.filter((item) => String(item.region_id) === String(regionId));
  communeSelect.innerHTML = `<option value="">Selecciona una comuna</option>${communes.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
  communeSelect.disabled = !communes.length;
}

function enableManualLocation() {
  const regionInput = document.createElement("input");
  regionInput.className = "form-control";
  regionInput.name = "region";
  regionInput.required = true;
  regionInput.placeholder = "Region";
  regionSelect.replaceWith(regionInput);

  const communeInput = document.createElement("input");
  communeInput.className = "form-control";
  communeInput.name = "comuna";
  communeInput.required = true;
  communeInput.placeholder = "Comuna";
  communeSelect.replaceWith(communeInput);
}

async function loadChileLocationOptions() {
  try {
    const data = await apiRequest("/api/chile/comunas");
    chileComunas = data.comunas || [];
    regionSelect.innerHTML = `<option value="">Selecciona una region</option>${(data.regiones || []).map((region) => `<option value="${region.id}" data-name="${escapeHtml(region.nombre)}">${escapeHtml(region.nombre)}</option>`).join("")}`;
    regionSelect.addEventListener("change", () => {
      const selected = regionSelect.selectedOptions[0];
      regionSelect.dataset.regionName = selected?.dataset?.name || "";
      renderCommunes(regionSelect.value);
    });
  } catch (error) {
    enableManualLocation();
  }
}

phoneInput?.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

["change", "input"].forEach((eventName) => {
  daysSelect?.addEventListener(eventName, updateSchedulePreview);
  form?.hora_inicio?.addEventListener(eventName, updateSchedulePreview);
  form?.hora_fin?.addEventListener(eventName, updateSchedulePreview);
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  phoneInput.value = formatPhone(phoneInput.value);
  if (!validChilePhone(phoneInput.value)) {
    showAlert("#formMsg", "Telefono invalido. Usa el formato +56 9 1234 5678.", "danger");
    return;
  }

  const received = [...selectedProducts(), ...splitExtraProducts(form.otros_recibidos.value)];
  if (!received.length) {
    showAlert("#formMsg", "Selecciona al menos un producto que recibe el centro.", "danger");
    return;
  }

  const selected = new Set(selectedProducts());
  const notReceived = [
    ...catalogProducts.filter((item) => !selected.has(item.nombre)).map((item) => item.nombre),
    ...splitExtraProducts(form.otros_no_recibidos.value)
  ];

  const body = formDataObject(form);
  if (regionSelect?.tagName === "SELECT") {
    body.region = regionSelect.dataset.regionName || regionSelect.selectedOptions[0]?.textContent || body.region;
  }
  body.telefono = phoneInput.value;
  body.horario = `${body.dias_atencion} de ${formatHour(body.hora_inicio)} a ${formatHour(body.hora_fin)}`;
  body.productos_recibidos = [...new Set(received)].join(", ");
  body.productos_no_recibidos = [...new Set(notReceived)].join(", ");
  delete body.dias_atencion;
  delete body.hora_inicio;
  delete body.hora_fin;
  delete body.otros_recibidos;
  delete body.otros_no_recibidos;
  delete body.productos_recibidos_check;

  try {
    await apiRequest("/api/centros/proponer", { method: "POST", body });
    showAlert("#formMsg", "Centro enviado. El equipo lo revisara antes de publicarlo.");
    form.reset();
    phoneInput.value = "+56 9 ";
    updateSchedulePreview();
    renderNotReceivedPreview();
  } catch (error) {
    showAlert("#formMsg", error.message, "danger");
  }
});

loadRegisterOptions();
loadChileLocationOptions();
updateSchedulePreview();
