// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCI1MkgopwzE62NW3kQclHN1a0ZImR-VfU",
  authDomain: "myproject-16779.firebaseapp.com",
  projectId: "myproject-16779",
  storageBucket: "myproject-16779.appspot.com",
  messagingSenderId: "815998165625",
  appId: "1:815998165625:web:70a9435767e7cc31712aa8"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getFirestore(app);
const storage = getStorage(app);

export { app, database, storage}