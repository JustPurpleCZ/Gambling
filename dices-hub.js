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

//O - Main logic
checkLogin();