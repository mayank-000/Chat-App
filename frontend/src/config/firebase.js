// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5edV3oEYkU-04XujKOtED8AC7T0KmGXM",
  authDomain: "chatapp-557f5.firebaseapp.com",
  projectId: "chatapp-557f5",
  storageBucket: "chatapp-557f5.firebasestorage.app",
  messagingSenderId: "926513330612",
  appId: "1:926513330612:web:09e0a73f21ec6699299ae1",
  measurementId: "G-VDR8DB390Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);

export default { app, messaging, analytics };

// BM0KX7JZ1zpCzBiJRbe5sSCLEMJivBxT-1DiX3XxPtu96kR7SToVzMSYftdKMwVfTeuxerdAOHLuea9-Ey4ajc4