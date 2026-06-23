
export function openStaffApply() {
  if (document.getElementById("staffModal")) return;

  const modal = document.createElement("div");
  modal.id = "staffModal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.7)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div style="
      background:#1a1a1a;
      padding:20px;
      border-radius:12px;
      width:90%;
      max-width:400px;
      color:white;
      font-family:Arial;
    ">
      <h2 style="text-align:center;">🛡️ Staff Apply</h2>

      <input id="staffName" placeholder="Username"
        style="width:100%;padding:10px;margin:5px 0;">

      <input id="staffEmail" placeholder="Email"
        style="width:100%;padding:10px;margin:5px 0;">

      <textarea id="staffReason" placeholder="Why do you want staff?"
        style="width:100%;padding:10px;height:120px;margin:5px 0;"></textarea>

      <button id="staffSubmitBtn"
        style="width:100%;padding:10px;margin-top:10px;background:#4c5cff;color:white;border:none;">
        Submit
      </button>

      <button id="staffCloseBtn"
        style="width:100%;padding:10px;margin-top:10px;background:#333;color:white;border:none;">
        Close
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("staffCloseBtn").onclick = closeStaffApply;
  document.getElementById("staffSubmitBtn").onclick = submitStaff;
}

export function closeStaffApply() {
  const modal = document.getElementById("staffModal");
  if (modal) modal.remove();
}

export function submitStaff() {
  const name = document.getElementById("staffName").value;
  const email = document.getElementById("staffEmail").value;
  const reason = document.getElementById("staffReason").value;

  if (!name || !email || !reason) {
    alert("Fill all fields!");
    return;
  }

  const app = {
    name,
    email,
    reason,
    time: new Date().toISOString()
  };

  let apps = JSON.parse(localStorage.getItem("staffApps") || "[]");
  apps.push(app);
  localStorage.setItem("staffApps", JSON.stringify(apps));

  alert("Application sent!");
  closeStaffApply();
}
