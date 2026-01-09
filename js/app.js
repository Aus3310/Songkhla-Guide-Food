/* Songkhla Guide Food - app.js */

// Debug marker (helps confirm the browser actually loaded the latest file)
console.log("[SGF] app.js loaded (v4 category+favorite fix)");

const DATA_URL = "./data/restaurants.json";

/** Google App Script Web App (JSONP) */
const GAS_URL = "https://script.google.com/macros/s/AKfycbx_HyV7KrDo2oNTauO-lax0V0-10O0Ys0jvsIl3lYpG_1GXbCUMzZoLu9FQMDYIRtpzjw/exec";

/** App state */
let lang = "en"; // default EN
let restaurants = [];
let selectedTag = "";
let onlyFavorites = false;
let activeRestaurantId = null;
// Keep category selection stable even when we rerender the <select>
let selectedCategory = "";

/** DOM */
const el = (id) => document.getElementById(id);

const cardsEl = el("cards");
const resultLabel = el("resultLabel");
const modeLabel = el("modeLabel");

const searchInput = el("searchInput");
const categorySelect = el("categorySelect");
const clearBtn = el("clearBtn");
const tagChips = el("tagChips");

const btnEN = el("btnEN");
const btnTH = el("btnTH");
const btnFavorites = el("btnFavorites");
const btnAccount = el("btnAccount");

const userBanner = el("userBanner");

/** Detail modal DOM */
const detailModal = el("detailModal");
const closeDetail = el("closeDetail");
const detailName = el("detailName");
const detailCat = el("detailCat");
const detailCover = el("detailCover");
const detailDesc = el("detailDesc");
const detailHours = el("detailHours");
const detailPhone = el("detailPhone");
const detailAddress = el("detailAddress");
const detailFoods = el("detailFoods");
const detailRecs = el("detailRecs");
const detailTags = el("detailTags");
const mapBox = el("mapBox");
const detailFavBtn = el("detailFavBtn");
const openMapNewTab = el("openMapNewTab");

const ratingStars = el("ratingStars");
const ratingNote = el("ratingNote");

/** Register modal DOM */
const regModal = el("regModal");
const regForm = el("regForm");
const closeReg = el("closeReg");

const heroTitle = el("heroTitle");
const heroDesc = el("heroDesc");
const subtitle = el("subtitle");

const quickLabel = el("quickLabel");
const tagLabel = el("tagLabel");
const lblName = el("lblName");
const lblNation = el("lblNation");
const lblAge = el("lblAge");
const regTitle = el("regTitle");
const regHint = el("regHint");
const submitReg = el("submitReg");
const regTitleId = "regTitle";

/** Login modal DOM */
const loginModal = el("loginModal");
const loginForm = el("loginForm");
const closeLogin = el("closeLogin");
const openLoginFromReg = el("openLoginFromReg");
const openRegFromLogin = el("openRegFromLogin");

function openLogin() {
  loginModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeLoginModal() {
  loginModal.classList.add("hidden");
  document.body.style.overflow = "";
}

/* -------------------- LocalStorage keys -------------------- */
const LS_PROFILE = "sgf_profile";
const LS_LANG = "sgf_lang";

/** Favorites and rating are per user (or guest) */
function currentUserKey() {
  const p = getProfile();
  return p?.id ? `user_${p.id}` : "guest";
}
function favKey() { return `sgf_favorites_${currentUserKey()}`; }
function rateKey() { return `sgf_ratings_${currentUserKey()}`; }

/* -------------------- Profile -------------------- */
function getProfile() {
  try { return JSON.parse(localStorage.getItem(LS_PROFILE) || "null"); }
  catch { return null; }
}
function setProfile(profile) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  paintUserBanner();
}

