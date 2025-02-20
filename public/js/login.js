document.addEventListener("DOMContentLoaded", () => {
  fetch('/session-notification')
    .then(response => response.text())
    .then(message => {
      if (message.trim() !== "") {
        showNotification(message);
      }
    });

  function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.innerText = message;
    notification.style.display = "block";
    notification.style.opacity = "1";

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.style.display = "none", 500);
    }, 5000);
  }
});
