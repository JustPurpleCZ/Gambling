import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onValue, onChildAdded, onChildRemoved, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

const lobbyId = localStorage.getItem("dicesLobbyId");
const playersRef = ref(db, `/games/lobbies/dices/${lobbyId}/players`);
const lobbyRef = ref(db, `/games/lobbies/dices/${lobbyId}`);

let lobbyInfo;
get(lobbyRef).then((snapshot) => {
    if (snapshot.exists()) {
        lobbyInfo = snapshot.val();
        console.log("Lobby data", lobbyInfo)
    } else {
        console.log("Lobby data failed to load");
    }
}).catch(console.error);

const playerList = document.getElementById("playerList");
const isHost = JSON.parse(localStorage.getItem("dicesIsHost"));
const token = localStorage.getItem("userToken");
console.log("Host: ", isHost, "LobbyId: ", lobbyId);

onChildAdded(playersRef, () => {
    updatePlayerList();
});

onChildRemoved(playersRef, () => {
    updatePlayerList();
});

let startBtn = document.getElementById("startBtn");
if (isHost) {
    startBtn.style.display = "block";

    startBtn.addEventListener("click", () => {
        console.log("Starting game");
        //Start game
    })
}

async function updatePlayerList() {
    console.log("Updating player list");
    let playerCount = 0;
    let players;

    get(playersRef).then((snapshot) => {
        if (snapshot.exists()) {
            players = snapshot.val();
            console.log("Player list:", players);

            playerList.replaceChildren();

            Object.values(players).forEach(player => {
                console.log("Adding player:", player.username);
                playerCount++;
                playerCountPar = playerCount + "/" + lobbyInfo.maxPlayers;
                const playerDiv = document.createElement("div");
                const name = document.createElement("p");

                playerList.appendChild(playerDiv);
                playerDiv.appendChild(name);

                if (isHost) {
                    const kickBtn = document.createElement("button");
                    playerDiv.appendChild(kickBtn);
                    kickBtn.textContent = "kick player";

                    kickBtn.addEventListener("click", () => {
                        kick(snapshot.key);
                    });
                }

                name.textContent = player.username;
            });
        } else {
            console.log("Not found");
        }
    }).catch(console.error);

    playerCountPar.textContent = playerCount + "/" + lobbyInfo.maxPlayers;
}

async function kick(kickPlayer) {
    /*
    const res = await fetch("https://dices-kick-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
                "user": kickPlayer
            })
    });

    const response = await res.json();
    console.log(response);

    */
   console.log("Kicking disabled");
}

async function leaveLobby() {
    const res = await fetch(" https://dices-leave-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "lobbyId": lobbyId,
            })
    });

    const response = await res.json();
    console.log(response);

    if (response.success) {
        localStorage.removeItem("dicesLobbyId", "dicesIsHost");
        window.location.href = "dices-hub.html";
    } else {
        console.log("Failed to leave:", response.reply);
    }
}

document.getElementById("leaveBtn").addEventListener("click", () => {
    leaveLobby();
})