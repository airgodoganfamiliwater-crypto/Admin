firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

const list = document.getElementById("list");
const summaryTotal = document.getElementById("summaryTotal");
const listSales = document.getElementById("listSales");
const summarySales = document.getElementById("summarySales");

let selectedMonth;
let selectedYear;
let selectedDocId = null;

/* ================= UTIL ================= */

function rupiah(n){
  return "Rp "+(Number(n)||0).toLocaleString("id-ID");
}

function toNumber(val){
  if(val === null || val === undefined || val === "") return null;
  return Number(val);
}

// 🔥 FIX PARSE (SUPPORT MINUS & DESIMAL)
function parseInputNumber(val){
  if(!val) return 0;

  return Number(
    val
      .replace(/\./g,"")   // hapus ribuan
      .replace(",",".")    // koma → desimal
  ) || 0;
}

function formatTanggal(str){
  if(!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", {
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });
}

/* ================= AUTH ================= */

auth.onAuthStateChanged(async user=>{
  if(!user) return location.href="login.html";

  const now = new Date();
  selectedMonth = now.getMonth();
  selectedYear = now.getFullYear();

  initTahun();
  setDefaultFilterUI();
  updateFilterButton();

  loadDataKlien(user.uid);
});

/* ================= FILTER ================= */

function updateFilterButton(){
  const bulanText = document.getElementById("filterBulan")
    .options[selectedMonth].text;

  document.getElementById("btnFilter").innerText =
    `${bulanText} ${selectedYear}`;
}

function initTahun(){
  const el = document.getElementById("filterTahun");
  const now = new Date().getFullYear();

  for(let i = now; i >= 2020; i--){
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    el.appendChild(opt);
  }
}

function setDefaultFilterUI(){
  document.getElementById("filterBulan").value = selectedMonth;
  document.getElementById("filterTahun").value = selectedYear;
}

function openFilter(){
  document.getElementById("filterPopup").style.display = "flex";
}

function closeFilter(){
  document.getElementById("filterPopup").style.display = "none";
}

function applyFilter(){
  selectedMonth = Number(document.getElementById("filterBulan").value);
  selectedYear = Number(document.getElementById("filterTahun").value);

  updateFilterButton();
  closeFilter();

  const user = auth.currentUser;
  if(!user) return;

  const activeTab = document.querySelector(".tab.active").innerText;

  if(activeTab === "Klien"){
    loadDataKlien(user.uid);
  }else{
    loadDataSales(user.uid);
  }
}

/* ================= LOAD KLIEN ================= */

async function loadDataKlien(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID","==",uid)
    .get();

  if(snap.empty){
    list.innerHTML="<p class='small'>Belum ada data</p>";
    return;
  }

  let arr = [];

  snap.forEach(d=>{
    const data = d.data();

    if(data.tanggal){
      const t = new Date(data.tanggal);

      if(t.getMonth() === selectedMonth && t.getFullYear() === selectedYear){
        arr.push(data);
      }
    }
  });

  if(arr.length === 0){
    list.innerHTML="<p class='small'>Belum ada data bulan ini</p>";
    summaryTotal.innerHTML="";
    return;
  }

  arr.sort((a,b)=>(b.tanggal||"").localeCompare(a.tanggal||""));

  list.innerHTML="";
  let totalOmset = 0;

  arr.forEach(d=>{
    const p = d.pengeluaran || {};

    const totalPengeluaran = toNumber(p.totalPengeluaran);
    const marginKlien = toNumber(d.marginKlien);
    const omset = toNumber(d.pembagianKlien);
    const validasi = toNumber(d.validasi);

    totalOmset += omset;

    const docId = d.adminUID + "_" + d.tanggal;
    const isMismatch = omset !== validasi;

    const div = document.createElement("div");
    div.className = "item";

    div.setAttribute("data-id", docId);
    div.setAttribute("data-omset", omset);
    div.setAttribute("data-validasi", validasi ?? "");

    div.onclick = () => openValidasi(docId);

    div.innerHTML = `
      <div class="line bold" style="display:flex;justify-content:space-between;">
        <span>📅 ${formatTanggal(d.tanggal)}</span>
        ${isMismatch ? `<span class="badge-error">Selisih</span>` : ""}
      </div>

      <hr>

      <div class="line">Closing Klien: <b>${d.klien || 0}</b></div>
      <div class="line">Pembayaran: <b>${rupiah(d.pembayaranKlien)}</b></div>
      <div class="line">Pengeluaran: <b>${rupiah(totalPengeluaran)}</b></div>
      <div class="line">Margin: <b>${rupiah(marginKlien)}</b></div>

      <div class="line">
        Validasi: <b class="validasi-value">${rupiah(validasi)}</b>
      </div>

      <div class="profit ${omset >= 0 ? "plus" : "minus"}">
        Omset: ${rupiah(omset)}
      </div>
    `;

    list.appendChild(div);
  });

  summaryTotal.innerHTML = `
    Total Omset:<br>
    <span style="font-size:1.3em">${rupiah(totalOmset)}</span>
    <div class="small">Periode ${selectedMonth+1}/${selectedYear}</div>
  `;
}

