const nameP = document.getElementById("lobbyName");
nameP.textContent = localStorage.getItem("lobbyName");

window.addEventListener("keydown", (key) => {
    if (key.key === "l") {
        localStorage.removeItem("lobbyName");
        window.location.href = "dices-hub.html";
    }
})