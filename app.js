/* =====================================================
   EduLance - Main App Logic (EMAIL VERIFIED VERSION)
===================================================== */

console.log("Firebase Loaded:", typeof firebase !== "undefined");


/* =====================================================
   FIREBASE REGISTER
===================================================== */

const registerForm = document.getElementById("registerForm");

if (registerForm && typeof firebase !== "undefined") {

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const role = document.getElementById("userRole").value;

        if (!role) {
            alert("Please select account type");
            return;
        }

        try {

            /* CREATE AUTH ACCOUNT */
            const cred = await firebase.auth()
                .createUserWithEmailAndPassword(email, password);

            const user = cred.user;

            /* SEND EMAIL VERIFICATION */
            await user.sendEmailVerification();

            const db = firebase.firestore();

            /* SAVE USER PROFILE */
            await db.collection("users").doc(user.uid).set({
                name: name,
                email: email,
                role: role,
                emailVerified: false,
                createdAt: new Date()
            });

            alert(
                "✅ Registration successful!\n\n" +
                "Verification email sent.\n" +
                "Please verify your email before logging in."
            );

            firebase.auth().signOut();
            window.location.href = "login.html";

        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });
}


/* =====================================================
   FIREBASE LOGIN
===================================================== */

const loginForm = document.getElementById("loginForm");

if (loginForm && typeof firebase !== "undefined") {

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {

            const cred = await firebase.auth()
                .signInWithEmailAndPassword(email, password);

            const user = cred.user;

            /* 🚨 BLOCK UNVERIFIED USERS */
            if (!user.emailVerified) {

                alert("Please verify your email before logging in.");
                await firebase.auth().signOut();
                return;
            }

            const db = firebase.firestore();

            const doc = await db
                .collection("users")
                .doc(user.uid)
                .get();

            const role = doc.data().role;

            alert("Login successful!");
            redirectUser(role);

        } catch (err) {
            alert(err.message);
        }
    });
}


/* =====================================================
   ROLE REDIRECTION
===================================================== */

function redirectUser(role) {

    if (role === "freelancer")
        window.location.href = "freelancer_profile.html";

    if (role === "client")
        window.location.href = "client_profile.html";
}


/* =====================================================
   ROLE-BASED PAGE PROTECTION + SKILLS DISPLAY
===================================================== */

if (typeof firebase !== "undefined") {

    firebase.auth().onAuthStateChanged(async (user) => {

        const skillsSection = document.getElementById("skillsSection");

        /* USER NOT LOGGED IN */
        if (!user) {
            if (skillsSection) skillsSection.style.display = "none";
            return;
        }

        const db = firebase.firestore();

        try {

            const doc = await db
                .collection("users")
                .doc(user.uid)
                .get();

            if (!doc.exists) return;

            const role = doc.data().role;
            const currentPage = window.location.pathname;

            /* ROLE PROTECTION */
            if (
                role === "client" &&
                currentPage.includes("freelancer_profile.html")
            ) {
                window.location.href = "client_profile.html";
            }

            if (
                role === "freelancer" &&
                currentPage.includes("client_profile.html")
            ) {
                window.location.href = "freelancer_profile.html";
            }

            /* ✅ SHOW SKILLS SECTION */
            if (skillsSection) {
                skillsSection.style.display = "block";
                loadSkills();
            }

        } catch (error) {
            console.error("Role check error:", error);
        }
    });
}


/* =====================================================
   LOGOUT
===================================================== */

window.logout = function () {

    firebase.auth().signOut()
        .then(() => {
            alert("Logged out successfully!");
            window.location.href = "index.html";
        });
};

/* =====================================================
   SKILLS SYSTEM
===================================================== */

async function saveSkills() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    const db = firebase.firestore();

    const selectedSkills = [];

    document.querySelectorAll('#skillsSection input[type="checkbox"]:checked')
        .forEach(cb => selectedSkills.push(cb.value));

    await db.collection("users").doc(user.uid).update({
        skills: selectedSkills
    });

    alert("Skills saved!");
}


async function loadSkills() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    const db = firebase.firestore();

    const doc = await db.collection("users").doc(user.uid).get();

    const savedSkills = doc.data().skills || [];

    document.querySelectorAll('#skillsSection input[type="checkbox"]')
        .forEach(cb => {
            cb.checked = savedSkills.includes(cb.value);
        });
}

