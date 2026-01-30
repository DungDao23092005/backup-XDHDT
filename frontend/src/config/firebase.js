import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

// Thay thế bằng thông tin từ Firebase Console của bạn
const firebaseConfig = {
  apiKey: "AIzaSyBqS8Iknbv1dMQksp3BMPt7si-FpQZVt3k",
  authDomain: "xdhdt-bc4cf.firebaseapp.com",
  projectId: "xdhdt-bc4cf",
  storageBucket: "xdhdt-bc4cf.firebasestorage.app",
  messagingSenderId: "678816837306",
  appId: "1:678816837306:web:0e31e3b3995afe7fe5dc83",
  measurementId: "G-EBB64TNBRC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const messaging = getMessaging(app);