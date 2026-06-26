async function loadNeeds() {
  const params = new URLSearchParams(new FormData(document.querySelector("#filters")));
  const list = document.querySelector("#needsList");
  list.innerHTML = loader();
  try {
    const needs = await apiRequest(`/api/necesidades?${params}`);
    list.innerHTML = needs.map(needCard).join("") || emptyState();
  } catch (error) {
    list.innerHTML = emptyState(error.message);
  }
}
document.querySelector("#filters")?.addEventListener("submit", (event) => { event.preventDefault(); loadNeeds(); });
loadNeeds();
