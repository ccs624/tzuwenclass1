
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


/*
 * 顯示「班級活動」列表
 *
 * 每個活動最多只顯示 4 張預覽照片。
 *
 * 如果活動有超過 4 張照片，
 * 就顯示「查看全部照片」按鈕。
 */
function renderEvents() {

  const data = loadData();

  const list = document.getElementById("galleryList");

  if (!data.events.length) {

    list.innerHTML = `
      <div class="empty-state">
        <div></div>
        <p>目前還沒有活動照片。</p>
      </div>
    `;

    return;
  }


  /*
   * 建立每一個活動的卡片
   */
  list.innerHTML = data.events.map((event, eventIndex) => {

    /*
     * 只取前 4 張照片作為活動列表預覽。
     *
     * 原本活動可能有 50 張，
     * 這裡只顯示 4 張。
     */
    const previewPhotos = event.photos.slice(0, 4);


    /*
     * 如果照片超過 4 張，
     * 顯示「查看全部照片」。
     *
     * 如果只有 4 張或更少，
     * 仍然可以查看活動。
     */
    const viewButtonText =
      event.photos.length > 4
        ? `查看全部照片（共 ${event.photos.length} 張） →`
        : `查看全部照片 →`;


    return `
      <article class="event-card">

        <!-- 活動名稱與日期 -->
        <div class="event-header">

          <h3>
            ${escapeHtml(event.name)}
          </h3>

          <div class="event-date">
            ${formatDate(event.date)}
          </div>

        </div>


        <!--
          活動預覽照片

          只顯示前 4 張
        -->
        <div class="event-preview-grid">

          ${previewPhotos.map((photo, photoIndex) => `

            <div class="event-preview-item">

              <img
                src="${photo.dataUrl}"
                alt="${escapeHtml(event.name)} 第 ${photoIndex + 1} 張照片"
              >

            </div>

          `).join("")}

        </div>


        <!-- 查看全部照片 -->
        <button
          class="view-event-btn"
          type="button"
          data-event-index="${eventIndex}"
        >
          ${viewButtonText}
        </button>

      </article>
    `;

  }).join("");


  /*
   * 為所有「查看全部照片」按鈕加入點擊事件
   */
  document.querySelectorAll(".view-event-btn").forEach(button => {

    button.addEventListener("click", () => {

      const eventIndex = Number(
        button.dataset.eventIndex
      );

      openEventDetail(eventIndex);

    });

  });

}


/* ==========================================
   活動詳細頁
   ========================================== */

/*
 * 開啟某一個活動的詳細照片頁
 */
function openEventDetail(eventIndex) {

  const data = loadData();

  const event = data.events[eventIndex];

  /*
   * 如果找不到活動，就停止。
   */
  if (!event) return;


  /*
   * 取得活動詳細頁需要的 HTML 元素
   */
  const detailPage =
    document.getElementById("eventDetail");

  const detailName =
    document.getElementById("detailEventName");

  const detailDate =
    document.getElementById("detailEventDate");

  const detailPhotoGrid =
    document.getElementById("detailPhotoGrid");


  /*
   * 放入活動名稱
   */
  detailName.textContent = event.name;


  /*
   * 放入活動日期
   */
  detailDate.textContent = formatDate(event.date);


  /*
   * 建立全部照片
   *
   * 注意：
   * 這裡不是 slice(0, 4)
   *
   * 所以活動有 50 張，
   * 這裡就會顯示 50 張。
   */
  detailPhotoGrid.innerHTML =
    event.photos.map((photo, photoIndex) => `

      <div class="detail-photo-item">

        <img
          src="${photo.dataUrl}"
          alt="${escapeHtml(event.name)} 第 ${photoIndex + 1} 張照片"
        >

      </div>

    `).join("");


  /*
   * 隱藏原本的班級活動區
   */
  document.getElementById("photos")
    .classList.add("hidden");


  /*
   * 顯示活動詳細頁
   */
  detailPage.classList.remove("hidden");


  /*
   * 回到頁面最上方
   */
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ==========================================
   返回班級活動列表
   ========================================== */

document
  .getElementById("backToGallery")
  .addEventListener("click", () => {

    /*
     * 隱藏活動詳細頁
     */
    document
      .getElementById("eventDetail")
      .classList.add("hidden");


    /*
     * 顯示班級活動
     */
    document
      .getElementById("photos")
      .classList.remove("hidden");


    /*
     * 回到班級活動的位置
     */
    document
      .getElementById("photos")
      .scrollIntoView({
        behavior: "smooth"
      });

  });

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
