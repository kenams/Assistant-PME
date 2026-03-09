(() => {
  const clearSession = () => {
    try {
      localStorage.removeItem("assistant_token");
      localStorage.removeItem("assistant_user_presentation");
    } catch (err) {
      // ignore storage errors
    }
  };

  const handleLogout = (event) => {
    const target = event.target.closest("[data-logout]");
    if (!target) return;
    event.preventDefault();
    clearSession();
    window.location.href = "/app/user/";
  };

  document.addEventListener("click", handleLogout);
})();
