/* ===============================
   REGISTER
================================= */
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
                skills: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("Verify your email before login.");
            firebase.auth().signOut();
            window.location.href = "login.html";

        } catch (err) {
            alert(err.message);
        }
    });
}

/* ===============================
   LOGIN
================================= */
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

/* ===============================
   REDIRECT BASED ON ROLE
================================= */
function redirectUser(role) {
    if (role === "freelancer")
        window.location.href = "freelancer_profile.html";

    if (role === "client")
        window.location.href = "client_profile.html";
}

/* ===============================
   AUTH CHECK
================================= */
firebase.auth().onAuthStateChanged(async (user) => {
    const skillsSection = document.getElementById("skillsSection");
    const matchedProjectsSection = document.getElementById("matchedProjectsSection");
    const currentPage = window.location.pathname;
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.style.display = user ? "inline-block" : "none";
    }

    if (!user) {
        if (skillsSection) skillsSection.style.display = "none";
        if (matchedProjectsSection) matchedProjectsSection.style.display = "none";
        return;
    }

    const doc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

    if (!doc.exists) return;

    const role = doc.data().role;

    // Page protection
    if (role === "client" && currentPage.includes("freelancer_profile")) {
        window.location.href = "client_profile.html";
    } else if (role === "freelancer" && currentPage.includes("client_profile")) {
        window.location.href = "freelancer_profile.html";
    }

    // Show freelancer skills section
    if (skillsSection && currentPage.includes("freelancer_profile")) {
        skillsSection.style.display = "block";
        loadSkills();
        if (matchedProjectsSection) {
            matchedProjectsSection.style.display = "block";
            loadMatchedProjects();
        }
    }

    // Show client’s posted projects
    if (currentPage.includes("client_profile")) {
        loadClientProjects(user.uid);
    }

    // Show all projects (projects.html)
    if (currentPage.includes("projects.html")) {
        loadAllProjects(role, user.uid);
    }
});

/* ===============================
   LOGOUT
================================= */
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
    });
}

/* ===============================
   SAVE SKILLS
================================= */
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
    loadMatchedProjects();
}

/* ===============================
   LOAD SKILLS
================================= */
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

/* ===============================
   POST PROJECT (CLIENT)
================================= */
const addProjectForm = document.getElementById("addProjectForm");
if (addProjectForm) {
    addProjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("projectTitle").value;
        const description = document.getElementById("projectDescription").value;
        const skills = document.getElementById("projectSkills").value.split(",").map(s => s.trim());
        const budget = parseInt(document.getElementById("projectBudget").value);

        const user = firebase.auth().currentUser;
        if (!user) {
            alert("You must be logged in to post a project.");
            return;
        }

        try {
            await firebase.firestore().collection("projects").add({
                title,
                description,
                skills,
                budget,
                clientId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Project posted successfully!");
            window.location.href = "projects.html";
        } catch (error) {
            console.error("Error adding project: ", error);
            alert("Failed to post project. Try again.");
        }
    });
}

/* ===============================
   LOAD CLIENT PROJECTS
================================= */
function loadClientProjects(clientId) {
    const container = document.getElementById("clientProjectsContainer");
    if (!container) return;

    firebase.firestore().collection("projects")
        .where("clientId", "==", clientId)
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {
            container.innerHTML = "";
            snapshot.forEach(doc => {
                const project = doc.data();
                container.innerHTML += `
                    <div class="project-card">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <p><strong>Skills:</strong> ${project.skills.join(", ")}</p>
                        <p><strong>Budget:</strong> ₹${project.budget}</p>
                    </div>
                `;
            });
        });
}

/* ===============================
   LOAD ALL PROJECTS (PROJECTS PAGE)
================================= */
function loadAllProjects(role, userId) {
    const container = document.getElementById("projectsContainer");
    if (!container) return;

    firebase.firestore().collection("projects")
        .orderBy("createdAt", "desc")
        .onSnapshot(async snapshot => {
            container.innerHTML = "";

            let userSkills = [];
            if (role === "freelancer") {
                const doc = await firebase.firestore().collection("users").doc(userId).get();
                userSkills = doc.data().skills || [];
            }

            snapshot.forEach(doc => {
                const project = doc.data();

                // Skill-based filtering for freelancers
                if (role === "freelancer" && userSkills.length > 0) {
                    if (!userSkills.some(skill => project.skills.includes(skill))) {
                        return; // skip non-matching projects
                    }
                }

                container.innerHTML += `
                    <div class="project-card">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <p><strong>Skills:</strong> ${project.skills.join(", ")}</p>
                        <p><strong>Budget:</strong> ₹${project.budget}</p>
                    </div>
                `;
            });
        });
}

/* ===============================
   LOAD MATCHED PROJECTS (FREELANCER PROFILE)
================================= */
async function loadMatchedProjects() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const doc = await firebase.firestore().collection("users").doc(user.uid).get();
    const skills = doc.data().skills || [];

    const projectsContainer = document.getElementById("projectsContainer");
    if (!projectsContainer) return;

    firebase.firestore().collection("projects")
        .orderBy("createdAt", "desc")
        .get()
        .then(snapshot => {
            projectsContainer.innerHTML = "";
            snapshot.forEach(doc => {
                const project = doc.data();
                if (skills.some(skill => project.skills.includes(skill))) {
                    projectsContainer.innerHTML += `
                        <div class="project-card">
                            <h3>${project.title}</h3>
                            <p>${project.description}</p>
                            <p><strong>Skills:</strong> ${project.skills.join(", ")}</p>
                            <p><strong>Budget:</strong> ₹${project.budget}</p>
                        </div>
                    `;
                }
            });
        });
}
