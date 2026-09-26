// Service worker pour Firebase Cloud Messaging (notifications push en arrière-plan).
// Config doit correspondre à celle de l'app (voir src/lib/firebase.ts / .env.local).

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCX9kdGRYSbycXNjle2UGFgo3gzZP7PGnI",
  authDomain: "fidelo-c1289.firebaseapp.com",
  projectId: "fidelo-c1289",
  storageBucket: "fidelo-c1289.firebasestorage.app",
  messagingSenderId: "267496096306",
  appId: "1:267496096306:web:cf3c65d3d58f0607cdb22b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const title = payload.notification?.title || payload.data?.title || "Nouvelle annonce";
  const options = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: "/icons/icon-192x192.png",
    tag: payload.data?.annonceId || "annonce",
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});
