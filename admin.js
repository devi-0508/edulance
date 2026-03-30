// Check if logged-in user is admin
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const doc = await firebase.firestore().collection("users").doc(user.uid).get();
  const data = doc.data();

  if (!data.isAdmin) {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  // Only admins reach here
  loadPendingUsers();
});

// Load pending users
function loadPendingUsers() {
  const container = document.getElementById("pendingUsersContainer");
  if (!container) return;

  firebase.firestore().collection("users")
    .where("status", "==", "pending")
    .get()
    .then(snapshot => {
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const user = doc.data();
        container.innerHTML += `
          <div class="user-card">
            <h3>${user.name || "Unnamed User"}</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Resume:</strong> 
              ${user.resume ? `<a href="${user.resume}" target="_blank">View Resume</a>` : "No resume link"}
            </p>
            <button onclick="verifyUser('${doc.id}', true)">Approve</button>
            <button onclick="verifyUser('${doc.id}', false)">Reject</button>
          </div>
        `;
      });
    });
}

// Approve or reject user
function verifyUser(userId, approve) {
  firebase.firestore().collection("users").doc(userId).update({
    status: approve ? "verified" : "rejected"
  }).then(() => {
    alert(`User ${approve ? "approved" : "rejected"} successfully`);
    loadPendingUsers(); // refresh list
  });
}
