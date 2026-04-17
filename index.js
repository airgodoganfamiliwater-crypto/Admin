
firebase.initializeApp({
 apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
 authDomain:"klien-39696.firebaseapp.com",
 projectId:"klien-39696"
});
const auth=firebase.auth();
const db=firebase.firestore();

let adminData=null;
auth.onAuthStateChanged(async u=>{
 if(!u) return location.href="login.html";
 const doc=await db.collection("adminCabang").doc(u.uid).get();
 if(!doc.exists) return location.href="login.html";
 adminData=doc.data();
});

const tanggalInput = document.getElementById("tanggal");
const dateBox = tanggalInput.closest(".date-box");

// cek saat load (kalau sudah ada isi)
if(tanggalInput.value){
  dateBox.classList.add("filled");
}

// saat user pilih tanggal
tanggalInput.addEventListener("change", () => {
  if(tanggalInput.value){
    dateBox.classList.add("filled");
  } else {
    dateBox.classList.remove("filled");
  }
});
function formatRupiah(n){
 return "Rp "+(Number(n)||0).toLocaleString("id-ID");
}
function getRaw(id){
 return Number(document.getElementById(id).value.replace(/\./g,""))||0;
}
function formatInput(el){
 el.value = el.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
}

document.querySelectorAll("input").forEach(i=>{
 i.addEventListener("input",()=>{
  if(i.inputMode==="numeric" && !i.readOnly){
    formatInput(i);
  }
  hitung();
 });
});

function hitung(){
 const klien=getRaw("klien");
 const payKl=klien*5500;
 payKlien.value=formatRupiah(payKl);

 const salesPay=getRaw("paySales");
 const gas=getRaw("gasHarga");
 const tutup=getRaw("tutupHarga");
 const bensin=getRaw("bensinHarga");
 const listrik=getRaw("listrik");

 let lain=0;
 document.querySelectorAll(".lainHarga").forEach(i=>lain+=getRaw(i.id));

 const total=payKl+salesPay-(gas+tutup+bensin+listrik+lain);
 totalProfit.value=formatRupiah(total);
}

let lainCount=0;
function tambahLainnya(){
 lainCount++;
 const div=document.createElement("div");
 div.className="row";
 div.innerHTML=`
  <input placeholder="Keterangan">
  <input inputmode="numeric" class="lainHarga" id="lain${lainCount}" placeholder="Harga">
 `;
 document.getElementById("lainnyaBox").appendChild(div);
 div.querySelector(".lainHarga").addEventListener("input",()=>{
   formatInput(div.querySelector(".lainHarga"));
   hitung();
 });
}

function showPopup(msg){
 popupText.innerText=msg;
 popup.style.display="flex";
}
function closePopup(){popup.style.display="none";}

function isEmptyForm(){
  const tgl = document.getElementById("tanggal").value;
  return !tgl;
}

async function kirim(){

  const tanggal = document.getElementById("tanggal").value;

  if(!tanggal){
    showPopup("❌ Isi tanggal dulu!");
    return;
  }

  const user = auth.currentUser;
  if(!user){
    showPopup("❌ User belum login");
    return;
  }

  const uid = user.uid;
  const docId = uid + "_" + tanggal;

  let lainnya=[];
  let totalLain=0;

  document.querySelectorAll("#lainnyaBox .row").forEach(row=>{
    const ket=row.children[0].value;
    const harga=getRaw(row.children[1].id);
    if(ket||harga){
      lainnya.push({keterangan:ket,harga:harga});
      totalLain+=harga;
    }
  });

  const klien = getRaw("klien");
  const sales = getRaw("sales");

  const klienPay = klien * 5500;
  const salesPay = getRaw("paySales");

  const gas = getRaw("gasHarga");
  const tutup = getRaw("tutupHarga");
  const bensin = getRaw("bensinHarga");
  const listrik = getRaw("listrik");

  const totalPengeluaran = gas + tutup + bensin + listrik + totalLain;
  const totalProfit = (klienPay + salesPay) - totalPengeluaran;

  // =======================
  // 🔥 TAMBAHAN PERHITUNGAN
  // =======================

  const marginKlien = (klien * 3800) - totalPengeluaran;

  const marginAll = ((klien + sales) * 3800) - totalPengeluaran;

  const pembagianKlien =
    (klienPay - totalPengeluaran - (klien * 1500)) * 0.46;

  // =======================

  const data = {
    tanggal,
    klien,
    pembayaranKlien: klienPay,
    sales,
    pembayaranSales: salesPay,

    pengeluaran:{
      gas, tutup, bensin, listrik, lainnya, totalPengeluaran
    },

    totalProfit,

    // 🔥 FIELD BARU
    marginKlien,
    marginAll,
    pembagianKlien,

    adminUID: uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  console.log("DOC ID:", docId);
  console.log("DATA:", data);

  try{
    await db.collection("inputAdmin")
      .doc(docId)
      .set(data, { merge:true });

    showPopup("✅ Berhasil disimpan / diupdate");

    setTimeout(()=>{
      window.location.href = "riwayat.html";
    }, 800);

  }catch(e){
    console.error("FIRESTORE ERROR:", e);
    showPopup("❌ Gagal: " + e.message);
  }
}

const PASSWORD = "7890";

/* OPEN */
function openAnalisa(){
  document.getElementById("popupAnalisa").style.display = "flex";
}

/* CLOSE (klik luar) */
function closeAnalisa(e){
  if(e.target.id === "popupAnalisa"){
    document.getElementById("popupAnalisa").style.display = "none";
  }
}

/* CEK PASSWORD */
function cekPassword(){
  const input = document.getElementById("passwordAnalisa");
  const btn = document.getElementById("btnLoginAnalisa");

  const value = input.value;

  // loading state
  btn.classList.add("btn-loading");
  btn.innerText = "Loading...";

  setTimeout(() => {

    if(value === PASSWORD){
      // SUCCESS
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-success");
      btn.innerText = "Berhasil";

      setTimeout(()=>{
        window.location.href = "analis.html";
      }, 500);

    } else {
      // ERROR
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-error");
      btn.innerText = "Gagal";

      setTimeout(()=>{
        btn.classList.remove("btn-error");
        btn.innerText = "Masuk";
      }, 1000);
    }

  }, 700); // delay animasi loading
}