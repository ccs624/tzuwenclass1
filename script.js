// ==========================================
// Firebase 設定
// ==========================================


import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ==========================================
// Firebase Storage
// 用來儲存老師上傳的照片
// ==========================================

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

// Firebase 專案設定

const firebaseConfig = {

  apiKey: "AIzaSyAQa6JsfIUQuYhxAJdqqJPfQ6kjUcXJMhM",

  authDomain:
    "tzuwen1-1.firebaseapp.com",

  databaseURL:
    "https://tzuwen1-1-default-rtdb.firebaseio.com",

  projectId:
    "tzuwen1-1",

  storageBucket:
    "tzuwen1-1.firebasestorage.app",

  messagingSenderId:
    "419692782069",

  appId:
    "1:419692782069:web:a5aa3bb9c2696b211840bc",

  measurementId:
    "G-W1J3RTPHV8"
};


// 初始化 Firebase

const app = initializeApp(firebaseConfig);


// Firebase Authentication

const auth = getAuth(app);


// Cloud Firestore

const db = getFirestore(app);

// 初始化 Firebase Storage
const storage = getStorage(app);

console.log("Firebase 已成功連線！");


// ==========================================================
// 老師登入系統
// ==========================================================

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");

const loginForm = document.getElementById("loginForm");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const loginMessage = document.getElementById("loginMessage");

const teacherEmail = document.getElementById("teacherEmail");

const logoutButton = document.getElementById("logoutButton");


// ----------------------------------------------------------
// 監控登入狀態
// ----------------------------------------------------------

onAuthStateChanged(auth, (user) => {

  if (user) {

    // 已登入

    console.log("老師已登入：", user.email);

    loginView.classList.add("hidden");

    adminView.classList.remove("hidden");

    teacherEmail.textContent = user.email;

  } else {

    // 尚未登入

    console.log("目前沒有老師登入");

    loginView.classList.remove("hidden");

    adminView.classList.add("hidden");

    teacherEmail.textContent = "";

  }

});


// ----------------------------------------------------------
// 老師登入
// ----------------------------------------------------------

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {

    loginMessage.textContent =
      "請輸入電子郵件與密碼。";

    return;
  }


  loginMessage.textContent =
    "登入中...";


  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    loginMessage.textContent =
      "";

    loginPassword.value = "";

  } catch (error) {

    console.error("登入失敗：", error);

    if (
      error.code === "auth/invalid-credential"
    ) {

      loginMessage.textContent =
        "電子郵件或密碼錯誤。";

    } else if (
      error.code === "auth/too-many-requests"
    ) {

      loginMessage.textContent =
        "登入失敗次數過多，請稍後再試。";

    } else {

      loginMessage.textContent =
        "登入失敗，請稍後再試。";

    }

  }

});


// ----------------------------------------------------------
// 老師登出
// ----------------------------------------------------------

logoutButton.addEventListener("click", async () => {

  try {

    await signOut(auth);

    console.log("老師已登出");

  } catch (error) {

    console.error(
      "登出失敗：",
      error
    );

  }

});




// ==========================================================
// 慈文國小班級網站 - 第一階段 JavaScript
// 目前使用 localStorage 做「本機示範」。
// 下一階段接上 Firebase 後，照片與資料才能真正同步給所有家長。
// ==========================================================

const STORAGE_KEY = "ciwen_class_site_v1";

// ---------- 1. 自動計算學年度與年級 ----------
function getSchoolYear() {
  const now = new Date();
  // 臺灣學年度通常從 8 月開始
  return now.getMonth() + 1 >= 8 ? now.getFullYear() - 1911 : now.getFullYear() - 1912;
}

function chineseGrade(n) {
  const map = ["零", "一", "二", "三", "四", "五", "六"];
  return map[n] || `${n}`;
}

function getClassName() {
  const schoolYear = getSchoolYear();
  const grade = schoolYear - 115 + 1;
  return `${chineseGrade(grade)}年一班`;
}

function updateClassTitle() {
  const className = getClassName();
  const fullTitle = `慈文國小${className}班級網頁`;
  const shortTitle = `慈文國小${className}`;

  document.title = fullTitle;
  document.getElementById("classTitle").textContent = fullTitle;
  document.getElementById("heroTitle").textContent = shortTitle;
  document.getElementById("footerTitle").textContent = `${shortTitle} · 班級網頁`;
}

