// ================= INIT =================
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================= STATE FILTER ================= */
let filterBulan = null;
let filterTahun = null;

// 🔥 DEFAULT KE BULAN SEKARANG (HP USER)
const now = new Date();
filterBulan = now.toLocaleString("id-ID",{month:"long"});
filterTahun = now.getFullYear().toString();

/* ================= UTIL ================= */

function rupiah(n){
  return (Number(n)||0).toLocaleString("id-ID");
}

function show(val){
  return val && val !== 0;
}

/* ================= AUTH ================= */

auth.onAuthStateChanged(async user=>{
  if(!user){
    return location.href = "login.html";
  }
  loadStatement();
});

/* ================= LOAD STATEMENT ================= */

async function loadStatement(){
  const wrap = document.getElementById("statementList");

  const snap = await db.collection("statement")
    .orderBy("createdAt","desc")
    .get();

  if(snap.empty){
    wrap.innerHTML = `<div class="empty">Belum ada data</div>`;
    return;
  }

  wrap.innerHTML = "";

  snap.forEach(doc=>{
    const d = doc.data();

    const periode = d.periode || {};
    const bulan = periode.bulan || "-";
    const tahun = periode.tahun || "-";

    // 🔥 FILTER
    if(filterBulan && bulan !== filterBulan) return;
    if(filterTahun && tahun !== filterTahun) return;

    const exp = d.Expenditure || {};
    const lain = d.lain || {};

    const gas = exp.gas || 0;
    const tutup = exp.tutup || 0;
    const lainnya = exp.lainnya || 0;
    const spend = lain.spend || 0;

    const upahKoki = d.upahKoki || 0;
    const kas = d.kas || 0;
    const reinvestasi = d.reinvestasi || 0;

    const totalExpenses = gas + tutup + lainnya + spend + upahKoki + kas + reinvestasi;

    // 🔥 OMSET BARU
    const omset = (d.penjualan || 0) * 3800;

    // 🔥 PROFIT
    const profit = omset - totalExpenses;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="bulan">${(bulan + " " + tahun).toUpperCase()}</div>

      <div class="section-title">INCOME</div>

      ${show(d.penjualan) ? `
      <div class="row">
        <span>Sales / Penjualan</span>
        <b>${rupiah(d.penjualan)}</b>
      </div>` : ""}

      ${show(omset) ? `
      <div class="row">
        <span>Omset</span>
        <b>${rupiah(omset)}</b>
      </div>` : ""}

      <div class="divider"></div>

      <div class="section-title">EXPENSES</div>

      ${show(gas) ? `<div class="row sub"><span>Gas</span><span>${rupiah(gas)}</span></div>` : ""}
      ${show(tutup) ? `<div class="row sub"><span>Tutup</span><span>${rupiah(tutup)}</span></div>` : ""}
      ${show(lainnya) ? `<div class="row sub"><span>Lainnya</span><span>${rupiah(lainnya)}</span></div>` : ""}
      ${show(upahKoki) ? `<div class="row sub"><span>Gaji Koki</span><span>${rupiah(upahKoki)}</span></div>` : ""}
      ${show(spend) ? `<div class="row sub"><span>${lain.keterangan || "Lain-lain"}</span><span>${rupiah(spend)}</span></div>` : ""}
      ${show(kas) ? `<div class="row sub"><span>Kas</span><span>${rupiah(kas)}</span></div>` : ""}
      ${show(reinvestasi) ? `<div class="row sub"><span>Reinvestasi</span><span>${rupiah(reinvestasi)}</span></div>` : ""}

      <div class="divider"></div>

      <div class="row total">
        <span>Total Expenses</span>
        <b>${rupiah(totalExpenses)}</b>
      </div>

      <div class="divider"></div>

      <div class="row">
        <span class="total">Profit / Loss</span>
        <b class="profit ${profit >= 0 ? 'plus' : 'minus'}">
          ${rupiah(profit)}
        </b>
      </div>
    `;

    wrap.appendChild(card);
  });
}

/* ================= FILTER ================= */

function openFilter(){
  document.getElementById("popupFilter").style.display = "flex";
}

function closeFilter(){
  document.getElementById("popupFilter").style.display = "none";
}

function applyFilter(){
  filterBulan = document.getElementById("filterBulan").value || null;
  filterTahun = document.getElementById("filterTahun").value || null;

  closeFilter();
  loadStatement();
}

function resetFilter(){
  filterBulan = null;
  filterTahun = null;

  document.getElementById("filterBulan").value = "";
  document.getElementById("filterTahun").value = "";

  loadStatement();
}

/* ================= POPUP ================= */

function openStatementPopup(){
  document.getElementById("popupStatement").style.display = "flex";
}

function closeStatementPopup(){
  document.getElementById("popupStatement").style.display = "none";
}

/* ================= KIRIM STATEMENT ================= */

async function kirimStatement(){
  const btn = document.getElementById("btnKirim");
  const user = auth.currentUser;

  const tanggal = document.getElementById("inputTanggal").value;
  const kas = Number(document.getElementById("inputKas").value) || 0;
  const reinvestasi = Number(document.getElementById("inputReinvestasi").value) || 0;
  const ket = document.getElementById("inputKet").value;
  const spend = Number(document.getElementById("inputSpend").value) || 0;

  if(!tanggal){
    alert("Tanggal wajib diisi");
    return;
  }

  btn.innerText = "Loading...";
  btn.disabled = true;

  try{
    const date = new Date(tanggal);
    const bulanNama = date.toLocaleString("id-ID",{month:"long"});
    const tahun = date.getFullYear().toString();

    const snap = await db.collection("inputAdmin")
      .where("adminUID","==", user.uid)
      .get();

    let totalKlien = 0;
    let gas = 0;
    let tutup = 0;
    let lainnya = 0;

    snap.forEach(doc=>{
      const d = doc.data();
      if(!d.tanggal) return;

      const t = new Date(d.tanggal);
      const b = t.toLocaleString("id-ID",{month:"long"});
      const th = t.getFullYear().toString();

      if(b !== bulanNama || th !== tahun) return;

      totalKlien += d.klien || 0;

      const p = d.pengeluaran || {};
      gas += p.gas || 0;
      tutup += p.tutup || 0;

      if(typeof p.lainnya === "number"){
        lainnya += p.lainnya;
      }
    });

    // 🔥 FIX UTAMA
    const totalMargin = totalKlien * 3800;
    const upahKoki = totalKlien * 1500;

    const existSnap = await db.collection("statement")
      .where("periode.bulan","==",bulanNama)
      .where("periode.tahun","==",tahun)
      .get();

    const dataFinal = {
      penjualan: totalKlien,
      margin: totalMargin,
      kas: kas,
      reinvestasi: reinvestasi,
      upahKoki: upahKoki,
      lain:{
        keterangan: ket || "",
        spend: spend
      },
      Expenditure:{
        gas: gas,
        tutup: tutup,
        lainnya: lainnya
      },
      periode:{
        bulan: bulanNama,
        tahun: tahun
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if(!existSnap.empty){
      const id = existSnap.docs[0].id;
      await db.collection("statement").doc(id).update(dataFinal);
    }else{
      await db.collection("statement").add(dataFinal);
    }

    btn.innerText = "Berhasil ✅";

    setTimeout(()=>{
      location.reload(); // 🔥 reload otomatis
    },1500);

  }catch(e){
    console.error(e);

    btn.innerText = "Gagal ❌";

    setTimeout(()=>{
      btn.innerText = "Kirim";
      btn.disabled = false;
    },2000);
  }
}

/* ================= CLOSE POPUP ================= */

window.addEventListener("DOMContentLoaded", () => {
// 🔥 SET DEFAULT FILTER UI
  const bulanSelect = document.getElementById("filterBulan");
  const tahunInput = document.getElementById("filterTahun");

  if(bulanSelect){
    bulanSelect.value = filterBulan;
  }

  if(tahunInput){
    tahunInput.value = filterTahun;
  }
  const popupFilter = document.getElementById("popupFilter");
  const popupStatement = document.getElementById("popupStatement");

  if(popupFilter){
    popupFilter.addEventListener("click", e=>{
      if(e.target === popupFilter) closeFilter();
    });
  }

  if(popupStatement){
    popupStatement.addEventListener("click", e=>{
      if(e.target === popupStatement) closeStatementPopup();
    });
  }

});