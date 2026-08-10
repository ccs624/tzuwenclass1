
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
  getFirestore
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// Firebase 專案設定

const firebaseConfig = {

  apiKey: "AIzaSyAQa6JsfIUQuYhxAJdqqJPQf6kjUcXJMhM",

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


console.log("Firebase 已成功連線！");




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
      renderSlideshow();
    }, 4000);
  }
}

document.getElementById("prevSlide").addEventListener("click", () => {
  const data = loadData();
  if (!data.homePhotos.length) return;
  slideIndex = (slideIndex - 1 + data.homePhotos.length) % data.homePhotos.length;
  renderSlideshow();
});

document.getElementById("nextSlide").addEventListener("click", () => {
  const data = loadData();
  if (!data.homePhotos.length) return;
  slideIndex = (slideIndex + 1) % data.homePhotos.length;
  renderSlideshow();
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

function renderEvents() {
  const data = loadData();
  const list = document.getElementById("galleryList");

  if (!data.events.length) {
    list.innerHTML = '<div class="empty-state"><div></div><p>目前還沒有活動照片。</p></div>';
    return;
  }

  list.innerHTML = data.events.map((event, eventIndex) => `
    <article class="event-card">
      <div class="event-header">
        <div>
          <h3>${escapeHtml(event.name)}</h3>
          <div class="event-date">${formatDate(event.date)}</div>
        </div>
      </div>
      <div class="photo-grid">
        ${event.photos.map((photo, photoIndex) => `
          <div class="photo-item">
            <img src="${photo.dataUrl}" alt="${escapeHtml(event.name)} 第${photoIndex + 1}張照片">
          </div>
        `).join("")}
      </div>
      <div>
        ${event.photos.map((photo, i) =>
          `<a class="download-link" href="${photo.dataUrl}" download="${safeFileName(event.name)}-${i + 1}.webp">下載第 ${i + 1} 張</a>`
        ).join("　")}
      </div>
    </article>
  `).join("");
}

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

// ---------- 10. 活動照片預覽 ----------
let pendingPhotos = [];

document.getElementById("eventPhotosInput").addEventListener("change", async e => {
  pendingPhotos = [];

  for (const file of e.target.files) {
    try {
      const result = await compressImage(file);
      pendingPhotos.push({
        dataUrl: result.dataUrl,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize
      });
    } catch {
      alert(`「${file.name}」處理失敗。`);
    }
  }

  renderPreview();
});

function renderPreview() {
  const box = document.getElementById("photoPreview");

  box.innerHTML = pendingPhotos.map((photo, index) => `
    <div class="preview-item" title="第 ${index + 1} 張">
      <img src="${photo.dataUrl}" alt="預覽照片">
      <span>${index + 1}</span>
    </div>
  `).join("");
}

// ---------- 11. 發布活動 ----------
document.getElementById("saveEvent").addEventListener("click", () => {
  const name = document.getElementById("eventName").value.trim();
  const date = document.getElementById("eventDate").value;

  if (!name) return alert("請輸入活動名稱。");
  if (!pendingPhotos.length) return alert("請選擇至少一張照片。");

  const data = loadData();

  data.events.unshift({
    id: Date.now(),
    name,
    date,
    photos: [...pendingPhotos]
  });

  saveData(data);

  document.getElementById("eventName").value = "";
  document.getElementById("eventDate").value = "";
  document.getElementById("eventPhotosInput").value = "";
  pendingPhotos = [];
  renderPreview();
  renderEvents();

  alert("活動已發布。");
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