// ---------- 2. localStorage 資料 ----------
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      homePhotos: [],
      schedule: "",
      events: []
    };
  } catch {
    return { homePhotos: [], schedule: "", events: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- 3. 圖片壓縮：最大寬度 1600px、WebP ----------
function compressImage(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const webp = canvas.toDataURL("image/webp", quality);
        resolve({
          dataUrl: webp,
          originalSize: file.size,
          compressedSize: Math.round((webp.length * 3) / 4)
        });
      };

      img.onerror = () => reject(new Error("圖片讀取失敗"));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 將壓縮後的 WebP 照片上傳到 Firebase Storage
// ==========================================

async function uploadPhotoToStorage(
  dataUrl,
  fileName,
  eventId
) {

  // ======================================================
  // 建立照片在 Firebase Storage 裡面的路徑
  //
  // 每個活動都有自己的資料夾
  //
  // 例如：
  //
  // events/
  //   abc123/
  //      1.webp
  //      2.webp
  //      3.webp
  //
  // ======================================================

  const storagePath =
    "events/" +
    eventId +
    "/" +
    fileName;


  // 建立 Storage 參照
  const storageRef = ref(
    storage,
    storagePath
  );


  // 把 Data URL 上傳到 Storage
  await uploadString(
    storageRef,
    dataUrl,
    "data_url",
    {
      contentType: "image/webp"
    }
  );


  // 取得照片網址
  const downloadURL =
    await getDownloadURL(storageRef);


  console.log(
    "照片上傳成功：",
    downloadURL
  );


  return downloadURL;
}

// ---------- 4. 首頁輪播 ----------
let slideIndex = 0;
let slideTimer;

function renderSlideshow() {
  const data = loadData();
  const box = document.getElementById("homeSlideshow");
  const indicator = document.getElementById("slideIndicator");

  if (!data.homePhotos.length) {
    box.innerHTML = '<div class="slide-placeholder"><span>首頁照片輪播區</span></div>';
    indicator.textContent = "1 / 1";
    clearInterval(slideTimer);
    return;
  }

  slideIndex = (slideIndex + data.homePhotos.length) % data.homePhotos.length;
  box.innerHTML = `<img class="slide" src="${data.homePhotos[slideIndex]}" alt="班級活動照片">`;
  indicator.textContent = `${slideIndex + 1} / ${data.homePhotos.length}`;

  clearInterval(slideTimer);
  if (data.homePhotos.length > 1) {
    slideTimer = setInterval(() => {
      slideIndex = (slideIndex + 1) % data.homePhotos.length;
      Slideshow();
    }, 4000);
  }
}




document.getElementById("prevSlide").addEventListener("click", () => {
  const data = loadData();
  if (!data.homePhotos.length) return;
  slideIndex = (slideIndex - 1 + data.homePhotos.length) % data.homePhotos.length;
  Slideshow();
});

document.getElementById("nextSlide").addEventListener("click", () => {
  const data = loadData();
  if (!data.homePhotos.length) return;
  slideIndex = (slideIndex + 1) % data.homePhotos.length;
  Slideshow();
});

// ---------- 5. 課表 ----------
function renderSchedule() {
  const data = loadData();
  const box = document.getElementById("scheduleDisplay");

  if (!data.schedule) {
    box.className = "schedule-card empty-state";
    box.innerHTML = "<div></div><p>目前尚未上傳課表</p>";
    return;
  }

  box.className = "schedule-card";
  box.innerHTML = `<img class="schedule-image" src="${data.schedule}" alt="班級課表">`;
}

// ---------- 6. 活動照片 ----------
function formatDate(date) {
  if (!date) return "";
  return date.replaceAll("-", "/");
}

// ==========================================
// Firestore：讀取所有活動
// ==========================================

async function loadEventsFromFirestore() {

  try {

   
   // 取得 events 集合
const eventsRef = collection(db, "events");

    // 依照建立時間由新到舊排列
 const q = query(
  eventsRef,
  orderBy("createdAt", "desc")
);

    // 取得 Firebase 裡的活動
    const snapshot = await getDocs(q);

    const events = [];

    snapshot.forEach(documentSnapshot => {

      const data = documentSnapshot.data();

      events.push({
        id: documentSnapshot.id,
        name: data.name || "",
        date: data.date || "",
        photos: data.photos || []
      });

    });

    console.log("Firestore 活動資料：", events);

    return events;

  } catch (error) {

    console.error("讀取 Firestore 活動失敗：", error);

    return [];

  }

}


// ==========================================================
// 刪除整個活動
//
// 會同時刪除：
//
// 1. Firebase Storage 裡這個活動的照片
// 2. Firestore 裡的活動資料
//
// ==========================================================

async function deleteEventFromFirebase(eventId, eventData) {

  try {

    console.log(
      "開始刪除活動：",
      eventId
    );


    // ======================================================
    // ① 刪除 Firebase Storage 裡的照片
    // ======================================================

    const photos =
      eventData.photos || [];


    for (
      let i = 0;
      i < photos.length;
      i++
    ) {

      const photo =
        photos[i];


      // ----------------------------------------------------
      // 取得照片網址中的 Storage 路徑
      //
      // 因為 Firestore 現在有：
      //
      // events / 活動ID / 001.webp
      //
      // 所以我們直接使用活動 ID + 照片編號。
      // ----------------------------------------------------

      const fileName =
        `${String(
          photo.order
        ).padStart(3, "0")}.webp`;


      const photoRef =
        ref(
          storage,
          `events/${eventId}/${fileName}`
        );


      try {

        await deleteObject(
          photoRef
        );


        console.log(
          "照片刪除成功：",
          fileName
        );


      } catch (photoError) {

        // 如果 Storage 裡找不到照片，
        // 不要讓整個活動刪除失敗。

        console.warn(
          "照片刪除失敗或照片不存在：",
          fileName,
          photoError
        );

      }

    }


    // ======================================================
    // ② 刪除 Firestore 活動資料
    // ======================================================

    await deleteDoc(
      doc(
        db,
        "events",
        eventId
      )
    );


    console.log(
      "Firestore 活動刪除成功：",
      eventId
    );


    return true;


  } catch (error) {

    console.error(
      "刪除活動失敗：",
      error
    );


    return false;

  }

}


// ==========================================================
// 顯示班級活動
//
// 資料來源：Firebase Firestore
//
// 現在不再使用 localStorage 的活動照片。
// 活動資料會從 events collection 讀取。
// ==========================================================

async function renderEvents() {

  const list =
    document.getElementById("galleryList");


  // 如果找不到活動區域
  if (!list) {
    console.error("找不到 galleryList");
    return;
  }


  // 顯示讀取中的提示
  list.innerHTML = `
    <div class="empty-state">
      <div>讀取中</div>
      <p>正在載入班級活動照片……</p>
    </div>
  `;


  try {

    // ======================================================
    // 從 Firestore 取得活動
    // ======================================================

    const events =
      await loadEventsFromFirestore();


    // ======================================================
    // 沒有活動
    // ======================================================

    if (!events.length) {

      list.innerHTML = `
        <div class="empty-state">
          <div></div>
          <p>目前還沒有活動照片。</p>
        </div>
      `;

      return;
    }


    // ======================================================
    // 產生活動列表
    // ======================================================

    list.innerHTML = events.map((event, eventIndex) => {

      // ----------------------------------------------------
      // 每個活動只在首頁顯示最多 3 張照片
      // ----------------------------------------------------

      const previewPhotos =
        event.photos.slice(0, 4);


      // ----------------------------------------------------
      // 產生照片 HTML
      // ----------------------------------------------------

      const photosHTML =
        previewPhotos.map((photo, photoIndex) => {

          // 新版 Firebase 資料使用 photo.url
          const photoURL =
            photo.url || photo.dataUrl || "";


          return `
            <div class="photo-item">
              <img
                src="${photoURL}"
                alt="${escapeHtml(event.name)} 第${photoIndex + 1}張照片"
                loading="lazy"
              >
            </div>
          `;

        }).join("");


      // ----------------------------------------------------
      // 活動卡片
      // ----------------------------------------------------

      return `
        <article class="event-card">

          <div class="event-header">

            <div>

              <h3>
                ${escapeHtml(event.name)}
              </h3>

              ${
                event.date
                  ? `<div class="event-date">
                      ${formatDate(event.date)}
                    </div>`
                  : ""
              }

            </div>

          </div>


          <div class="photo-grid">
            ${photosHTML}
          </div>


          ${
            event.photos.length > 3
              ? `
                <div class="event-more">
                  共 ${event.photos.length} 張照片
                </div>
              `
              : ""
          }



<button
  class="view-event-btn primary-btn"
  type="button"
  data-event-id="${event.id}"
>
  查看全部照片
</button>
        </article>
      `;

    }).join("");


    console.log(
      `活動畫面更新完成，共 ${events.length} 個活動`
    );


  } catch (error) {

    console.error(
      "顯示活動失敗：",
      error
    );


    list.innerHTML = `
      <div class="empty-state">
        <div></div>
        <p>活動照片讀取失敗，請稍後再試。</p>
      </div>
    `;

  }

}

// ==========================================================
// 顯示某一個活動的完整照片
// ==========================================================

async function showEventDetail(eventId) {

  console.log(
    "準備顯示活動：",
    eventId
  );


  // 從 Firestore 重新取得最新活動
  const events =
    await loadEventsFromFirestore();


  // 找到被點擊的活動
  const event =
    events.find(item => item.id === eventId);

 


  // ========================================================
  // 找到網站上的主要區塊
  // ========================================================

  const homeSection =
    document.getElementById("home");

  const scheduleSection =
    document.getElementById("schedule");

  const photosSection =
    document.getElementById("photos");

  const eventDetail =
    document.getElementById("eventDetail");


  // ========================================================
  // 隱藏首頁、課表、活動列表
  // ========================================================

  if (homeSection) {
    homeSection.classList.add("hidden");
  }

  if (scheduleSection) {
    scheduleSection.classList.add("hidden");
  }

  if (photosSection) {
    photosSection.classList.add("hidden");
  }


  // 顯示活動詳細頁
  eventDetail.classList.remove("hidden");


  // ========================================================
  // 填入活動資料
  // ========================================================

  document.getElementById(
    "eventDetailTitle"
  ).textContent = event.name;


  document.getElementById(
    "eventDetailDate"
  ).textContent =
    event.date
      ? formatDate(event.date)
      : "";


  // ========================================================
  // 顯示全部照片
  // ========================================================

  const photoBox =
    document.getElementById(
      "eventDetailPhotos"
    );


  photoBox.innerHTML =
    event.photos
      .map((photo, index) => {

        const photoURL =
          photo.url ||
          photo.dataUrl ||
          "";


        return `
          <div class="event-detail-photo">

            <img
              src="${photoURL}"
              alt="${escapeHtml(event.name)} 第${index + 1}張照片"
              loading="lazy"
            >

          </div>
        `;

      })
      .join("");


  // ========================================================
  // 滾動到頁面最上方
  // ========================================================

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

// ==========================================================
// 「查看全部照片」按鈕
// ==========================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".view-event-btn"
      );


    // 如果點到的不是查看全部照片
    if (!button) {
      return;
    }


    const eventId =
      button.dataset.eventId;


    showEventDetail(eventId);

  }
);

