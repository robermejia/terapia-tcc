// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBFPJ1rD_rqHLZep4jo2wDKKpvlvHoqV-w",
    authDomain: "terapia-tcc-6a40c.firebaseapp.com",
    projectId: "terapia-tcc-6a40c",
    storageBucket: "terapia-tcc-6a40c.firebasestorage.app",
    messagingSenderId: "214591875414",
    appId: "1:214591875414:web:b09771d5124226452acef7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
