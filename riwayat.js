
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();
const list = document.getElementById("list");
const summaryTotal = document.getElementById("summaryTotal");

let selectedMonth;
let selectedYear;

function rupiah(n){
  return "Rp "+(Number(n)||0).toLocaleString("id-ID");
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

  loadData(user.uid);
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

  updateFilterButton(); // ⬅️ ini

  closeFilter();

  const user = auth.currentUser;
  if(user){
    loadData(user.uid);
  }
}

async function loadData(uid){
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
  let totalAll=0;

  arr.forEach(d=>{
    totalAll += Number(d.totalProfit)||0;

    const p = d.pengeluaran || {};
    const lainnya = (p.lainnya || [])
      .map(x=>`${x.keterangan}: ${rupiah(x.harga)}`)
      .join("<br>");

    const div = document.createElement("div");
    div.className = "item";
    
    div.innerHTML = `
      <div class="line bold">📅 ${formatTanggal(d.tanggal)}</div>
    
      <hr>
    
      <div class="line">Klien: <b>${d.klien || 0}</b></div>
      <div class="line">Pembayaran Klien: <b>${rupiah(d.pembayaranKlien)}</b></div>
    
      <div class="line">Sales: <b>${d.sales || 0}</b></div>
      <div class="line">Pembayaran Sales: <b>${rupiah(d.pembayaranSales)}</b></div>
    
      <hr>
    
      <h4 style="margin:10px 0 6px;">Pengeluaran</h4>
    
      <div class="pengeluaran-row gas">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2a2 2 0 0 0-2 2v14a4 4 0 0 0 8 0V4a2 2 0 0 0-2-2H6zm0 2h4v6H6V4zm10.5 2-.5.5V13a2.5 2.5 0 1 0 5 0V9.5l-1.5-1.5-1.5 1.5V13a.5.5 0 1 1-1 0V6z"/>
          </svg>
          Gas
        </span>
        <b>${rupiah(p.gas)}</b>
      </div>
    
      <div class="pengeluaran-row tutup">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 6h18v2H3V6zm2 4h14v10H5V10zm4 2v6h2v-6H9zm4 0v6h2v-6h-2z"/>
          </svg>
          Tutup
        </span>
        <b>${rupiah(p.tutup)}</b>
      </div>
    
      <div class="pengeluaran-row bensin">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 3H6a2 2 0 0 0-2 2v14h10V5a2 2 0 0 0-2-2zm0 2v4H6V5h10zm3 3 2 2v6a2 2 0 1 1-4 0v-3h2v3a.5.5 0 1 0 1 0v-5l-2-2h1z"/>
          </svg>
          Bensin
        </span>
        <b>${rupiah(p.bensin)}</b>
      </div>
    
      <div class="pengeluaran-row listrik">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2 3 14h7v8l10-12h-7l0-8z"/>
          </svg>
          Listrik
        </span>
        <b>${rupiah(p.listrik)}</b>
      </div>
    
      ${
        (p.lainnya || []).length
          ? `<div class="line small" style="margin-top:8px;">
              Lainnya:<br>
              ${(p.lainnya || [])
                .map(x => `${x.keterangan}: ${rupiah(x.harga)}`)
                .join("<br>")}
            </div>`
          : ""
      }
    
      <div class="line bold" style="margin-top:8px;">
        Total Pengeluaran: ${rupiah(p.totalPengeluaran)}
      </div>
    
      <hr>
    
      <div class="profit ${d.totalProfit >= 0 ? "plus" : "minus"}">
        ${rupiah(d.totalProfit)}
      </div>
    `;
    list.appendChild(div);
  });

  summaryTotal.innerHTML = `Total Profit:<br><span style="font-size:1.3em">${rupiah(totalAll)}</span>`;
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