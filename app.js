
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ================= SUPABASE CONFIG =================

const SUPABASE_URL = "https://wvnalshqfnjfgyymhzji.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_s2A0q8-Cs-ND-7FiOTAs7g_7AFS7XqI";

const BUCKET_NAME = "documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// ================= COMMON HELPERS =================

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "info") {
  const el = $("uploadMessage");
  if (!el) return;

  el.textContent = message;
  el.style.color =
    type === "error" ? "#ff7777" :
    type === "success" ? "#65e6a5" : "";
}

function showAuthMessage(message) {
  const el = $("authMessage");
  if (el) el.textContent = message;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// ================= AUTH MODAL =================

function createAuthModal() {
  if ($("authModal")) return;

  const modal = document.createElement("div");
  modal.id = "authModal";

  modal.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#07101eef;" +
    "display:none;align-items:center;justify-content:center;padding:20px;";

  modal.innerHTML = `
    <div style="background:#111a30;color:white;width:100%;max-width:420px;
      box-sizing:border-box;padding:24px;border-radius:18px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 id="authTitle">Login</h2>
        <button id="authClose" type="button" aria-label="Close"
          style="font-size:25px;background:none;color:white;border:0">×</button>
      </div>

      <p id="authDescription">Log in to Parsh.online.</p>

      <form id="authForm">
        <label for="authEmail">Email address</label>
        <input id="authEmail" type="email" required autocomplete="email"
          placeholder="you@example.com"
          style="width:100%;box-sizing:border-box;padding:13px;margin:8px 0;
          border-radius:8px;font-size:16px">

        <label for="authPassword">Password</label>
        <input id="authPassword" type="password" required minlength="6"
          autocomplete="current-password" placeholder="Your password"
          style="width:100%;box-sizing:border-box;padding:13px;margin:8px 0;
          border-radius:8px;font-size:16px">

        <button id="forgotPassword" type="button"
          style="display:block;margin:0 0 16px auto;background:none;
          border:0;color:#b5a5ff;cursor:pointer;font-size:14px">
          Forgot Password?
        </button>

        <p id="authMessage" role="status" style="overflow-wrap:anywhere"></p>

        <button id="authSubmit" type="submit"
          style="width:100%;padding:14px;background:#8065f5;color:white;
          border:0;border-radius:9px;font-size:16px">Login</button>
      </form>

      <p>
        <button id="authSwitch" type="button"
          style="background:none;border:0;color:#b5a5ff;cursor:pointer">
          Create account
        </button>
      </p>
    </div>`;

  document.body.appendChild(modal);

  let mode = "login";

  function setMode(next) {
    mode = next;

    $("authTitle").textContent =
      mode === "login" ? "Login" : "Create your account";

    $("authDescription").textContent =
      mode === "login"
        ? "Log in to your personal document locker."
        : "Create an account to keep your documents private.";

    $("authSubmit").textContent =
      mode === "login" ? "Login" : "Create account";

    $("authSwitch").textContent =
      mode === "login" ? "New to Parsh.online? Create account" :
      "Already registered? Login";

    $("authPassword").autocomplete =
      mode === "login" ? "current-password" : "new-password";

    $("forgotPassword").style.display =
      mode === "login" ? "block" : "none";

    showAuthMessage("");
  }

  window.showLogin = function () {
    setMode("login");
    modal.style.display = "flex";
  };

  window.showSignup = function () {
    setMode("signup");
    modal.style.display = "flex";
  };

  $("authClose").onclick = () => {
    modal.style.display = "none";
  };

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.style.display = "none";
  });

  $("authSwitch").onclick = () => {
    setMode(mode === "login" ? "signup" : "login");
  };

  // Forgot Password
  $("forgotPassword").addEventListener("click", async () => {
    const email = $("authEmail").value.trim();

    if (!email) {
      showAuthMessage("पहले अपना registered email डालो।");
      $("authEmail").focus();
      return;
    }

    const button = $("forgotPassword");
    button.disabled = true;

    try {
      const redirectTo = new URL(
        "reset-password.html",
        window.location.href
      ).href;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) throw error;

      showAuthMessage(
        "अगर इस ईमेल पर अकाउंट है, तो Inbox और Spam में reset link चेक करो।"
      );
    } catch (error) {
      showAuthMessage(error.message || "Reset email नहीं भेजा जा सका।");
    } finally {
      button.disabled = false;
    }
  });

  // Login and Signup
  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const button = $("authSubmit");

    button.disabled = true;
    showAuthMessage("Please wait...");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/"
          }
        });

        if (error) throw error;

        if (data.session) {
          window.location.href = "dashboard.html";
        } else {
          showAuthMessage(
            "Account request successful. Email confirmation के लिए अपना Inbox चेक करो।"
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        window.location.href = "dashboard.html";
      }
    } catch (error) {
      showAuthMessage(error.message || "Authentication failed.");
    } finally {
      button.disabled = false;
    }
  });
}

// ================= PASSWORD RESET PAGE =================

