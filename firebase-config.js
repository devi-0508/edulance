// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyBVNKqUqY9Sk6dUUVGkDGC5ahy90jDVeHk",
  authDomain: "edulance-3d4c4.firebaseapp.com",
  projectId: "edulance-3d4c4",
  storageBucket: "edulance-3d4c4.firebasestorage.app",
  messagingSenderId: "457397629272",
  appId: "1:457397629272:web:5c1dbe9353ac8d2c54352d"
};

// ✅ THIS is the important line
firebase.initializeApp(firebaseConfig);

console.log("✅ Firebase initialized successfully");