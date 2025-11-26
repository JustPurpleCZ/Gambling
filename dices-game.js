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

const playerList = document.getElementById("playerList");
document.getElementById("lobbyName").textContent = await get(ref(db, `/games/lobbies/dices/${lobbyId}/name`));
const isHost = JSON.parse(localStorage.getItem("dicesIsHost"));
const token = localStorage.getItem("userToken");
console.log("Host: ", isHost, "LobbyId: ", lobbyId);

onChildAdded(playersRef, (snapshot) => {
    const player = snapshot.val();
    console.log("Player joined:", player.username);

    const playerDiv = document.createElement("div");
    const name = document.createElement("p");

    if (isHost) {
        const kickBtn = document.createElement("button");
        playerDiv.appendChild(kickBtn);
        kickBtn.textContent = "kick player";

        kickBtn.addEventListener("click", () => {
            kick(snapshot.key);
        });

    }

    playerList.appendChild(playerDiv);
    playerDiv.appendChild(name);

    name.textContent = player.username;
});

onChildRemoved(playersRef, (snapshot) => {
    const player = snapshot.val();
    const username = player.username;
    console.log("Player left:", player.username);

    const paragraphs = playerList.querySelectorAll("p");
    
    paragraphs.forEach(p => {
        if (p.textContent === username) {
            p.remove();
        }
    });
});

let startBtn = document.getElementById("startBtn");
if (isHost) {
    startBtn.style.display = "block";

    startBtn.addEventListener("click", () => {
        //Start game
    })
}

async function kick(kickPlayer) {
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


}