async function initPasswordResetPage() {
  const form = $("resetForm");
  if (!form) return;

  const message = $("resetMessage");
  const button = $("resetButton");

  // Wait for Supabase to process the recovery URL.
  let recoverySession = false;

  const { data: initialData, error: sessionError } =
    await supabase.auth.getSession();

  if (!sessionError && initialData.session) {
    recoverySession = true;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      recoverySession = true;
      message.textContent = "अब नया पासवर्ड सेट कर सकते हैं।";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (password.length < 8) {
      message.textContent = "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।";
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = "दोनों पासवर्ड एक जैसे नहीं हैं।";
      return;
    }

    if (!recoverySession) {
      message.textContent =
        "Reset link expire हो सकता है। Login पेज से नया लिंक माँगें।";
      return;
    }

    button.disabled = true;
    button.textContent = "Updating...";
    message.textContent = "";

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      message.textContent =
        "पासवर्ड बदल गया! अब Login पेज पर जाकर लॉगिन कर सकते हैं।";

      form.reset();
    } catch (error) {
      message.textContent = error.message || "पासवर्ड बदल नहीं पाया।";
    } finally {
      button.disabled = false;
      button.textContent = "Update Password";
    }
  });
}

// ================= DOCUMENT LOCKER =================

async function loadDocuments() {
  const list = $("documentList");
  if (!list) return;

  list.innerHTML = "<p>Loading documents...</p>";

  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    window.parshDocuments = data || [];
    renderDocuments();
  } catch (error) {
    list.innerHTML =
      `<p>Documents load नहीं हुए: ${escapeHTML(error.message)}</p>`;
  }
}

function renderDocuments() {
  const list = $("documentList");
  if (!list) return;

  const query = ($("searchDocuments")?.value || "").trim().toLowerCase();

  const documents = (window.parshDocuments || []).filter((doc) =>
    String(doc.name || "").toLowerCase().includes(query)
  );

  if ($("documentCount")) {
    $("documentCount").textContent =
      `${documents.length} document${documents.length === 1 ? "" : "s"}`;
  }

  if (!documents.length) {
    list.innerHTML = "<p>No documents found. Upload your first document.</p>";
    return;
  }

  list.innerHTML = documents.map((doc) => `
    <article style="padding:14px;margin:12px 0;border:1px solid #39435c;
      border-radius:12px;overflow-wrap:anywhere">
      <strong>${escapeHTML(doc.name)}</strong>
      <p style="font-size:13px;opacity:.8">
        ${escapeHTML(doc.file_path.split("/").pop())}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button type="button" data-action="view"
          data-id="${escapeHTML(doc.id)}">View / Download</button>
        <button type="button" data-action="delete"
          data-id="${escapeHTML(doc.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

async function viewDocument(id) {
  try {
    const doc = (window.parshDocuments || []).find(
      (item) => String(item.id) === String(id)
    );

    if (!doc) throw new Error("Document नहीं मिला।");

    const user = await getCurrentUser();

    if (doc.user_id !== user.id) {
      throw new Error("इस document को access करने की अनुमति नहीं है।");
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.file_path, 60);

    if (error) throw error;

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    showMessage(error.message || "Document नहीं खुल पाया।", "error");
  }
}

async function deleteDocument(id) {
  const doc = (window.parshDocuments || []).find(
    (item) => String(item.id) === String(id)
  );

  if (!doc) return;

  if (!confirm(`"${doc.name}" को delete करना चाहते हो?`)) return;

  try {
    const user = await getCurrentUser();

    if (doc.user_id !== user.id) {
      throw new Error("इस document को delete करने की अनुमति नहीं है।");
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.file_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id)
      .eq("user_id", user.id);

    if (dbError) {
      throw new Error(
        "File हट गई, लेकिन database record नहीं हट पाया: " + dbError.message
      );
    }

    showMessage("Document delete हो गया।", "success");
    await loadDocuments();
  } catch (error) {
    showMessage(error.message || "Document delete नहीं हुआ।", "error");
  }
}

async function uploadDocument(event) {
  event.preventDefault();

  const nameInput = $("documentName");
  const fileInput = $("documentFile");
  const button = $("uploadButton");

  if (!nameInput || !fileInput || !fileInput.files?.length) {
    showMessage("Document का नाम और file दोनों चुनो।", "error");
    return;
  }

  const name = nameInput.value.trim();
  const file = fileInput.files[0];

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!name) {
    showMessage("Document का नाम लिखो।", "error");
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    showMessage("सिर्फ PDF, JPG, PNG या WEBP file अपलोड करो।", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showMessage("File 10 MB से छोटी होनी चाहिए।", "error");
    return;
  }

  button.disabled = true;
  showMessage("Uploading...");

  try {
    const user = await getCurrentUser();

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath =
      `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name,
        file_path: filePath
      });

    if (insertError) {
      // Clean up the uploaded file if the database insert fails.
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      throw insertError;
    }

    nameInput.value = "";
    fileInput.value = "";

    showMessage("Document सफलतापूर्वक सेव हो गया।", "success");
    await loadDocuments();
  } catch (error) {
    showMessage(error.message || "Upload नहीं हो पाया।", "error");
  } finally {
    button.disabled = false;
  }
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("Logout नहीं हो पाया: " + error.message);
    return;
  }

  window.location.href = "index.html";
}

// ================= STARTUP =================

async function initApp() {
  createAuthModal();

  if ($("resetForm")) {
    await initPasswordResetPage();
    return;
  }

  if ($("uploadForm")) {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      window.location.href = "index.html";
      return;
    }

    $("uploadForm").addEventListener("submit", uploadDocument);

    $("searchDocuments")?.addEventListener("input", renderDocuments);

    $("documentList")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      if (button.dataset.action === "view") {
        await viewDocument(button.dataset.id);
      }

      if (button.dataset.action === "delete") {
        await deleteDocument(button.dataset.id);
      }
    });

    $("logoutButton")?.addEventListener("click", logout);

    await loadDocuments();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
