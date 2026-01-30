importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Dán lại firebaseConfig của bạn vào đây (Service Worker không đọc được file config.js kia)
const firebaseConfig = {
  apiKey: "AIzaSyBqS8Iknbv1dMQksp3BMPt7si-FpQZVt3k",
  authDomain: "xdhdt-bc4cf.firebaseapp.com",
  projectId: "xdhdt-bc4cf",
  storageBucket: "xdhdt-bc4cf.firebasestorage.app",
  messagingSenderId: "678816837306",
  appId: "1:678816837306:web:0e31e3b3995afe7fe5dc83",
  measurementId: "G-EBB64TNBRC"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Xử lý khi nhận thông báo ở chế độ Background (Tắt tab)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Đường dẫn icon web của bạn
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});