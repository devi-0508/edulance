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
    const resumeLink = document.getElementById("resumeLink")?.value.trim();
    const verificationFolderLink = document.getElementById("verificationFolderLink")?.value.trim();

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
        resumeLink,
        verificationFolderLink,
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

    const loginLink = document.getElementById("loginLink");
    const registerLink = document.getElementById("registerLink");

    if (user) {
        if (loginLink) loginLink.style.display = "none";
        if (registerLink) registerLink.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
        if (loginLink) loginLink.style.display = "inline-block";
        if (registerLink) registerLink.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
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

    const data = doc.data();

    const profileResume = document.getElementById("profileResume");
    if (profileResume) {
      if (data.resumeLink) {
        profileResume.href = data.resumeLink;
        profileResume.textContent = "View Resume";
      } else {
        profileResume.removeAttribute("href");
        profileResume.textContent = "Not provided";
      }
    }

    const profileId = document.getElementById("profileId");
    if (profileId) {
      if (data.idLink) {
        profileId.href = data.idLink;
        profileId.textContent = "View ID";
      } else {
        profileId.removeAttribute("href");
        profileId.textContent = "Not provided";
      }
    }

    const role = data.role;

    const adminLink = document.getElementById("adminLink");

    if (adminLink && data.isAdmin) {
        adminLink.style.display = "inline-block";
    }

    if (role === "client" && currentPage.includes("freelancer_profile")) {
        window.location.href = "client_profile.html";
    } else if (role === "freelancer" && currentPage.includes("client_profile")) {
        window.location.href = "freelancer_profile.html";
    }

    if (skillsSection && currentPage.includes("freelancer_profile")) {
        skillsSection.style.display = "block";
        loadSkills();
        if (matchedProjectsSection) {
            matchedProjectsSection.style.display = "block";
            loadMatchedProjects();
        }
    }

    if (currentPage.includes("client_profile")) {
        loadClientProjects(user.uid);
    }

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
   SAVE PROFILE LINKS
================================= */
document.getElementById("saveProfileBtn")?.addEventListener("click", async () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const resumeLink = document.getElementById("resumeLink")?.value.trim();
  const idLink = document.getElementById("idLink")?.value.trim();

  try {
    await firebase.firestore().collection("users").doc(user.uid).update({
      resumeLink: resumeLink || null,
      idLink: idLink || null
    });
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Failed to update profile.");
  }
});

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
   POST PROJECT
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
        if (!user) return alert("Login first");

        await firebase.firestore().collection("projects").add({
            title,
            description,
            skills,
            budget,
            clientId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Project posted!");
        window.location.href = "projects.html";
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
        .onSnapshot(snapshot => {
            container.innerHTML = "";
            snapshot.forEach(doc => {
                const p = doc.data();
                container.innerHTML += `<div><h3>${p.title}</h3><p>${p.description}</p></div>`;
            });
        });
}

/* ===============================
   LOAD ALL PROJECTS
================================= */
function loadAllProjects(role, userId) {
    const container = document.getElementById("projectsContainer");
    if (!container) return;

    firebase.firestore().collection("projects")
        .onSnapshot(async snapshot => {
            container.innerHTML = "";

            let userSkills = [];
            if (role === "freelancer") {
                const doc = await firebase.firestore().collection("users").doc(userId).get();
                userSkills = doc.data().skills || [];
            }

            snapshot.forEach(doc => {
                const project = doc.data();

                if (role === "freelancer" &&
                    !userSkills.some(skill => project.skills.includes(skill))) return;

                container.innerHTML += `<div><h3>${project.title}</h3></div>`;
            });
        });
}

/* ===============================
   LOAD MATCHED PROJECTS
================================= */
async function loadMatchedProjects() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const userDoc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

    const skills = userDoc.data()?.skills || [];

    const container = document.getElementById("projectsContainer");
    if (!container) return;

    const snapshot = await firebase.firestore()
        .collection("projects")
        .get();

    container.innerHTML = "";

    for (const projectDoc of snapshot.docs) {
        const project = projectDoc.data();

        const projectSkills = project.skills || [];

        if (skills.some(skill => projectSkills.includes(skill))) {

            let clientEmail = "Not available";

if (project.clientId) {
    try {
        const clientDoc = await firebase.firestore()
            .collection("users")
            .doc(project.clientId)
            .get();

        if (clientDoc.exists) {
            const clientData = clientDoc.data();
            console.log("Client Data:", clientData); // 🔍 DEBUG

            if (clientData.email) {
                clientEmail = clientData.email;
            }
        }
    } catch (error) {
        console.error("Error fetching client:", error);
    }
}

if (project.clientId) {
    try {
        const clientDoc = await firebase.firestore()
            .collection("users")
            .doc(project.clientId)
            .get();

        if (clientDoc.exists && clientDoc.data().email) {
            clientEmail = clientDoc.data().email;
        }
    } catch (error) {
        console.error("Error fetching client:", error);
    }
}

            container.innerHTML += `
                <div class="project-card">
                    <h3>${project.title}</h3>
                    <p>${project.description || ""}</p>
                    <p><strong>Skills:</strong> ${projectSkills.join(", ")}</p>
                    <p><strong>Budget:</strong> ₹${project.budget}</p>
                    <p><strong>Client Email:</strong> 
                        <p><strong>Client Email:</strong> ${clientEmail}</p>
                    </p>
                </div>
            `;
        }
    }
}

/* ===============================
   LOAD FREELANCERS
================================= */
function loadFreelancers(skillFilter = "") {
  const container = document.getElementById("freelancersContainer");
  if (!container) return;

  firebase.firestore().collection("users")
    .where("role", "==", "freelancer")
    .get()
    .then(snapshot => {
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const freelancer = doc.data();
        const skills = freelancer.skills || [];

        if (skillFilter &&
            !skills.some(s => s.toLowerCase() === skillFilter.toLowerCase())) return;

        container.innerHTML += `
  <div class="freelancer-card">
    <h3>${freelancer.name || "Unnamed Freelancer"}</h3>
    <p><strong>Email:</strong> ${freelancer.email || "N/A"}</p>
    <p><strong>Skills:</strong> ${
      skills.length ? skills.join(", ") : "No skills listed"
    }</p>
    <p><strong>Resume:</strong> ${
      freelancer.resumeLink 
        ? `<a href="${freelancer.resumeLink}" target="_blank">View Resume</a>` 
        : "Not provided"
    }</p>
    <button class="offer-btn" onclick="offerProject('${doc.id}')">
      Offer Project
    </button>
  </div>
`;
      });
    });
}

function filterFreelancers() {
  const skill = document.getElementById("skillFilter").value.trim();
  loadFreelancers(skill);
}

function offerProject(id) {
  alert("Coming soon: " + id);
}