/* ================= VALIDASI ================= */

function openValidasi(docId){
  selectedDocId = docId;

  const div = document.querySelector(`.item[data-id="${docId}"]`);
  if(!div) return;

  const input = document.getElementById("inputValidasi");

  // 🔥 ambil dari DOM (REALTIME)
  let val = div.getAttribute("data-validasi");

  if(val === "" || val === null){
    input.value = "";
    input.readOnly = false;
  }else{
    const angka = Number(val);
    input.value = angka.toLocaleString("id-ID");
    input.readOnly = true; // 🔥 langsung readonly kalau sudah ada
  }

  document.getElementById("popupValidasi").style.display = "flex";
}

function closeValidasi(e){
  if(!e || e.target.id === "popupValidasi"){
    document.getElementById("popupValidasi").style.display = "none";
  }
}

// 🔥 FORMAT INPUT REALTIME
document.getElementById("inputValidasi").addEventListener("input", e=>{
  let v = e.target.value;

  const isNegative = v.startsWith("-");
  v = v.replace(/[^\d,]/g,"");

  let parts = v.split(",");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");

  e.target.value = (isNegative ? "-" : "") + parts.join(",");
});

async function simpanValidasi(){
  const raw = document.getElementById("inputValidasi").value;

  // 🔥 kalau kosong → jangan paksa jadi 0
  const angka = raw === "" ? null : parseInputNumber(raw);

  if(!selectedDocId){
    alert("Doc tidak ditemukan");
    return;
  }

  try{
    await db.collection("inputAdmin")
      .doc(selectedDocId)
      .set({
        validasi: angka,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });

    updateValidasiUI(selectedDocId, angka);

    const input = document.getElementById("inputValidasi");

    // 🔥 tampilkan sesuai kondisi
    if(angka === null){
      input.value = "";
    }else{
      input.value = Number(angka).toLocaleString("id-ID");
    }

    input.readOnly = true;

    setTimeout(()=>{
      closeValidasi();
      input.readOnly = false;
    }, 800);

  }catch(e){
    alert("Gagal simpan: " + e.message);
  }
}

function updateValidasiUI(docId, angka){
  const div = document.querySelector(`.item[data-id="${docId}"]`);
  if(!div) return;

  // 🔥 SIMPAN KE DOM (INI KUNCINYA)
  div.setAttribute("data-validasi", angka ?? "");

  const validasiEl = div.querySelector(".validasi-value");

  if(validasiEl){
    validasiEl.innerText = angka === null ? "-" : rupiah(angka);
  }

  const omset = Number(div.getAttribute("data-omset")) || 0;

  let badge = div.querySelector(".badge-error");

  const isMismatch = angka === null || omset !== angka;

  if(isMismatch){
    if(!badge){
      badge = document.createElement("span");
      badge.className = "badge-error";
      badge.innerText = "Selisih";
      div.querySelector(".line.bold").appendChild(badge);
    }
  }else{
    if(badge) badge.remove();
  }
}

/* ================= SALES ================= */

async function loadDataSales(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID","==",uid)
    .get();

  if(snap.empty){
    listSales.innerHTML="<p class='small'>Belum ada data</p>";
    summarySales.innerHTML="";
    return;
  }

  let arr = [];

  snap.forEach(d=>{
    const data = d.data();

    if(data.tanggal){
      const t = new Date(data.tanggal);

      if(t.getMonth() === selectedMonth && t.getFullYear() === selectedYear){
        arr.push(data);
      }
    }
  });

  if(arr.length === 0){
    listSales.innerHTML="<p class='small'>Belum ada data bulan ini</p>";
    summarySales.innerHTML="";
    return;
  }

  arr.sort((a,b)=>(b.tanggal||"").localeCompare(a.tanggal||""));

  listSales.innerHTML="";
  let totalSales = 0;

  arr.forEach(d=>{
    const pembayaran = toNumber(d.pembayaranSales);
    totalSales += pembayaran;

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="line bold">📅 ${formatTanggal(d.tanggal)}</div>
      <hr>
      <div class="line">Sales: <b>${d.sales || 0}</b></div>
      <div class="line">Pembayaran Sales: <b>${rupiah(pembayaran)}</b></div>
    `;

    listSales.appendChild(div);
  });

  summarySales.innerHTML = `
    Total Sales:<br>
    <span style="font-size:1.3em">${rupiah(totalSales)}</span>
    <div class="small">Periode ${selectedMonth+1}/${selectedYear}</div>
  `;
}

/* ================= SCROLL ================= */

const scrollBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  scrollBtn.classList.toggle("show", window.scrollY > 300);
});

function scrollToTop(){
  window.scrollTo({ top:0, behavior:"smooth" });
}

/* ================= TAB ================= */

function switchTab(tab){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));

  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`)
    .classList.add("active");

  document.getElementById("tab-"+tab).classList.add("active");

  const user = auth.currentUser;
  if(!user) return;

  if(tab === "klien"){
    loadDataKlien(user.uid);
  }else{
    loadDataSales(user.uid);
  }
}