/* -------------------- Favorites -------------------- */
function getFavSet() {
  try { return new Set(JSON.parse(localStorage.getItem(favKey()) || "[]")); }
  catch { return new Set(); }
}
function setFavSet(set) {
  localStorage.setItem(favKey(), JSON.stringify([...set]));
}
function toggleFavorite(id) {
  const set = getFavSet();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  setFavSet(set);
  // If detail modal is open for this restaurant, update the button text immediately.
  if (activeRestaurantId === id && !detailModal.classList.contains("hidden")) {
    paintDetailFavoriteButton(id);
  }
  render();
}

function paintDetailFavoriteButton(id) {
  const isFav = getFavSet().has(id);
  detailFavBtn.textContent = isFav
    ? (lang === "en" ? "Remove favorite" : "ลบจากรายการโปรด")
    : (lang === "en" ? "Add to favorites" : "เพิ่มรายการโปรด");
}

/* -------------------- Ratings -------------------- */
function getRatings() {
  try { return JSON.parse(localStorage.getItem(rateKey()) || "{}"); }
  catch { return {}; }
}
function setRatings(obj) {
  localStorage.setItem(rateKey(), JSON.stringify(obj));
}
function setUserRating(id, stars) {
  const r = getRatings();
  r[id] = stars;
  setRatings(r);
  if (activeRestaurantId === id) renderDetail(id);
  render(); // refresh small hint if you want
}

/* -------------------- Language -------------------- */
function setLang(next) {
  lang = next;
  localStorage.setItem(LS_LANG, next);
  // Categories/tags are language-specific in this dataset.
  // Reset category so the UI doesn't silently point to a non-existent option.
  selectedCategory = "";
  // toggle button styles
  if (lang === "en") {
    btnEN.classList.add("bg-white/10"); btnEN.classList.remove("opacity-70");
    btnTH.classList.remove("bg-white/10"); btnTH.classList.add("opacity-70");
    document.documentElement.lang = "en";
  } else {
    btnTH.classList.add("bg-white/10"); btnTH.classList.remove("opacity-70");
    btnEN.classList.remove("bg-white/10"); btnEN.classList.add("opacity-70");
    document.documentElement.lang = "th";
  }
  paintStaticText();
  paintUserBanner();
  render();
}

