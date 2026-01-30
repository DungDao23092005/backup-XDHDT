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

          // 1. Đăng ký Service Worker
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log("✅ Service Worker registered with scope:", registration.scope);

          // 2. Đợi SW active hẳn rồi mới gọi getToken
          if (registration.installing) {
             console.log("Service Worker installing... waiting.");
             await new Promise(resolve => {
                const sw = registration.installing;
                sw.onstatechange = () => {
                   if (sw.state === 'activated') resolve();
                };
             });
          }
          await navigator.serviceWorker.ready;

          // 3. Lấy Token với VAPID Key MỚI của bạn
          const token = await getToken(messaging, {
            // 👇 Dán key bạn vừa gửi vào đây:
            vapidKey: "BIty8njvJWFg-vBic65UAcLJ0loo_32nCx9LWJoKQgxt-ccv5qdxcDY2_no6Tekl8rLigX94gUGcFFvUZBony_k", 
            serviceWorkerRegistration: registration 
          });

          if (token) {
            console.log("🚀 FCM Token:", token);
            setFcmToken(token);
            try {
               await notificationApi.registerDevice(token);
               console.log("✅ Device registered with backend.");
            } catch (apiError) {
               console.warn("Backend register skipped:", apiError);
            }
          }
        } else {
          console.log("Notification permission denied.");
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
        // Nếu lỗi liên quan SW, thử xóa đi để lần sau chạy lại
        if (error.message && error.message.includes("Service Worker")) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for(let reg of regs) reg.unregister();
            });
        }
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