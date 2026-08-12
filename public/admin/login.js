(function () {
  const form = document.querySelector("[data-login-form]");
  const message = document.querySelector("[data-message]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    const payload = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      message.textContent = data.error || "Login failed";
      return;
    }
    location.href = "/admin";
  });
})();
