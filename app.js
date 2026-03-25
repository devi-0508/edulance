console.log("Firebase Loaded:", typeof firebase !== "undefined");

/* REGISTER */
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const role = document.getElementById("userRole").value;

        if (!role) {
            alert("Select role");
            return;
        }

        try {
            const cred = await firebase.auth()
                .createUserWithEmailAndPassword(email, password);

            const user = cred.user;

            await user.sendEmailVerification();

            await firebase.firestore().collection("users").doc(user.uid).set({
                name,
                email,
                role,
                skills: []
            });

            alert("Verify your email before login.");
            firebase.auth().signOut();
            window.location.href = "login.html";

        } catch (err) {
            alert(err.message);
        }
    });
}

/* LOGIN */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const cred = await firebase.auth()
                .signInWithEmailAndPassword(email, password);

            const user = cred.user;

            if (!user.emailVerified) {
                alert("Verify email first");
                firebase.auth().signOut();
                return;
            }

            const doc = await firebase.firestore()
                .collection("users")
                .doc(user.uid)
                .get();

            const role = doc.data().role;

            redirectUser(role);

        } catch (err) {
            alert(err.message);
        }
    });
}

/* REDIRECT */
function redirectUser(role) {
    if (role === "freelancer")
        window.location.href = "freelancer_profile.html";

    if (role === "client")
        window.location.href = "client_profile.html";
}

/* AUTH CHECK */
firebase.auth().onAuthStateChanged(async (user) => {

    const skillsSection = document.getElementById("skillsSection");
    const currentPage = window.location.pathname;

    const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.style.display = user ? "inline-block" : "none";
}

    if (!user) {
        if (skillsSection) skillsSection.style.display = "none";
        return;
    }

    const doc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

    if (!doc.exists) return;

    const role = doc.data().role;

    /* PAGE PROTECTION */
    if (role === "client" && currentPage.includes("freelancer_profile")) {
    window.location.href = "client_profile.html";
} else if (role === "freelancer" && currentPage.includes("client_profile")) {
    window.location.href = "freelancer_profile.html";
}

    /* SHOW SKILLS ONLY HERE */
    if (skillsSection && currentPage.includes("freelancer_profile")) {
        skillsSection.style.display = "block";
        loadSkills();
    }
});

/* LOGOUT */
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
    });
}

/* SAVE SKILLS */
async function saveSkills() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const selectedSkills = [];

    document.querySelectorAll('#skillsSection input:checked')
        .forEach(cb => selectedSkills.push(cb.value));

    await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .update({ skills: selectedSkills });

    alert("Skills saved!");
}

/* LOAD SKILLS */
async function loadSkills() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const doc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

    const savedSkills = doc.data().skills || [];

    document.querySelectorAll('#skillsSection input')
        .forEach(cb => {
            cb.checked = savedSkills.includes(cb.value);
        });
}