/* -------------------- UI text (ternary requirement) -------------------- */
function paintStaticText() {
  // NOTE: You asked to use ternary left/right for UI elements — doing that here.
  subtitle.textContent = lang === "en"
    ? "Find great food in Songkhla"
    : "ค้นหาร้านอร่อยในจังหวัดสงขลา";

  heroTitle.textContent = lang === "en"
    ? "Explore Songkhla’s best local food"
    : "ออกตามหาร้านอร่อยที่ดีที่สุดในสงขลา";

  heroDesc.textContent = lang === "en"
    ? "Browse categories, view photos, save favorites, and open maps instantly."
    : "เลือกหมวด ดูรูป กดรายการโปรด และเปิดแผนที่ได้ทันที";

  quickLabel.textContent = lang === "en" ? "Quick search" : "ค้นหาแบบด่วน";
  tagLabel.textContent = lang === "en" ? "Popular tags" : "แท็กยอดนิยม";

  searchInput.placeholder = lang === "en"
    ? "Search by name, tag..."
    : "ค้นหาชื่อร้านหรือแท็ก...";

  clearBtn.textContent = lang === "en" ? "Clear" : "ล้างค่า";
  btnFavorites.textContent = lang === "en" ? "Favorites" : "รายการโปรด";
  btnAccount.textContent = getProfile()
    ? (lang === "en" ? "Account" : "บัญชี")
    : (lang === "en" ? "Register" : "ลงทะเบียน");

  modeLabel.textContent = onlyFavorites
    ? (lang === "en" ? "Showing: Favorites" : "โหมด: รายการโปรด")
    : (lang === "en" ? "Showing: All" : "โหมด: ทั้งหมด");

  // Detail labels
  el("hoursLabel").textContent = lang === "en" ? "Hours" : "เวลาเปิด-ปิด";
  el("phoneLabel").textContent = lang === "en" ? "Contact" : "ติดต่อ";
  el("addrLabel").textContent = lang === "en" ? "Address" : "ที่อยู่";
  el("foodPhotoLabel").textContent = lang === "en" ? "Food photos" : "รูปอาหาร";
  el("menuLabel").textContent = lang === "en" ? "Recommended menu" : "เมนูแนะนำ";
  el("rateLabel").textContent = lang === "en" ? "Your rating" : "ให้คะแนนของคุณ";
  el("mapLabel").textContent = lang === "en" ? "Map" : "แผนที่";
  closeDetail.textContent = lang === "en" ? "Close" : "ปิด";

  // Register modal labels
  regTitle.textContent = lang === "en" ? "Create account" : "สร้างบัญชีสมาชิก";
  lblName.textContent = lang === "en" ? "Name" : "ชื่อ";
  lblNation.textContent = lang === "en" ? "Nationality" : "สัญชาติ";
  lblAge.textContent = lang === "en" ? "Age" : "อายุ";
  submitReg.textContent = lang === "en" ? "Create account" : "สร้างบัญชี";
  regHint.textContent = lang === "en"
    ? "Data will be saved to Google Sheet."
    : "ข้อมูลจะถูกบันทึกลง Google Sheet";
  // Register password labels
  const lblPass = el("lblPass");
  const lblPass2 = el("lblPass2");
  if (lblPass) lblPass.textContent = lang === "en" ? "Password" : "รหัสผ่าน";
  if (lblPass2) lblPass2.textContent = lang === "en" ? "Confirm password" : "ยืนยันรหัสผ่าน";

  const openLoginBtn = el("openLoginFromReg");
  if (openLoginBtn) openLoginBtn.textContent = lang === "en"
    ? "Already have an account? Login"
    : "มีบัญชีแล้ว? เข้าสู่ระบบ";

  // Login modal labels
  const loginTitle = el("loginTitle");
  const lblLoginId = el("lblLoginId");
  const lblLoginPass = el("lblLoginPass");
  const submitLogin = el("submitLogin");
  const loginHint = el("loginHint");
  if (loginTitle) loginTitle.textContent = lang === "en" ? "Login" : "เข้าสู่ระบบ";
  if (lblLoginId) lblLoginId.textContent = lang === "en" ? "Account ID" : "รหัสสมาชิก (ID)";
  if (lblLoginPass) lblLoginPass.textContent = lang === "en" ? "Password" : "รหัสผ่าน";
  if (submitLogin) submitLogin.textContent = lang === "en" ? "Login" : "เข้าสู่ระบบ";
  if (loginHint) loginHint.textContent = lang === "en"
    ? "Use your Account ID that you got after registration."
    : "ใช้รหัสสมาชิก (ID) ที่ได้หลังลงทะเบียน";
}

/* -------------------- Load data -------------------- */
async function loadRestaurants() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
  restaurants = await res.json();
}

/* -------------------- Filters -------------------- */
function normalized(s) { return (s || "").toString().toLowerCase().trim(); }

function getAllCategories() {
  const set = new Set();
  for (const r of restaurants) set.add((r[lang]?.catagorie || "").trim());
  return [...set].filter(Boolean).sort((a,b) => a.localeCompare(b));
}

function getAllTags() {
  const set = new Set();
  for (const r of restaurants) {
    const tags = r[lang]?.tags || [];
    tags.forEach(t => set.add(t));
  }
  return [...set].filter(Boolean).slice(0, 18);
}

function matchesFilters(r) {
  const q = normalized(searchInput.value);
  const cat = categorySelect.value || "";
  const data = r[lang];

  const inFav = getFavSet().has(r.id);
  if (onlyFavorites && !inFav) return false;

  if (cat && data.catagorie !== cat) return false;

  if (selectedTag) {
    const tags = (data.tags || []).map(normalized);
    if (!tags.includes(normalized(selectedTag))) return false;
  }

  if (!q) return true;

  const hay = [
    data.name, data.description, data.address,
    ...(data.tags || []),
    ...(data.recommands || []).map(x => x?.[lang] || x?.en || x?.th || "")
  ].map(normalized).join(" | ");

  return hay.includes(q);
}

