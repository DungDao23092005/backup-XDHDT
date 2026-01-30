import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase";
import notificationApi from "../api/notificationApi";
import { toast } from "react-toastify";

const useFcm = () => {
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          console.log("Notification permission granted.");

          // 1. Đăng ký Service Worker thủ công
          let registration = null;
          try {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log("✅ Service Worker registered.");
          } catch (err) {
            console.error("❌ Service Worker registration failed:", err);
            return;
          }

          // 2. Đợi SW kích hoạt
          await navigator.serviceWorker.ready;

          // 3. Lấy Token với Key MỚI
          const token = await getToken(messaging, {
            // Key mới của bạn đây:
            vapidKey: "BB-r-75INh6rg9qcOr0vuK2xE5dCefQtuvbyn-ncwJvRL7G8Wf57LG9x2-9OZJD3hfEGv5BtTfN1W1rxzDa8Rg8",
            serviceWorkerRegistration: registration 
          });

          if (token) {
            console.log("🚀 FCM Token:", token);
            setFcmToken(token);
            try {
               await notificationApi.registerDevice(token);
               console.log("✅ Device registered with backend.");
            } catch (apiError) {
               console.warn("Backend register skipped.");
            }
          }
        } else {
          console.log("Notification permission denied.");
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground Message:", payload);
      toast.info(
        <div>
          <h4 style={{fontWeight: 'bold', marginBottom: '5px'}}>{payload.notification.title}</h4>
          <p style={{margin: 0}}>{payload.notification.body}</p>
        </div>,
        { autoClose: 5000, position: "top-right" }
      );
    });

    return () => unsubscribe();
  }, []);

  return fcmToken;
};

export default useFcm;