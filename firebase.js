// firebase.js - Firebase Configuration และ Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  deleteDoc,
  serverTimestamp, 
  setDoc, 
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBULvpjQrKUm7-oNEJpsTef_ZxKeVOHzzA",
  authDomain: "roti-25574.firebaseapp.com",
  projectId: "roti-25574",
  storageBucket: "roti-25574.firebasestorage.app",
  messagingSenderId: "535908448877",
  appId: "1:535908448877:web:a926ed21140cc91fc1dd64"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  // ✅ แก้ตรงนี้ เอาคอมเมนต์ออก
export const adminEmail = "dlove8206@gmail.com";

// ============================================
// Authentication Functions
// ============================================

export async function registerUser(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return await signOut(auth);
}

// ============================================
// ImgBB Upload Function (แทน Storage)
// ============================================

const IMGBB_API_KEY = "d5a9ff0a85c4a342ba99aa1d114b2645";

export async function uploadToImgBB(file) {
  if (!file) return "";
  
  const formData = new FormData();
  formData.append("image", file);
  
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "อัพโหลดไม่สำเร็จ");
    }
  } catch (error) {
    throw new Error("อัพโหลดรูปไม่สำเร็จ: " + error.message);
  }
}

// ============================================
// Menu Functions
// ============================================

export async function getMenuItems() {
  const q = query(collection(db, "menus"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addMenuItem(name, price, imageUrl = "") {
  return await addDoc(collection(db, "menus"), {
    name,
    price: Number(price),
    imageUrl,
    createdAt: serverTimestamp()
  });
}

export async function addMenuItemWithImage(name, price, file) {
  let imageUrl = "";
  
  if (file) {
    imageUrl = await uploadToImgBB(file);
  }
  
  return await addMenuItem(name, price, imageUrl);
}

export async function deleteMenuItem(id) {
  await deleteDoc(doc(db, "menus", id));
}

// ============================================
// Order Functions (เก่า - ใช้สำหรับอ้างอิง)
// ============================================

export async function placeOrder(user, orderData) {
  const orderDoc = {
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName || user.email,
    orderNumber: orderNumber,
    dateStr: dateStr,
    items: orderData.items,
    total: orderData.total,
    status: "รอตรวจสอบการชำระเงิน",
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, "orders"), orderDoc);
  return docRef.id;
}

export async function getOrdersForUser(userId) {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getAllOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getOrderById(orderId) {
  const docRef = doc(db, "orders", orderId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
}

export async function deleteOrderById(orderId) {
  await deleteDoc(doc(db, "orders", orderId));
}

// ============================================
// NEW: Generate Order Number (ORD-DDMMYY-001)
// ============================================

export async function generateOrderNumber() {
  const today = new Date();
  const dateStr = String(today.getDate()).padStart(2, '0') + 
                  String(today.getMonth() + 1).padStart(2, '0') + 
                  String(today.getFullYear()).slice(-2);
  
  const counterRef = doc(db, "counters", `order_${dateStr}`);
  
  try {
    const orderNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let newCount;
      if (!counterDoc.exists()) {
        newCount = 1;
        transaction.set(counterRef, { 
          count: 1, 
          date: dateStr,
          lastUpdated: serverTimestamp() 
        });
      } else {
        newCount = counterDoc.data().count + 1;
        transaction.update(counterRef, { 
          count: newCount,
          lastUpdated: serverTimestamp()
        });
      }
      
      return `ORD-${dateStr}-${String(newCount).padStart(3, '0')}`;
    });
    
    return { orderNumber, dateStr };
    
  } catch (err) {
    console.error("Transaction failed:", err);
    const fallbackNum = Date.now().toString().slice(-3);
    return { 
      orderNumber: `ORD-${dateStr}-${fallbackNum}`, 
      dateStr 
    };
  }
}

// ============================================
// NEW: Create Order with Number
// ============================================

export async function createOrder(userId, orderData) {
  try {
    const { orderNumber, dateStr } = await generateOrderNumber();
    
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      userId,
      orderNumber: orderNumber,
      dateStr: dateStr,
      createdAt: serverTimestamp(),
      status: "รอตรวจสอบการชำระเงิน"
    });
    
    return { 
      id: docRef.id, 
      orderNumber: orderNumber 
    };
    
  } catch (err) {
    console.error("Create order error:", err);
    throw new Error("ไม่สามารถสร้างคำสั่งซื้อได้: " + err.message);
  }
}