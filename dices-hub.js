//O - Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, onValue, ref, get} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    databaseURL: "https://gambling-goldmine-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.firebasestorage.app",
    messagingSenderId: "159900206701",
    appId: "1:159900206701:web:01223c4665df6f7377a164"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

//O - Check login
const token = localStorage.getItem("userToken");
console.log("Token: " + token);
async function checkLogin() {
    if (!token) {
        localStorage.removeItem("userToken");
        window.location.href = "index.html";
    } else if (token == 1) {
        console.log("LOCAL MODE");
        return;
    }

    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/check_token", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    const tokenValid = await res.json();
    console.log("Token validity response: ", tokenValid);
    if (!tokenValid.tokenValid) {
        console.log("Token invalid");
        setTimeout(() => {
            localStorage.removeItem("userToken");
            window.location.href = "index.html";
        }, 5000);
    }
}

//O - Get lobbies
async function loadLobbies() {
    let lobbies = [];

    //O - Getting lobbies from firebase
    const pathRef = ref(db, "games/lobbies/dices");

    const snapshot = await get(pathRef);
    if (snapshot.exists()) {
        const data = snapshot.val();

        for (const lobby in data) {

            lobbies[lobby] = data[lobby];

        }

        console.log("Loaded lobbies: ", lobbies);

    } else {
        console.log("Failed to load lobbies");
    }

    //O - Listing lobbies
    const lobbiesDiv = document.getElementById("lobbies");
    lobbiesDiv.replaceChildren();

    lobbies.forEach(lobby => {
        const lobbyDiv = document.createElement("div");
        const lobbyName = document.createElement("p");
        const hostName = document.createElement("p");
        const joinBtn = document.createElement("button");

        lobbyDiv.appendChild(lobbyName);
        lobbyDiv.appendChild(hostName);
        lobbyDiv.appendChild(joinBtn);

        lobbyName.textContent = lobby.name;
        hostName.textContent = lobby.hostNick;
        joinBtn.textContent = "Join";

        joinBtn.addEventListener("click", () => {
            localStorage.setItem("lobbyName", lobby.name)
            window.location.href = "dices-game.html";
        })

        lobbyDiv.classList.add("lobby");
        lobbiesDiv.appendChild(lobbyDiv);
    });
}

async function createLobby(inputLobbyName) {
    const res = await fetch("https://dices-create-gtw5ppnvta-ey.a.run.app", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"lobbyName": inputLobbyName})
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        return true;
    }
}

//O - Main logic
checkLogin();
loadLobbies();

//O - Buttons and leaving
document.getElementById("refresh").addEventListener("click", () => {
    loadLobbies();
});

const createForm = document.getElementById("createForm");
createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputLobbyName = document.getElementById("inputName").textContent;
    
    if (createLobby(inputLobbyName)) {
        console.log("Lobby created");
    } else {
        console.log("no.");
    }
});

window.addEventListener("keydown", (key) => {
    if (key.key === "l") {
        window.location.href = "navigation.html";
    }
})