import { useState } from "react";
import API from "../services/api";
import { toast } from "react-toastify";

const UPI_ID = "foodorder@upi";
const PAYEE_NAME = "FoodOrder App";
const QUICK_AMOUNTS = [200, 500, 1000, 2000];

function Steps({ step }) {
  const items = ["Pay", "Upload proof"];
  return (
    <div className="flex items-center gap-2">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                active || done ? "bg-white text-indigo-700" : "bg-white/20 text-white"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={`text-xs font-semibold ${active ? "text-white" : "text-indigo-200"}`}>{label}</span>
            {n < items.length && <span className="mx-1 h-px w-6 bg-white/30" />}
          </div>
        );
      })}
    </div>
  );
}

export default function PaymentModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [showPay, setShowPay] = useState(true);
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");

    const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(
      PAYEE_NAME
    )}&am=${amount}&cu=INR`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = upiUrl;
      setTimeout(() => {
        setShowPay(false);
      }, 1500);
    } else {
      toast.info("On Laptop, please scan the QR code below using your phone to pay.", {
        autoClose: 5000,
      });
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID Copied!");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please upload payment screenshot");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("amount", amount);
      fd.append("screenshot", file);
      await API.post("/payments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Payment submitted, awaiting confirmation");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[96dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* ---------- header ---------- */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-5 pb-5 pt-4 text-white">
          <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold leading-tight">Make Payment</h2>
              <p className="mt-0.5 text-xs text-indigo-100">
                {showPay ? "Pay by UPI, then upload the screenshot" : "Upload your payment proof"}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl leading-none transition hover:bg-white/25"
            >
              ×
            </button>
          </div>
          <div className="relative z-10 mt-4">
            <Steps step={showPay ? 1 : 2} />
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {showPay ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <img
                  src="/imgs/qr.png"
                  alt="QR"
                  className="mb-3 h-44 w-44 rounded-xl bg-white object-contain p-2 shadow-sm ring-1 ring-slate-200"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150?text=QR+Code";
                  }}
                />
                <p className="mb-2 text-center text-sm text-slate-500">Scan to Pay or use UPI ID</p>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                  <span className="text-sm font-bold text-slate-900">{UPI_ID}</span>
                  <button
                    onClick={copyUpiId}
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="pay-amount" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Enter Amount (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    id="pay-amount"
                    type="number"
                    placeholder="e.g. 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-4 text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        String(amount) === String(v)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      ₹{v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePay}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98]"
                >
                  Pay with GPay / UPI
                </button>

                <button
                  onClick={() => setShowPay(false)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  I have already paid, Upload Screenshot
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                If you are on a laptop, clicking "Pay" might not open GPay. Please scan the QR code instead.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-5">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-center text-sm text-indigo-900">
                  Paid amount: <b>₹{amount}</b>
                </p>
                <p className="mt-1 text-center text-xs text-indigo-600">
                  Please upload the screenshot of your payment.
                </p>
              </div>

              <div>
                <label htmlFor="pay-file" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Upload Screenshot
                </label>
                <input
                  id="pay-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Submit Payment Proof"}
              </button>
              <button
                type="button"
                onClick={() => setShowPay(true)}
                className="w-full text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
              >
                ← Go Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}