import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

let uid;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        localStorage.clear()
        window.location.href = 'index.html';
        return;
    }

    uid = user.uid;
    loadData();
});

async function loadData() {
    const dataSnap = await get(ref(db, `/users/${uid}`));
    const playerData = dataSnap.val();

    //Set profile picture here
    document.getElementById("username").textContent = "Username: " + playerData["accountInfo"]["username"];
    document.getElementById("money").textContent = "Net worth:" + playerData["credits"];

    const createdSec = playerData.accountInfo.createDate;
    const createdDate = new Date(createdSec * 1000);
    const dd = String(createdDate.getDate()).padStart(2, '0');
    const mm = String(createdDate.getMonth() + 1).padStart(2, '0');
    const yyyy = createdDate.getFullYear();
    document.getElementById("createDate").textContent = "Account creation date: " + dd + "." + mm + "." + yyyy;

    const slotStatsList = document.getElementById("slotStats").children;
    for (const child of slotStatsList) {
        if (child.tagName == 'P') {
            const noPrefix = child.id.replace("slot", "");
            const formatedName = noPrefix.charAt(0).toLocaleLowerCase() + noPrefix.slice(1);
            child.textContent = child.textContent + playerData["slotMachine"][formatedName];
        }
    }

    const wheelStatsList = document.getElementById("wheelStats").children;
    for (const child of wheelStatsList) {
        if (child.tagName == 'P') {
            const noPrefix = child.id.replace("wheel", "");
            const formatedName = noPrefix.charAt(0).toLocaleLowerCase() + noPrefix.slice(1);
            child.textContent = child.textContent + playerData["wheelOfFortune"][formatedName];
        }
    }

    const farkleStatsList = document.getElementById("farkleStats").children;
    for (const child of farkleStatsList) {
        if (child.tagName == 'P') {
            const noPrefix = child.id.replace("farkle", "");
            const formatedName = noPrefix.charAt(0).toLocaleLowerCase() + noPrefix.slice(1);
            child.textContent = child.textContent + playerData["farkle"][formatedName];
        }
    }

    document.getElementById("exitBtn").addEventListener("click", () => {
        window.location.href = "navigation.html";
    })
}