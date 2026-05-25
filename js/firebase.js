// js/firebase.js
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider,
         signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC75dTeY6FFSuWog76u3IasH6N7yt-_bN4",
  authDomain: "geogame-b7f3e.firebaseapp.com",
  projectId: "geogame-b7f3e",
  storageBucket: "geogame-b7f3e.firebasestorage.app",
  messagingSenderId: "1020738510583",
  appId: "1:1020738510583:web:8e68e08087bc5d39063df2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---- Auth ----

// Popup (а не redirect): сайт на vkassu.github.io, а authDomain —
// geogame-b7f3e.firebaseapp.com (разные домены). signInWithRedirect на такой
// связке ломается: браузеры режут стороннее хранилище → getRedirectResult
// возвращает пусто и пользователя выкидывает незалогиненным. Popup открывает
// auth-handler в отдельном окне и возвращает результат через postMessage —
// работает на десктопе и в обычном Safari на iPad (попап из жеста-клика).
export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

// Подписаться на изменения состояния авторизации.
// callback(user) — user = null если не авторизован.
export function onUserChanged(callback) {
  onAuthStateChanged(auth, callback);
}

// ---- Firestore ----

// Загрузить данные пользователя.
// localFallback — текущие данные из localStorage (для миграции нового пользователя).
// Возвращает объект { xpTotal, bestXpPerGame, gamesPlayed, lang }.
export async function loadUserData(uid, localFallback) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  // Первый вход — создать документ из локальных данных (миграция)
  const data = {
    xpTotal: localFallback.xpTotal || 0,
    bestXpPerGame: localFallback.bestXpPerGame || 0,
    gamesPlayed: localFallback.gamesPlayed || 0,
    lang: localFallback.lang || "ru",
  };
  await setDoc(ref, data);
  return data;
}

// Сохранить данные пользователя в Firestore.
export async function saveUserData(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, data, { merge: true });
}
