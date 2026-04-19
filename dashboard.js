firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

const userEmail = document.getElementById("userEmail");

/* ================= AUTH ================= */

auth.onAuthStateChanged(async user=>{
  if(!user){
    return location.href = "login.html";
  }

  try{
    const doc = await db.collection("adminCabang").doc(user.uid).get();

    if(!doc.exists){
      alert("❌ Bukan admin cabang");
      return;
    }

    const data = doc.data();

    if(data.role !== "admin_cabang" || data.status !== "approved"){
      alert("❌ Akses ditolak");
      return;
    }

    userEmail.innerText = user.email;

    loadLatestData(user.uid);
    loadNotif();
    loadProgress();

  }catch(e){
    alert("❌ Error: " + e.message);
  }
});

/* ================= UTIL ================= */

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

function formatTanggalJam(ts){
  if(!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID");
}

function rupiah(n){
  return "Rp "+(Number(n)||0).toLocaleString("id-ID");
}

/* ================= DATA TERAKHIR ================= */

async function loadLatestData(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID","==",uid)
    .get();

  if(snap.empty) return;

  let latest = null;

  snap.forEach(doc=>{
    const d = doc.data();
    if(!d.tanggal) return;

    if(!latest || d.tanggal > latest.tanggal){
      latest = d;
    }
  });

  if(!latest) return;

  document.getElementById("latestTanggal").innerText =
    formatTanggal(latest.tanggal);

  document.getElementById("latestKlien").innerText =
    latest.klien || 0;

  document.getElementById("latestPembayaranKlien").innerText =
    rupiah(latest.pembayaranKlien);

  document.getElementById("latestSales").innerText =
    latest.sales || 0;

  document.getElementById("latestPembayaranSales").innerText =
    rupiah(latest.pembayaranSales);

  const p = latest.pengeluaran || {};

  const totalPengeluaran = p.totalPengeluaran || 0;
  const marginAll = latest.marginAll ?? latest.marginKlien ?? 0;
  const marginKlien = latest.marginKlien ?? 0;

  document.getElementById("latestPengeluaran").innerText =
    rupiah(totalPengeluaran);

  document.getElementById("latestMarginAll").innerText =
    rupiah(marginAll);

  document.getElementById("latestMarginKlien").innerText =
    rupiah(marginKlien);
}

/* ================= NOTIF ================= */

async function loadNotif(){
  const snap = await db.collection("notifikasi")
    .orderBy("createdAt","desc")
    .limit(1)
    .get();

  if(snap.empty) return;

  const data = snap.docs[0].data();

  document.getElementById("notifDate").innerText =
    formatTanggalJam(data.createdAt);

  document.getElementById("notifText").innerText =
    data.isi || "Tidak ada catatan";

  const img = document.getElementById("notifImage");

  if(data.foto){
    img.src = data.foto;
    img.style.display = "block";
  }else{
    img.style.display = "none";
  }
}

/* ================= IMAGE ================= */

let selectedImage = null;

function pickImage(){
  document.getElementById("inputFile").click();
}

document.getElementById("inputFile").addEventListener("change", e=>{
  const file = e.target.files[0];
  if(!file) return;

  compressImage(file, 0.6).then(base64=>{
    selectedImage = base64;
    document.getElementById("previewImg").src = base64;
  });
});

function compressImage(file, quality=0.7){
  return new Promise(resolve=>{
    const reader = new FileReader();

    reader.onload = e=>{
      const img = new Image();
      img.src = e.target.result;

      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    };

    reader.readAsDataURL(file);
  });
}

/* ================= SIMPAN NOTIF ================= */

async function simpanNotif(){
  const btn = document.getElementById("btnSaveNotif");
  const text = document.getElementById("inputNotif").value;

  btn.innerText = "Menyimpan...";
  btn.disabled = true;

  try{
    await db.collection("notifikasi").add({
      isi: text || "",
      foto: selectedImage || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    btn.innerText = "Sukses ✅";

    setTimeout(()=>{
      closePopup();
      btn.innerText = "Simpan";
      btn.disabled = false;
      loadNotif();
    },2000);

  }catch(e){
    btn.innerText = "Gagal ❌";

    setTimeout(()=>{
      btn.innerText = "Simpan";
      btn.disabled = false;
    },2000);
  }
}

/* ================= POPUP ================= */

function openPopup(){
  document.getElementById("popupNotif").style.display = "flex";
}

function closePopup(){
  document.getElementById("popupNotif").style.display = "none";
  document.getElementById("inputNotif").value = "";
  document.getElementById("previewImg").src = "";
  selectedImage = null;
}

/* ================= LONG PRESS FIX ================= */

window.addEventListener("DOMContentLoaded", () => {

  const notifCard = document.getElementById("notifCard");

  if(!notifCard) return;

  let pressTimer = null;

  const start = () => {
    pressTimer = setTimeout(() => {
      openPopup();

      // 🔥 optional getar HP
      if(navigator.vibrate){
        navigator.vibrate(50);
      }

    }, 600);
  };

  const cancel = () => {
    clearTimeout(pressTimer);
  };

  // mobile
  notifCard.addEventListener("touchstart", start);
  notifCard.addEventListener("touchend", cancel);
  notifCard.addEventListener("touchmove", cancel);

  // desktop
  notifCard.addEventListener("mousedown", start);
  notifCard.addEventListener("mouseup", cancel);
  notifCard.addEventListener("mouseleave", cancel);

});

/* ================= LOAD PROGRESS ================= */

async function loadProgress(){
  const list = document.getElementById("progressList");

  const snap = await db.collection("progress").get();

  if(snap.empty){
    list.innerHTML = `<div class="empty">Belum ada progress</div>`;
    return;
  }

  list.innerHTML = "";

  snap.forEach(doc=>{
    const d = doc.data();

    const div = document.createElement("div");
    div.className = "progress-item row";

    div.innerHTML = `
      <div class="left">
        <b>${doc.id}</b>
      </div>
      <div class="right">
        <span class="badge ${d.status || "plan"}">
          ${d.status || "plan"}
        </span>
      </div>
    `;

    // 🔥 klik = edit
    div.onclick = () => openProgressPopup(doc.id, d);

    list.appendChild(div);
  });
}
let isEditMode = false;
let oldId = null; // 🔥 simpan ID lama

function openProgressPopup(id = "", data = null){
  document.getElementById("popupProgress").style.display = "flex";

  const inputId = document.getElementById("inputProgressId");
  const inputDesk = document.getElementById("inputDeskripsi");

  if(data){
    isEditMode = true;
    oldId = id; // 🔥 simpan ID lama

    inputId.value = id;
    inputId.disabled = false; // 🔥 sekarang bisa diedit

    inputDesk.value = data.deskripsi || "";

    document.querySelectorAll("input[name='status']").forEach(r=>{
      r.checked = (r.value === data.status);
    });

  }else{
    isEditMode = false;
    oldId = null;

    inputId.value = "";
    inputDesk.value = "";

    document.querySelectorAll("input[name='status']").forEach(r=>r.checked=false);
  }
}

function closeProgressPopup(){
  document.getElementById("popupProgress").style.display = "none";

  document.getElementById("inputProgressId").value = "";
  document.getElementById("inputDeskripsi").value = "";

  document.querySelectorAll("input[name='status']").forEach(r=>r.checked=false);

  isEditMode = false;
  oldId = null; // 🔥 reset
}
async function simpanProgress(){
  const btn = document.getElementById("btnSaveProgress");

  const newId = document.getElementById("inputProgressId").value.trim();
  const deskripsi = document.getElementById("inputDeskripsi").value;
  const status = document.querySelector("input[name='status']:checked")?.value;

  if(!newId){
    alert("ID wajib diisi");
    return;
  }

  btn.innerText = "Menyimpan...";
  btn.disabled = true;

  try{

    // 🔥 JIKA EDIT & ID BERUBAH
    if(isEditMode && oldId && oldId !== newId){

      // buat doc baru
      await db.collection("progress").doc(newId).set({
        deskripsi: deskripsi,
        status: status || "plan"
      });

      // hapus doc lama
      await db.collection("progress").doc(oldId).delete();

    }else{
      // normal save
      await db.collection("progress").doc(newId).set({
        deskripsi: deskripsi,
        status: status || "plan"
      });
    }

    btn.innerText = "Berhasil ✅";

    setTimeout(()=>{
      closeProgressPopup();
      btn.innerText = "Simpan";
      btn.disabled = false;

      loadProgress();
    },2000);

  }catch(e){

    btn.innerText = "Gagal ❌";

    setTimeout(()=>{
      btn.innerText = "Simpan";
      btn.disabled = false;
    },2000);
  }
}
/* ================= CLOSE POPUP ON OUTSIDE CLICK ================= */

window.addEventListener("DOMContentLoaded", () => {

  const popupNotif = document.getElementById("popupNotif");
  const popupProgress = document.getElementById("popupProgress");

  // klik luar popup NOTIF
  popupNotif.addEventListener("click", (e) => {
    if(e.target === popupNotif){
      closePopup();
    }
  });

  // klik luar popup PROGRESS
  popupProgress.addEventListener("click", (e) => {
    if(e.target === popupProgress){
      closeProgressPopup();
    }
  });

});