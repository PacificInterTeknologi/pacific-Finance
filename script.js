
function isiTanggalOtomatis() {
  const now = new Date();
  const formatted = now.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById("tanggal").value = formatted;
  document.getElementById("tanggal-print").textContent = formatted;
}
function generateNoInvoice() {
  const kodeLayanan = document.getElementById("kodeLayanan").value || "JS";
  const nomorUrut = document.getElementById("nomorInvoice").value || "1";
  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const nomorFormatted = String(nomorUrut).padStart(3, '0');

  const noInvoice = `PI-${kodeLayanan}/${tahun}/${bulan}/${nomorFormatted}`;
  document.getElementById("no-invoice").value = noInvoice;
  document.getElementById("no-invoice-print").textContent = noInvoice;
}

function hitungTotal() {
  let total = 0;
  const rows = document.querySelectorAll("#itemTable tbody tr");
  rows.forEach(row => {
    const jumlah = parseFloat(row.querySelector(".jumlah").value) || 0;
    const harga = parseFloat(row.querySelector(".harga").value) || 0;
    const subtotal = jumlah * harga;
    row.querySelector(".subtotal").textContent = subtotal.toLocaleString();
    const printSpan = row.querySelector(".subtotal .print-text");
    if (printSpan) printSpan.textContent = subtotal.toLocaleString();
    total += subtotal;
  });

  const diskon = parseFloat(document.getElementById("diskon").value) || 0;
  const ppn = parseFloat(document.getElementById("ppn").value) || 0;
  total = total - diskon + (total * (ppn / 100));

  document.getElementById("grandtotal").innerHTML = "<strong>Rp " + total.toLocaleString("id-ID") + "</strong>";
  document.getElementById("terbilang").textContent = toTerbilang(Math.round(total)) + " rupiah";
}

function tambahItem() {
  const tbody = document.querySelector("#itemTable tbody");
  const rows = tbody.querySelectorAll("tr");
  const row = rows[0].cloneNode(true);

  row.querySelectorAll("input").forEach(input => input.value = "");
  row.querySelectorAll(".print-text").forEach(span => span.textContent = "");
  row.querySelector(".subtotal").textContent = "0";

  if (!row.querySelector(".subtotal .print-text")) {
    const span = document.createElement("span");
    span.className = "print-text";
    span.textContent = "0";
    row.querySelector(".subtotal").appendChild(span);
  }

  const nomorBaru = rows.length + 1;
  row.cells[0].textContent = nomorBaru;

  const jumlahInput = row.querySelector(".jumlah");
  const hargaInput = row.querySelector(".harga");

  if (jumlahInput && hargaInput) {
    jumlahInput.addEventListener("input", hitungTotal);
    hargaInput.addEventListener("input", hitungTotal);
  }

  tbody.appendChild(row);
  hitungTotal();
}

function isiBank() {
  const bank = document.getElementById("bank").value;
  const norekSpan = document.getElementById("norek");
  if (bank === "Mandiri") {
    norekSpan.textContent = "1250 015 017 577";
  } else {
    norekSpan.textContent = "161 036 6666";
  }
}

function toTerbilang(nilai) {
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
  const skala = ["", "ribu", "juta", "milyar", "triliun"];
  if (nilai === 0) return "nol";
  let str = "";
  let sk = 0;
  while (nilai > 0) {
    const s = nilai % 1000;
    if (s > 0) {
      let ratusan = Math.floor(s / 100);
      let puluhan = Math.floor((s % 100) / 10);
      let satuanDigit = s % 10;
      let temp = "";
      if (ratusan > 0) temp += (ratusan === 1 ? "seratus" : satuan[ratusan] + " ratus") + " ";
      if (puluhan > 0) {
        if (puluhan === 1) {
          if (satuanDigit === 0) temp += "sepuluh ";
          else if (satuanDigit === 1) temp += "sebelas ";
          else temp += satuan[satuanDigit] + " belas ";
        } else {
          temp += satuan[puluhan] + " puluh ";
          if (satuanDigit > 0) temp += satuan[satuanDigit] + " ";
        }
      } else if (satuanDigit > 0) {
        if (satuanDigit === 1 && sk === 1) temp += "seribu ";
        else temp += satuan[satuanDigit] + " ";
      }
      str = temp + skala[sk] + " " + str;
    }
    nilai = Math.floor(nilai / 1000);
    sk++;
  }
  return str.trim();
}
window.onload = function () {
  isiTanggalOtomatis();
  hitungTotal();
  generateNoInvoice(); // ← ini penting!
};