/* -------------------- Render -------------------- */
function renderCategorySelect() {
  const cats = getAllCategories();
  // Preserve selection even if we rebuild the <select>
  const current = selectedCategory || categorySelect.value || "";
  categorySelect.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = lang === "en" ? "All categories" : "ทุกหมวดหมู่";
  categorySelect.appendChild(opt0);

  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });

  // Restore selection if still available.
  const stillExists = current && [...categorySelect.options].some(o => o.value === current);
  categorySelect.value = stillExists ? current : "";
  selectedCategory = categorySelect.value;
}

function renderTags() {
  const tags = getAllTags();
  tagChips.innerHTML = "";

  tags.forEach(t => {
    const btn = document.createElement("button");
    const isActive = normalized(selectedTag) === normalized(t);
    btn.className = `glass soft text-xs rounded-full px-3 py-1 border ${isActive ? "border-[var(--brand)]" : "border-white/10 hover:border-white/30"}`;
    btn.textContent = t;
    btn.addEventListener("click", () => {
      selectedTag = isActive ? "" : t;
      render();
    });
    tagChips.appendChild(btn);
  });
}

function starRow(n) {
  // simple star string
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return full + empty;
}

function renderCards(list) {
  cardsEl.innerHTML = "";
  const favs = getFavSet();
  const userRates = getRatings();

  list.forEach(r => {
    const d = r[lang];
    const isFav = favs.has(r.id);
    const rating = userRates[r.id] || Math.round(r.rating || 4);

    const card = document.createElement("article");
    card.className = "glass soft rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 cursor-pointer";
    card.innerHTML = `
      <div class="relative">
        <img class="h-44 w-full object-cover" src="${d.images?.cover || ""}" alt="cover" />
        <button data-fav="${r.id}"
          class="absolute top-3 right-3 glass soft rounded-full px-3 py-2 text-sm border border-white/10 hover:border-[var(--brand)]">
          ${isFav ? "♥" : "♡"}
        </button>
      </div>

      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-semibold tracking-tight">${d.name}</div>
            <div class="text-xs text-white/60 mt-1 line-clamp-1">${d.catagorie}</div>
          </div>
          <div class="text-sm text-[var(--brand)]">${starRow(rating)}</div>
        </div>

        <div class="mt-2 text-sm text-white/75 line-clamp-2">
          ${d.description || ""}
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          ${(d.tags || []).slice(0, 3).map(tag => `
            <span class="text-xs rounded-full px-2.5 py-1 border border-white/10 bg-black/20">${tag}</span>
          `).join("")}
        </div>

        <div class="mt-3 text-xs text-white/60">
          ${lang === "en" ? "Hours:" : "เวลา:"} ${d.hours || (lang === "en" ? "Not available" : "ไม่ระบุ")}
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-fav]");
      if (btn) return; // handled below
      openDetail(r.id);
    });

    card.querySelector(`button[data-fav="${r.id}"]`).addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(r.id);
    });

    cardsEl.appendChild(card);
  });
}

function render() {
  if (!restaurants.length) return;

  paintStaticText();
  renderCategorySelect();
  renderTags();

  // keep selected category if still exists
  // (no forcing reset, but safe)
  const list = restaurants.filter(matchesFilters);

  resultLabel.textContent = lang === "en"
    ? `${list.length} place(s) found`
    : `พบทั้งหมด ${list.length} ร้าน`;

  renderCards(list);
}

/* -------------------- Detail modal -------------------- */
function openDetail(id) {
  activeRestaurantId = id;
  renderDetail(id);
  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDetailModal() {
  detailModal.classList.add("hidden");
  document.body.style.overflow = "";
  activeRestaurantId = null;
}

function renderDetail(id) {
  const r = restaurants.find(x => x.id === id);
  if (!r) return;
  const d = r[lang];

  detailName.textContent = d.name || "";
  detailCat.textContent = d.catagorie || "";
  detailCover.src = d.images?.cover || "";
  detailDesc.textContent = d.description || "";

  detailHours.textContent = d.hours || (lang === "en" ? "Not available" : "ไม่ระบุ");
  detailPhone.textContent = d.phone || (lang === "en" ? "Not available" : "ไม่ระบุ");
  detailAddress.textContent = d.address || (lang === "en" ? "Not available" : "ไม่ระบุ");

  // foods
  detailFoods.innerHTML = "";
  const foods = d.images?.foods || [];
  if (!foods.length) {
    detailFoods.innerHTML = `<div class="text-sm text-white/60">${lang === "en" ? "No photos" : "ไม่มีรูป"}</div>`;
  } else {
    foods.slice(0, 2).forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "food";
      img.className = "w-full h-40 object-cover rounded-2xl border border-white/10";
      detailFoods.appendChild(img);
    });
  }

  // recommended menu
  detailRecs.innerHTML = "";
  (d.recommands || []).forEach(item => {
    const li = document.createElement("li");
    li.className = "glass rounded-2xl p-3 border border-white/10";
    const primary = lang === "en" ? item.en : item.th;
    const secondary = lang === "en" ? item.th : item.en;

    li.innerHTML = `
      <div class="text-sm">${primary || ""}</div>
      <div class="text-xs text-white/60 mt-1">${secondary || ""}</div>
    `;
    detailRecs.appendChild(li);
  });

  // tags
  detailTags.innerHTML = "";
  (d.tags || []).forEach(t => {
    const chip = document.createElement("button");
    chip.className = "text-xs glass soft rounded-full px-3 py-1 border border-white/10 hover:border-white/30";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      selectedTag = t;
      closeDetailModal();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    detailTags.appendChild(chip);
  });

// map (fallback: ถ้า en ไม่มี ให้ไปเอา th / ถ้า th ไม่มี ให้ไปเอา en)
mapBox.innerHTML = "";

const embedVal =
  (d.embed || "").trim() ||
  ((r.th?.embed || "").trim()) ||
  ((r.en?.embed || "").trim());

if (!embedVal) {
  mapBox.textContent = lang === "en" ? "No map" : "ไม่มีแผนที่";
} else if (embedVal.startsWith("http")) {
  mapBox.innerHTML = `<iframe src="${embedVal}" width="100%" height="260" style="border:0;" loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"></iframe>`;
} else {
  mapBox.innerHTML = embedVal; // เผื่อบางร้านยังใส่ iframe เต็ม
}


  // favorite button
  paintDetailFavoriteButton(r.id);
  detailFavBtn.onclick = () => toggleFavorite(r.id);

  // open map new tab: if embed is iframe, try extract src; else open google map by address
  openMapNewTab.onclick = () => {
    const iframeMatch = (d.embed || "").match(/src="([^"]+)"/i);
    const url = iframeMatch?.[1] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address || d.name)}`;
    window.open(url, "_blank");
  };

  // rating widget
  const userRates = getRatings();
  const current = userRates[r.id] || 0;

  ratingStars.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.className = "text-xl soft px-1";
    b.style.color = i <= (current || 0) ? "var(--brand)" : "rgba(255,255,255,.35)";
    b.textContent = "★";
    b.title = `${i}/5`;
    b.addEventListener("click", () => setUserRating(r.id, i));
    ratingStars.appendChild(b);
  }
  ratingNote.textContent = current
    ? (lang === "en" ? `Saved: ${current}/5` : `บันทึกแล้ว: ${current}/5`)
    : (lang === "en" ? "Tap stars to rate" : "แตะดาวเพื่อให้คะแนน");
}

/* -------------------- Favorites mode -------------------- */
function toggleFavoritesMode() {
  onlyFavorites = !onlyFavorites;
  paintStaticText();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------- Registration (JSONP + SweetAlert) -------------------- */
function openReg() {
  regModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeRegModal() {
  regModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function paintUserBanner() {
  const p = getProfile();
  if (!p) {
    userBanner.classList.add("hidden");
    userBanner.textContent = "";
    return;
  }
  userBanner.classList.remove("hidden");
  userBanner.textContent = (lang === "en")
    ? `👋 Hi ${p.name} (${p.nationality}, ${p.age}) — Account ID: ${p.id} — Created: ${p.createdAt}`
    : `👋 สวัสดี ${p.name} (${p.nationality}, อายุ ${p.age}) — รหัส: ${p.id} — สร้างเมื่อ: ${p.createdAt}`;
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = `__sgf_cb_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    const cleanup = () => {
      delete window[cbName];
      script.remove();
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    script.src = url.replace("callback=?", `callback=${cbName}`);
    document.body.appendChild(script);
  });
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function submitRegistration(payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url = `${GAS_URL}?callback=?&action=register&data=${encoded}`;
  return await jsonp(url);
}

