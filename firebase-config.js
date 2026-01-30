import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "ใส่ของคุณตรงนี้",
  authDomain: "ใส่ของคุณตรงนี้",
  projectId: "ใส่ของคุณตรงนี้",
  storageBucket: "ใส่ของคุณตรงนี้",
  messagingSenderId: "ใส่ของคุณตรงนี้",
  appId: "ใส่ของคุณตรงนี้"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);