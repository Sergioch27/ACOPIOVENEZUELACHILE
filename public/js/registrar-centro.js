document.querySelector("#registerCenter")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await apiRequest("/api/centros/proponer", { method: "POST", body: formDataObject(event.target) });
    showAlert("#formMsg", "Centro enviado. El equipo lo revisara antes de publicarlo.");
    event.target.reset();
  } catch (error) {
    showAlert("#formMsg", error.message, "danger");
  }
});
