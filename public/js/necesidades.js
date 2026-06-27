const filtersForm = document.querySelector("#filters");

function setSelectOptions(select, items, defaultLabel) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>${items.map((item) => {
    const value = typeof item === "string" ? item : item.nombre;
    return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
  }).join("")}`;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  params.forEach((value, key) => {
    const field = filtersForm?.elements[key];
    if (field) field.value = value;
  });
}

async function loadFilterOptions() {
  try {
    const options = await apiRequest("/api/necesidades/opciones");
    setSelectOptions(document.querySelector("#categoryFilter"), options.categorias || [], "Todas las categorias");
    setSelectOptions(document.querySelector("#regionFilter"), options.regiones || [], "Todas las regiones");
    applyUrlFilters();
  } catch (error) {
    console.error(error);
  }
}

async function loadNeeds() {
  const params = new URLSearchParams(new FormData(filtersForm));
  const list = document.querySelector("#needsList");
  list.innerHTML = loader();
  try {
    const needs = await apiRequest(`/api/necesidades?${params}`);
    list.innerHTML = needs.map(needCard).join("") || emptyState();
  } catch (error) {
    list.innerHTML = emptyState(error.message);
  }
}

filtersForm?.addEventListener("submit", (event) => { event.preventDefault(); loadNeeds(); });
filtersForm?.addEventListener("change", loadNeeds);

loadFilterOptions().finally(loadNeeds);
