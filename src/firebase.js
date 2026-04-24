import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCmiSiesNzNNWt9SsJn5KLbkFo1BzgK4dk",
  authDomain: "barbr-70995.firebaseapp.com",
  projectId: "barbr-70995",
  storageBucket: "barbr-70995.firebasestorage.app",
  messagingSenderId: "342785413936",
  appId: "1:342785413936:web:e8e7558ef7c04bf0ee6ef5"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)