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

      // ✅ Save user in Firestore
      await firebase.firestore().collection("users").doc(user.uid).set({
        name,
        email,
        role: role,
        resumeLink,
        verificationFolderLink,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log("User created:", user.uid);

      alert("Registration successful! Please login.");
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

      const doc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

      // ✅ If user doc missing → create it
      if (!doc.exists) {
        console.warn("User doc missing. Creating...");

        await firebase.firestore().collection("users").doc(user.uid).set({
          name: user.displayName || "User",
          email: user.email,
          role: "freelancer",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Account initialized. Please login again.");
        await firebase.auth().signOut();
        return;
      }

      const role = doc.data().role;
      redirectUser(role);

    } catch (err) {
      console.error(err);
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

  // ✅ Auto-create if missing
  if (!doc.exists) {
    console.warn("User doc missing (auth check). Creating...");

    await firebase.firestore().collection("users").doc(user.uid).set({
      name: user.displayName || "User",
      email: user.email,
      role: "freelancer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return;
  }

  const data = doc.data();

  // ✅ No admin verification anymore
  redirectUser(data.role);

  // Profile links
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
});

/* ===============================
   LOGOUT
================================= */
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html";
  });
}