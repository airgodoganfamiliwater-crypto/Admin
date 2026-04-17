
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
let selectedDocId = null; // ⬅️ simpan doc yg diklik

function rupiah(n){
  return "Rp "+(Number(n)||0).toLocaleString("id-ID");
}
function toNumber(val){
  if(val === "" || val === null || val === undefined) return 0;
  return Number(val) || 0;
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

  // ⬇️ CEK TAB YANG AKTIF
  const activeTab = document.querySelector(".tab.active").innerText;

  if(activeTab === "Klien"){
    loadDataKlien(user.uid);
  }else if(activeTab === "Sales"){
    loadDataSales(user.uid);
  }
}

async function loadDataKlien(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID","==",uid)
    .get();

  if(snap.empty){
    list.innerHTML="<p class='small'>Belum ada data</p>";
    return;
  }

  const currentMonth = selectedMonth;
  const currentYear = selectedYear;

  let arr = [];
  snap.forEach(d=>{
    const data = d.data();
    if(data.tanggal){
      const t = new Date(data.tanggal);
      if(t.getMonth() === currentMonth && t.getFullYear() === currentYear){
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
    totalOmset += omset;
    const validasi = toNumber(d.validasi);
  
    const docId = d.adminUID + "_" + d.tanggal;
  
    // cek mismatch
    const isMismatch = omset !== validasi;
  
    const div = document.createElement("div");
    div.className = "item";
  
    div.onclick = () => openValidasi(docId, validasi);
  
    div.innerHTML = `
      <div class="line bold" style="display:flex;justify-content:space-between;align-items:center;">
        <span>📅 ${formatTanggal(d.tanggal)}</span>
        ${isMismatch ? `<span class="badge-error">Selisih</span>` : ""}
      </div>
  
      <hr>
  
      <div class="line">Closing Klien: <b>${d.klien || 0}</b></div>
  
      <div class="line">Pembayaran: <b>${rupiah(d.pembayaranKlien)}</b></div>
  
      <div class="line">Pengeluaran: <b>${rupiah(totalPengeluaran)}</b></div>
  
      <div class="line">Margin: <b>${rupiah(marginKlien)}</b></div>
  
      <div class="line">
        Validasi: <b>${rupiah(validasi)}</b>
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
function openValidasi(docId, currentValue){
  selectedDocId = docId;

  document.getElementById("popupValidasi").style.display = "flex";
  document.getElementById("inputValidasi").value = currentValue || "";
}
function closeValidasi(e){
  if(!e || e.target.id === "popupValidasi"){
    document.getElementById("popupValidasi").style.display = "none";
  }
}
async function simpanValidasi(){
  const val = document.getElementById("inputValidasi").value.replace(/\D/g,"");
  const angka = Number(val) || 0;

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

    closeValidasi();

    // reload data
    const user = auth.currentUser;
    if(user){
      loadData(user.uid);
    }

  }catch(e){
    alert("Gagal simpan: " + e.message);
  }
}
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
    const sales = toNumber(d.sales);
    const pembayaran = toNumber(d.pembayaranSales);

    totalSales += pembayaran;

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="line bold">
        📅 ${formatTanggal(d.tanggal)}
      </div>

      <hr>

      <div class="line">
        Sales: <b>${sales}</b>
      </div>

      <div class="line">
        Pembayaran Sales: <b>${rupiah(pembayaran)}</b>
      </div>
    `;

    listSales.appendChild(div);
  });

  summarySales.innerHTML = `
    Total Sales:<br>
    <span style="font-size:1.3em">${rupiah(totalSales)}</span>
    <div class="small">Periode ${selectedMonth+1}/${selectedYear}</div>
  `;
}

const scrollBtn = document.getElementById("scrollTopBtn");

/* DETEKSI SCROLL */
window.addEventListener("scroll", () => {
  if(window.scrollY > 300){
    scrollBtn.classList.add("show");
  } else {
    scrollBtn.classList.remove("show");
  }
});

/* FUNCTION SCROLL KE ATAS */
function scrollToTop(){
  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}

function switchTab(tab){
  document.querySelectorAll(".tab").forEach(t=>{
    t.classList.remove("active");
  });

  document.querySelectorAll(".tab-content").forEach(c=>{
    c.classList.remove("active");
  });

  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`)
    .classList.add("active");

  document.getElementById("tab-"+tab)
    .classList.add("active");

  const user = auth.currentUser;
  if(!user) return;

  if(tab === "klien"){
    loadDataKlien(user.uid);
  } else if(tab === "sales"){
    loadDataSales(user.uid);
  }
}