async function submitLogin(payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url = `${GAS_URL}?callback=?&action=login&data=${encoded}`;
  return await jsonp(url);
}

/* -------------------- Events -------------------- */
// When switching language, also "scroll to" the clicked button so the UI follows the action.
// This helps on small screens where the header / button group might overflow horizontally.
function scrollToLangButton(next) {
  const target = next === "th" ? btnTH : btnEN;
  // scrollIntoView will scroll the nearest scrollable parent (horizontal or vertical)
  // so the selected language button is visible.
  target?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
  target?.focus?.({ preventScroll: true });
}

btnEN.addEventListener("click", () => {
  setLang("en");
  scrollToLangButton("en");
});
btnTH.addEventListener("click", () => {
  setLang("th");
  scrollToLangButton("th");
});

btnFavorites.addEventListener("click", toggleFavoritesMode);

btnAccount.addEventListener("click", () => {
  if (getProfile()) {
    Swal.fire({
      title: lang === "en" ? "Account" : "บัญชีสมาชิก",
      html: `<div style="text-align:left">
        <div><b>${lang === "en" ? "Name" : "ชื่อ"}:</b> ${getProfile().name}</div>
        <div><b>${lang === "en" ? "Nationality" : "สัญชาติ"}:</b> ${getProfile().nationality}</div>
        <div><b>${lang === "en" ? "Age" : "อายุ"}:</b> ${getProfile().age}</div>
        <div style="margin-top:8px;opacity:.8"><b>ID:</b> ${getProfile().id}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: lang === "en" ? "OK" : "ตกลง",
      cancelButtonText: lang === "en" ? "Logout" : "ออกจากระบบ"
    }).then((res) => {
      if (res.dismiss === Swal.DismissReason.cancel) {
        localStorage.removeItem(LS_PROFILE);
        paintUserBanner();
        paintStaticText();
        render();
      }
    });
    return;
  }

  // not logged in -> open login (not register)
  openLogin();
});

closeDetail.addEventListener("click", closeDetailModal);
detailModal.addEventListener("click", (e) => {
  if (e.target === detailModal) closeDetailModal();
  if (e.target.classList?.contains("modal-backdrop")) closeDetailModal();
});

closeReg.addEventListener("click", closeRegModal);
regModal.addEventListener("click", (e) => {
  if (e.target.classList?.contains("modal-backdrop")) closeRegModal();
});

searchInput.addEventListener("input", render);
categorySelect.addEventListener("change", () => {
  selectedCategory = categorySelect.value || "";
  render();
});
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  categorySelect.value = "";
  selectedCategory = "";
  selectedTag = "";
  onlyFavorites = false;
  paintStaticText();
  render();
});

/* Registration form submit */
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = el("nameInput").value.trim();
  const nationality = el("nationInput").value.trim();
  const age = Number(el("ageInput").value);

  const pass1 = el("passInput").value;
  const pass2 = el("passInput2").value;

  if (pass1.length < 6) {
    Swal.fire({ icon:"warning", title: lang==="en"?"Weak password":"รหัสผ่านสั้นไป",
      text: lang==="en"?"Use at least 6 characters.":"อย่างน้อย 6 ตัวอักษร" });
    return;
  }
  if (pass1 !== pass2) {
    Swal.fire({ icon:"warning", title: lang==="en"?"Mismatch":"รหัสผ่านไม่ตรงกัน",
      text: lang==="en"?"Please confirm password again.":"กรุณายืนยันรหัสผ่านใหม่" });
    return;
  }

  const createdAt = new Date().toISOString();
  const passwordHash = await sha256Hex(pass1);

  const payload = { name, nationality, age, createdAt, passwordHash };

  Swal.fire({
    title: lang === "en" ? "Saving..." : "กำลังบันทึก...",
    text: lang === "en" ? "Please wait while we create your account." : "กรุณารอสักครู่ ระบบกำลังสร้างบัญชี",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await submitRegistration(payload);
    if (res?.status !== "success") throw new Error(res?.message || "Unknown error");

    setProfile({
      id: res.id,
      totalUsers: res.totalUsers,
      name, nationality, age,
      createdAt
    });

    Swal.fire({
      icon: "success",
      title: lang === "en" ? "Account created!" : "สร้างบัญชีสำเร็จ!",
      text: lang === "en"
        ? `Your ID is ${res.id}. (Use this ID to login)`
        : `รหัสสมาชิกของคุณคือ ${res.id} (ใช้ ID นี้เข้าสู่ระบบ)`
    });

    closeRegModal();
    regForm.reset();

  } catch (err) {
    Swal.fire({
      icon: "error",
      title: lang === "en" ? "Failed to save" : "บันทึกไม่สำเร็จ",
      text: String(err?.message || err)
    });
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = String(el("loginIdInput").value).trim();
  const pass = el("loginPassInput").value;

  if (!id) return;

  const passwordHash = await sha256Hex(pass);

  Swal.fire({
    title: lang === "en" ? "Logging in..." : "กำลังเข้าสู่ระบบ...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await submitLogin({ id, passwordHash });

    if (res?.status !== "success") throw new Error(res?.message || "Login failed");

    setProfile({
      id: res.profile.id,
      name: res.profile.name,
      nationality: res.profile.nationality,
      age: res.profile.age,
      createdAt: res.profile.createdAt
    });

    Swal.fire({
      icon: "success",
      title: lang === "en" ? "Welcome back!" : "ยินดีต้อนรับ!",
      text: lang === "en" ? `Logged in as ID ${res.profile.id}` : `เข้าสู่ระบบด้วย ID ${res.profile.id} แล้ว`
    });

    closeLoginModal();
    loginForm.reset();
    paintStaticText();
    render();

  } catch (err) {
    Swal.fire({
      icon: "error",
      title: lang === "en" ? "Login failed" : "เข้าสู่ระบบไม่สำเร็จ",
      text: String(err?.message || err)
    });
  }
});

if (openLoginFromReg) {
  openLoginFromReg.addEventListener("click", () => {
    closeRegModal();
    openLogin();
  });
}
if (openRegFromLogin) {
  openRegFromLogin.addEventListener("click", () => {
    closeLoginModal();
    openReg();
  });
}

closeLogin.addEventListener("click", closeLoginModal);
loginModal.addEventListener("click", (e) => {
  if (e.target.classList?.contains("modal-backdrop")) closeLoginModal();
});

/* -------------------- Init -------------------- */
(async function init(){
  // restore lang
  const savedLang = localStorage.getItem(LS_LANG);
  if (savedLang === "th" || savedLang === "en") lang = savedLang;

  setLang(lang); // also paints UI
  paintUserBanner();

  try {
    await loadRestaurants();
    render();
  } catch (err) {
    resultLabel.textContent = lang === "en"
      ? "Failed to load data."
      : "โหลดข้อมูลไม่สำเร็จ";
    console.error(err);
  }
})();
