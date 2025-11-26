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

let lobbies = [];

//O - Get lobbies
async function loadLobbies() {
    lobbies = [];

    //O - Getting lobbies from firebase
    const pathRef = ref(db, "games/lobbies/dices");

    const snapshot = await get(pathRef);
    if (snapshot.exists()) {
        const data = snapshot.val();

        for (const lobby in data) {

            lobbies.push(data[lobby]);

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
        const playerCount = document.createElement("p");
        const isPrivate = document.createElement("p");
        const betSize = document.createElement("p");

        lobbyDiv.appendChild(lobbyName);
        lobbyDiv.appendChild(hostName);
        lobbyDiv.appendChild(betSize);
        lobbyDiv.appendChild(playerCount);
        lobbyDiv.appendChild(isPrivate);
        lobbyDiv.appendChild(joinBtn);

        lobbyName.textContent = lobby.name;
        hostName.textContent = lobby.hostNick;
        playerCount.textContent = lobby.playerCount + "/" + lobby.maxPlayers;
        isPrivate.textContent = "Public";
        if (lobby.isPrivate) {
            isPrivate.textContent = "Private";
        }
        joinBtn.textContent = "Join";
        betSize.textContent = lobby.betSize;

        joinBtn.addEventListener("click", () => {
            joinLobby(lobby.lobbyId);
        })

        lobbyDiv.classList.add("lobby");
        lobbiesDiv.appendChild(lobbyDiv);
    });
}

async function createLobby() {
    const inputLobbyName = document.getElementById("inputName").value;
    const inputMaxPlayers = document.getElementById("inputMaxPlayers").value;
    let inputPassword = document.getElementById("inputCreatePassword").value;
    const inputBetSize = document.getElementById("inputCreateBetSize").value;

    console.log("Creating lobby with params:");
    console.log("Lobby name:", inputLobbyName);
    console.log("Max players:", inputMaxPlayers);
    console.log("Password:", inputPassword);

    if (inputPassword == "") {
        inputPassword = null;
    }
    const res = await fetch("https://dices-create-gtw5ppnvta-ey.a.run.app", {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "lobbyName": inputLobbyName,
            "maxPlayers": inputMaxPlayers,
            "password": inputPassword,
            "betSize": inputBetSize
        })
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        console.log("Lobby created");
        localStorage.setItem("dicesLobbyId", response.lobbyId);
        localStorage.setItem("dicesIsHost", true);
        window.location.href = "dices-game.html";
        return;
    } else {
        console.log("Failed to create lobby:", response.reply);
    }
}

async function joinLobby(selectedLobbyId) {
    console.log("Joinning lobby with params:");
    console.log("LobbyID:", selectedLobbyId);
    console.log("Password:", document.getElementById("inputJoinPassword").value);

    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/dices_join", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": selectedLobbyId,
                "password": document.getElementById("inputJoinPassword").value
            })
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        console.log("Lobby joined");
        localStorage.setItem("dicesLobbyId", selectedLobbyId);
        localStorage.setItem("dicesIsHost", false);
        window.location.href = "dices-game.html";
        return;
    } else {
        console.log("Failed to join lobby:", response.reply);
    }
}

async function quickJoin() {
    const inputJoinBetSize = document.getElementById("inputJoinBetSize").value;
    lobbies.forEach(lobby => {
        if (lobby.maxPlayers == 2 && lobby.playerCount < 2 && lobby.betSize == inputJoinBetSize && !lobby.isPrivate) {
            joinLobby(lobby.lobbyId);
        }
    });
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
    createLobby();
});

const quickJoinForm = document.getElementById("quickJoinForm");
quickJoinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    quickJoin();
});

window.addEventListener("keydown", (key) => {
    if (key.key === "l") {
        window.location.href = "navigation.html";
    }
})