// ==========================================================
// 返回班級照片
// ==========================================================

document
  .getElementById("backToGallery")
  .addEventListener(
    "click",
    () => {

      const homeSection =
        document.getElementById("home");

      const scheduleSection =
        document.getElementById("schedule");

      const photosSection =
        document.getElementById("photos");

      const eventDetail =
        document.getElementById("eventDetail");


      // 顯示首頁
      if (homeSection) {
        homeSection.classList.remove("hidden");
      }


      // 顯示課表
      if (scheduleSection) {
        scheduleSection.classList.remove("hidden");
      }


      // 顯示班級照片
      if (photosSection) {
        photosSection.classList.remove("hidden");
      }


      // 隱藏活動詳細頁
      eventDetail.classList.add("hidden");


      // 回到班級照片區域
      if (photosSection) {

        photosSection.scrollIntoView({
          behavior: "smooth"
        });

      }

    }
  );

// ==========================================
// 活動詳細照片頁
// ==========================================

const eventDetail = document.getElementById("eventDetail");
const eventDetailTitle = document.getElementById("eventDetailTitle");
const eventDetailDate = document.getElementById("eventDetailDate");
const eventDetailPhotos = document.getElementById("eventDetailPhotos");


// 開啟活動詳細頁
function openEventDetail(eventId) {

  const data = loadData();

  // 找到被點擊的活動
  const event = data.events.find(
    item => String(item.id) === String(eventId)
  );

 


  // ==========================================
  // 填入活動名稱與日期
  // ==========================================

  eventDetailTitle.textContent = event.name;
  eventDetailDate.textContent = formatDate(event.date);


  // ==========================================
  // 顯示這個活動的所有照片
  // ==========================================

  eventDetailPhotos.innerHTML = event.photos
    .map((photo, index) => `
      <div class="event-detail-photo">

        <img
          src="${photo.dataUrl}"
          alt="${escapeHtml(event.name)} 第${index + 1}張照片"
          loading="lazy"
        >

      </div>
    `)
    .join("");


  // ==========================================
  // 隱藏一般網站內容
  // ==========================================

  hideNormalContent();


  // 顯示活動詳細頁
  eventDetail.classList.remove("hidden");


  // 回到頁面最上方
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ==========================================
// 隱藏一般網站內容
// ==========================================

// ==========================================
// 活動詳細頁：切換顯示模式
// ==========================================

function showNormalContent() {
  // 首頁
  const homeSection = document.querySelector(".hero");

  // 課表
  const scheduleSection = document.getElementById("schedule");

  // 班級活動
  const photosSection = document.getElementById("photos");

  // 顯示一般內容
  if (homeSection) {
    homeSection.classList.remove("hidden");
  }

  if (scheduleSection) {
    scheduleSection.classList.remove("hidden");
  }

  if (photosSection) {
    photosSection.classList.remove("hidden");
  }

  // 隱藏活動詳細頁
  eventDetail.classList.add("hidden");
}


// ==========================================
// 隱藏一般內容，進入活動詳細頁
// ==========================================

function hideNormalContent() {
  // 首頁照片輪播
  const homeSection = document.querySelector(".hero");

  // 課表
  const scheduleSection = document.getElementById("schedule");

  // 班級活動
  const photosSection = document.getElementById("photos");

  // 隱藏一般內容
  if (homeSection) {
    homeSection.classList.add("hidden");
  }

  if (scheduleSection) {
    scheduleSection.classList.add("hidden");
  }

  if (photosSection) {
    photosSection.classList.add("hidden");
  }
}


// ==========================================
// 返回班級活動
// ==========================================

const backToGallery =
  document.getElementById("backToGallery");

if (backToGallery) {

  backToGallery.addEventListener(
    "click",
    () => {

      const homeSection =
        document.getElementById("home");

      const scheduleSection =
        document.getElementById("schedule");

      const photosSection =
        document.getElementById("photos");

      const eventDetail =
        document.getElementById("eventDetail");


      // 顯示首頁
      if (homeSection) {
        homeSection.classList.remove("hidden");
      }


      // 顯示課表
      if (scheduleSection) {
        scheduleSection.classList.remove("hidden");
      }


      // 顯示班級照片
      if (photosSection) {
        photosSection.classList.remove("hidden");
      }


      // 隱藏活動詳細頁
      if (eventDetail) {
        eventDetail.classList.add("hidden");
      }


      // 回到班級照片
      if (photosSection) {

        photosSection.scrollIntoView({
          behavior: "smooth"
        });

      }

    }
  );

}


// ==========================================
// 上方導覽列
// 首頁 / 課表 / 班級照片
// ==========================================

document.addEventListener("click", event => {

  // 找到導覽列中的連結
  const link = event.target.closest("a");

  if (!link) return;

  const href = link.getAttribute("href");

  // 如果不是我們要處理的三個區域，就不處理
  if (
    href !== "#home" &&
    href !== "#schedule" &&
    href !== "#photos"
  ) {
    return;
  }

  // 如果目前正在活動詳細頁
  if (!eventDetail.classList.contains("hidden")) {

    // 阻止原本的跳轉
    event.preventDefault();

    // 先恢復一般網站內容
    showNormalContent();

    // 找到要前往的區域
    let target;

    if (href === "#home") {
      target = document.querySelector(".hero");
    }

    if (href === "#schedule") {
      target = document.getElementById("schedule");
    }

    if (href === "#photos") {
      target = document.getElementById("photos");
    }

    // 平滑移動到指定區域
    if (target) {
      target.scrollIntoView({
        behavior: "smooth"
      });
    }
  }

});


// ==========================================
// 返回班級活動
// ==========================================

document.getElementById("backToGallery").addEventListener("click", () => {

  // 隱藏活動詳細頁
  eventDetail.classList.add("hidden");


  // 顯示首頁
  const homeSection = document.querySelector(".hero");

  // 顯示課表
  const scheduleSection = document.getElementById("schedule");

  // 顯示班級活動
  const photosSection = document.getElementById("photos");


  if (homeSection) {
    homeSection.classList.remove("hidden");
  }

  if (scheduleSection) {
    scheduleSection.classList.remove("hidden");
  }

  if (photosSection) {
    photosSection.classList.remove("hidden");
  }


  // 回到班級活動的位置
  document.getElementById("photos").scrollIntoView({
    behavior: "smooth"
  });

});


// ==========================================
// 查看活動全部照片
// ==========================================

document.addEventListener("click", event => {

  const button = event.target.closest(".view-event-btn");

  if (!button) return;

  const eventId = button.dataset.eventId;

  openEventDetail(eventId);

});

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function safeFileName(text) {
  return String(text || "class-photo").replace(/[\\/:*?"<>|]/g, "_");
}

// ---------- 7. 老師管理視窗 ----------
const modal = document.getElementById("adminModal");
document.getElementById("teacherModeBtn").addEventListener("click", () => modal.classList.remove("hidden"));
document.getElementById("closeAdmin").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// ---------- 8. 首頁照片 ----------
document.getElementById("saveHomePhotos").addEventListener("click", async () => {
  const input = document.getElementById("homePhotosInput");
  if (!input.files.length) return alert("請先選擇照片。");

  const data = loadData();
  const results = [];

  for (const file of input.files) {
    try {
      const result = await compressImage(file);
      results.push(result.dataUrl);
    } catch {
      alert(`「${file.name}」處理失敗。`);
    }
  }

  data.homePhotos.push(...results);
  saveData(data);
  input.value = "";
  renderSlideshow();
  alert(`已加入 ${results.length} 張首頁照片。`);
});

// ---------- 9. 課表 ----------
document.getElementById("saveSchedule").addEventListener("click", async () => {
  const input = document.getElementById("scheduleInput");
  if (!input.files[0]) return alert("請先選擇課表照片。");

  try {
    const result = await compressImage(input.files[0], 2200, 0.9);
    const data = loadData();
    data.schedule = result.dataUrl;
    saveData(data);
    renderSchedule();
    input.value = "";
    alert("課表已更新。");
  } catch {
    alert("課表處理失敗。");
  }
});

// ==========================================================
// 10. 活動照片預覽
//
// pendingPhotos：
// 代表「目前還沒有發布」的照片。
//
// 這些照片只存在瀏覽器記憶體裡。
// 老師按下「確認發布活動」以前，
// 不會正式上傳 Firebase。
// ==========================================================

let pendingPhotos = [];


// ==========================================================
// 選擇照片
// ==========================================================

document
  .getElementById("eventPhotosInput")
  .addEventListener("change", async e => {

    const files = Array.from(e.target.files);


    // 沒有選照片
    if (!files.length) {
      return;
    }


    // 新選擇照片加入目前預覽
    for (const file of files) {

      try {

        const result =
          await compressImage(file);


        pendingPhotos.push({

          // 壓縮後的照片
          dataUrl: result.dataUrl,

          // 原始檔案大小
          originalSize: result.originalSize,

          // 壓縮後大小
          compressedSize: result.compressedSize,

          // 原本檔案名稱
          fileName: file.name

        });


      } catch (error) {

        console.error(
          "照片處理失敗：",
          error
        );

        alert(
          `「${file.name}」處理失敗。`
        );

      }

    }


    // 顯示預覽
    renderPreview();


    // 清空 input
    //
    // 這樣老師之後重新選同一批照片，
    // change 事件也能再次觸發。
    e.target.value = "";

  });


// ==========================================================
// 顯示照片預覽
// ==========================================================

function renderPreview() {

  const box =
    document.getElementById("photoPreview");


  // 沒有照片
  if (!pendingPhotos.length) {

    box.innerHTML = `
      <div class="preview-hint">
        選擇照片後會在這裡顯示預覽。
      </div>
    `;

    return;
  }


  // ========================================================
  // 產生照片
  // ========================================================

  box.innerHTML =
    pendingPhotos
      .map((photo, index) => {

        return `

          <div
            class="preview-item"
            draggable="true"
            data-index="${index}"
          >

            <!-- 照片編號 -->
            <span class="preview-number">
              ${index + 1}
            </span>


            <!-- 刪除按鈕 -->
          <button
  type="button"
  class="preview-delete"
  data-delete-index="${index}"
>
  刪除
</button>

            <!-- 照片 -->
            <img
              src="${photo.dataUrl}"
              alt="照片 ${index + 1}"
            >

          </div>

        `;

      })
      .join("");


  // 啟用拖曳排序
  enablePhotoDragAndDrop();

}


// ==========================================================
// 刪除照片
// ==========================================================

document
  .getElementById("photoPreview")
  .addEventListener(
    "click",
    event => {

      const deleteButton =
        event.target.closest(
          ".preview-delete"
        );


      // 點的不是刪除按鈕
      if (!deleteButton) {
        return;
      }


      const index =
        Number(
          deleteButton.dataset.deleteIndex
        );


      // 從預覽陣列刪除
      pendingPhotos.splice(
        index,
        1
      );


      // 重新顯示預覽
      renderPreview();

    }
  );


// ==========================================================
// 拖曳排序
// ==========================================================

function enablePhotoDragAndDrop() {

  const items =
    document.querySelectorAll(
      ".preview-item"
    );


  let draggedIndex = null;


  items.forEach(item => {


    // ------------------------------------------------------
    // 開始拖曳
    // ------------------------------------------------------

    item.addEventListener(
      "dragstart",
      () => {

        draggedIndex =
          Number(
            item.dataset.index
          );


        item.classList.add(
          "dragging"
        );

      }
    );


    // ------------------------------------------------------
    // 結束拖曳
    // ------------------------------------------------------

    item.addEventListener(
      "dragend",
      () => {

        item.classList.remove(
          "dragging"
        );

        draggedIndex = null;

      }
    );


    // ------------------------------------------------------
    // 拖曳經過另一張照片
    // ------------------------------------------------------

    item.addEventListener(
      "dragover",
      event => {

        event.preventDefault();

      }
    );


    // ------------------------------------------------------
    // 放下照片
    // ------------------------------------------------------

    item.addEventListener(
      "drop",
      event => {

        event.preventDefault();


        const targetIndex =
          Number(
            item.dataset.index
          );


        // 沒有拖曳來源
        if (draggedIndex === null) {
          return;
        }


        // 自己拖到自己
        if (
          draggedIndex === targetIndex
        ) {
          return;
        }


        // 取出被拖曳的照片
        const movedPhoto =
          pendingPhotos.splice(
            draggedIndex,
            1
          )[0];


        // 插入新的位置
        pendingPhotos.splice(
          targetIndex,
          0,
          movedPhoto
        );


        // 重新繪製
        renderPreview();

      }
    );

  });

}


// ==========================================================
// 發布活動
//
// 流程：
//
// 1. 老師填寫活動名稱、日期
// 2. 確認預覽照片
// 3. 先建立一個活動 ID
// 4. 照片上傳到 Firebase Storage
// 5. 照片網址存入 Firestore
// 6. 活動正式發布
// ==========================================================

document
  .getElementById("saveEvent")
  .addEventListener("click", async () => {


    // ======================================================
    // 取得表單資料
    // ======================================================

    const name =
      document
        .getElementById("eventName")
        .value
        .trim();


    const date =
      document
        .getElementById("eventDate")
        .value;


    // ======================================================
    // 基本檢查
    // ======================================================

    if (!name) {

      alert(
        "請輸入活動名稱。"
      );

      return;
    }


    if (!pendingPhotos.length) {

      alert(
        "請選擇至少一張照片。"
      );

      return;
    }


    // ======================================================
    // 防止老師重複按按鈕
    // ======================================================

    const button =
      document.getElementById(
        "saveEvent"
      );


    button.disabled = true;

    button.textContent =
      "建立活動中，請稍候…";


    try {


      console.log(
        `開始建立活動「${name}」`
      );


      // ====================================================
      // ① 先建立活動 ID
      //
      // 這裡不需要先寫資料到 Firestore。
      // 只是先取得一個唯一 ID。
      // ====================================================

      const eventRef =
        doc(
          collection(
            db,
            "events"
          )
        );


      const eventId =
        eventRef.id;


      console.log(
        "活動 ID：",
        eventId
      );


      // ====================================================
      // ② 開始上傳照片
      // ====================================================

      button.textContent =
        "照片上傳中，請稍候…";


      const uploadedPhotos = [];


      for (
        let i = 0;
        i < pendingPhotos.length;
        i++
      ) {


        const photo =
          pendingPhotos[i];


        console.log(
          `正在上傳第 ${
            i + 1
          } / ${
            pendingPhotos.length
          } 張照片`
        );


        // -----------------------------------------------
        // 照片檔名
        //
        // 直接使用排序後的編號
        //
        // 1.webp
        // 2.webp
        // 3.webp
        // -----------------------------------------------

        const fileName =
          `${String(
            i + 1
          ).padStart(3, "0")}.webp`;


        // -----------------------------------------------
        // 上傳到 Storage
        // -----------------------------------------------

        const downloadURL =
          await uploadPhotoToStorage(
            photo.dataUrl,
            fileName,
            eventId
          );


        // -----------------------------------------------
        // 儲存照片資訊
        // -----------------------------------------------

        uploadedPhotos.push({

          url:
            downloadURL,

          order:
            i + 1

        });

      }


      console.log(
        "所有照片上傳完成！",
        uploadedPhotos
      );


      // ====================================================
      // ③ 建立 Firestore 活動資料
      // ====================================================

      const eventData = {

        // 活動名稱
        name:
          name,


        // 活動日期
        date:
          date,


        // 建立時間
        createdAt:
          serverTimestamp(),


        // Storage 資料夾 ID
        storageFolder:
          eventId,


        // 照片
        photos:
          uploadedPhotos

      };


      // ====================================================
      // ④ 將活動寫入 Firestore
      // ====================================================

      await setDoc(
        eventRef,
        eventData
      );


      console.log(
        "活動已成功儲存到 Firestore：",
        eventId
      );


      // ====================================================
      // ⑤ 清除表單
      // ====================================================

      document
        .getElementById(
          "eventName"
        )
        .value = "";


      document
        .getElementById(
          "eventDate"
        )
        .value = "";


      document
        .getElementById(
          "eventPhotosInput"
        )
        .value = "";


      pendingPhotos = [];


      renderPreview();


      // ====================================================
      // ⑥ 重新讀取活動
      // ====================================================

      if (
        typeof loadEventsFromFirestore ===
        "function"
      ) {

        const events =
          await loadEventsFromFirestore();


        console.log(
          `目前共有 ${events.length} 個活動`
        );

      }


      // ====================================================
      // ⑦ 成功提示
      // ====================================================

      alert(
        `活動「${name}」已成功發布！\n\n` +
        `共上傳 ${uploadedPhotos.length} 張照片。`
      );


    } catch (error) {


      // ====================================================
      // 發生錯誤
      // ====================================================

      console.error(
        "活動發布失敗：",
        error
      );


      alert(
        "活動發布失敗，請查看 Console 的錯誤訊息。"
      );


    } finally {


      // ====================================================
      // 恢復按鈕
      // ====================================================

      button.disabled =
        false;


      button.textContent =
        "確認發布活動";

    }

  });




// ---------- 12. 清除預覽 ----------
document.getElementById("clearPreview").addEventListener("click", () => {
  pendingPhotos = [];
  document.getElementById("eventPhotosInput").value = "";
  renderPreview();
});

// ---------- 13. 清除本機資料 ----------
document.getElementById("clearAllData").addEventListener("click", () => {
  const ok = confirm("確定要刪除這台裝置上的所有網站資料嗎？");
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  pendingPhotos = [];
  renderSlideshow();
  renderSchedule();
  renderEvents();
  renderPreview();
  alert("本機資料已清除。");
});

// ---------- 啟動網站 ----------
updateClassTitle();
renderSlideshow();
renderSchedule();
renderEvents();

// ==========================================
// 測試 Firestore
// ==========================================

loadEventsFromFirestore().then(events => {

  console.log(
    `Firestore 目前有 ${events.length} 個活動`
  );

});

// ==========================================
// 測試 Firebase Storage
// ==========================================

window.testFirebaseStorage = async function () {

  try {

    // 找到老師上傳照片的 input
    const input =
      document.getElementById("eventPhotosInput");

    if (!input || !input.files.length) {

      console.log(
        "請先選擇一張照片，再執行測試。"
      );

      return;
    }

    // 取得第一張照片
    const file = input.files[0];

    console.log(
      "開始處理照片：",
      file.name
    );


    // 壓縮照片
    const result =
      await compressImage(file);


    console.log(
      "照片壓縮完成",
      result
    );


    // 上傳 Firebase Storage
    const url =
      await uploadPhotoToStorage(
        result.dataUrl,
        "test-" + Date.now() + ".webp"
      );


    console.log(
      "🎉 Firebase Storage 測試成功！"
    );

    console.log(
      "照片網址：",
      url
    );


  } catch (error) {

    console.error(
      "Firebase Storage 測試失敗：",
      error
    );

  }

};

// ==========================================================
// 測試刪除活動
//
// 使用方式：
//
// 在 Console 輸入：
//
// testDeleteEvent("你的活動ID")
//
// ==========================================================

window.testDeleteEvent = async function(eventId) {

  if (!eventId) {

    console.log(
      "請輸入活動 ID。"
    );

    return;

  }


  // 從 Firestore 找活動
  const eventRef =
    doc(
      db,
      "events",
      eventId
    );


  const eventSnapshot =
    await getDoc(
      eventRef
    );


  if (!eventSnapshot.exists()) {

    console.log(
      "找不到這個活動。"
    );

    return;

  }


  const eventData =
    eventSnapshot.data();


  console.log(
    "準備刪除活動：",
    eventData
  );


  const confirmed =
    confirm(
      `確定要刪除「${eventData.name}」嗎？\n\n` +
      `照片數量：${(eventData.photos || []).length} 張\n\n` +
      `刪除後無法復原。`
    );


  if (!confirmed) {

    console.log(
      "已取消刪除。"
    );

    return;

  }


  const success =
    await deleteEventFromFirebase(
      eventId,
      eventData
    );


  if (success) {

    console.log(
      "測試刪除成功！"
    );

  } else {

    console.log(
      "測試刪除失敗，請查看 Console。"
    );

  }

};
