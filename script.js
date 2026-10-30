const toggle = document.querySelector("[data-theme-toggle]");
const toggleLabel = toggle?.querySelector(".theme-toggle-label") ?? null;
const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks
  .map((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return null;
    return document.querySelector(href);
  })
  .filter(Boolean);

const applyTheme = (theme) => {
  if (!toggle) return;

  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  toggle.dataset.themeToggle = isLight ? "light" : "dark";
  toggle.setAttribute(
    "aria-label",
    isLight ? "다크 모드로 전환" : "라이트 모드로 전환"
  );

  if (toggleLabel) {
    toggleLabel.textContent = isLight ? "Dark" : "Light";
  }

  try {
    localStorage.setItem("theme", isLight ? "light" : "dark");
  } catch {
    /* private mode 등에서 storage 접근 실패 시 무시 */
  }
};

const readStoredTheme = () => {
  try {
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

applyTheme(readStoredTheme());

if (toggle) {
  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

if (sections.length > 0 && navLinks.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
        if (isCurrent) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-35% 0px -50% 0px", threshold: [0.2, 0.4, 0.7] }
  );

  sections.forEach((section) => observer.observe(section));
}

const openModalTriggers = [...document.querySelectorAll("[data-modal-open]")];
let lastModalTrigger = null;

const openStrengthModal = (modalId, trigger) => {
  const dialog = document.getElementById(modalId);
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (typeof dialog.showModal !== "function") return;

  lastModalTrigger = trigger ?? null;
  dialog.showModal();

  const closeButton = dialog.querySelector("[data-modal-close]");
  if (closeButton instanceof HTMLElement) {
    closeButton.focus();
  }
};

const closeStrengthModal = (dialog) => {
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  }

  if (lastModalTrigger instanceof HTMLElement) {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
};

const isActivateKey = (event) =>
  event.key === "Enter" || event.key === " " || event.key === "Spacebar";

openModalTriggers.forEach((trigger) => {
  const modalId = trigger.getAttribute("data-modal-open");
  if (!modalId) return;

  const open = () => openStrengthModal(modalId, trigger);

  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", (event) => {
    if (!isActivateKey(event)) return;
    event.preventDefault();
    open();
  });
});

document.querySelectorAll("dialog.strength-modal").forEach((dialog) => {
  dialog.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeStrengthModal(dialog));
    button.addEventListener("keydown", (event) => {
      if (!isActivateKey(event)) return;
      event.preventDefault();
      closeStrengthModal(dialog);
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeStrengthModal(dialog);
    }
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStrengthModal(dialog);
  });
});

/* —— Private area: fetch after auth only (no hardcoded secrets) —— */
const PRIVATE_ITEM_META = [
  {
    key: "project_notes",
    kicker: "In progress",
    title: "준비 중인 프로젝트 메모",
  },
  {
    key: "target_companies",
    kicker: "Targets",
    title: "타겟 회사 목록",
  },
  {
    key: "reflection",
    kicker: "Reflection",
    title: "스스로 쓰는 회고",
  },
];

const privateSection = document.querySelector("[data-private-section]");
const privateGate = document.querySelector("[data-private-gate]");
const privateStatus = document.querySelector("[data-private-status]");
const privateError = document.querySelector("[data-private-error]");
const privateContent = document.querySelector("[data-private-content]");
const privateSession = document.querySelector("[data-private-session]");
const privateSessionLabel = document.querySelector(
  "[data-private-session-label]"
);
const privateAuthForm = document.querySelector("[data-private-auth-form]");
const privateProbeBtn = document.querySelector("[data-private-probe]");
const privateSignOutBtn = document.querySelector("[data-private-sign-out]");
const passkeyRegisterBtn = document.querySelector("[data-passkey-register]");
const passkeyPanel = document.querySelector("[data-passkey-panel]");
const passkeyList = document.querySelector("[data-passkey-list]");
const passkeyStatus = document.querySelector("[data-passkey-status]");
const passkeyEmptyWarning = document.querySelector(
  "[data-passkey-empty-warning]"
);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const setPrivateError = (message) => {
  if (!(privateError instanceof HTMLElement)) return;
  if (!message) {
    privateError.hidden = true;
    privateError.textContent = "";
    return;
  }
  privateError.hidden = false;
  privateError.textContent = message;
};

const setPrivateStatus = (message) => {
  if (privateStatus instanceof HTMLElement) {
    privateStatus.textContent = message;
  }
};

const clearPrivateContent = () => {
  if (!(privateContent instanceof HTMLElement)) return;
  privateContent.replaceChildren();
  privateContent.hidden = true;
};

const renderPrivateContent = (row) => {
  if (!(privateContent instanceof HTMLElement)) return;

  const grid = document.createElement("div");
  grid.className = "private-grid";
  grid.setAttribute("role", "list");

  PRIVATE_ITEM_META.forEach((meta) => {
    const body = row?.[meta.key];
    if (typeof body !== "string" || body.trim() === "") return;

    const article = document.createElement("article");
    article.className = "private-card";
    article.setAttribute("role", "listitem");
    article.innerHTML = `
      <p class="private-kicker">${escapeHtml(meta.kicker)}</p>
      <h3>${escapeHtml(meta.title)}</h3>
      <p class="private-body">${escapeHtml(body).replaceAll("\n", "<br>")}</p>
    `;
    grid.appendChild(article);
  });

  privateContent.replaceChildren(grid);
  privateContent.hidden = false;
};

const setPasskeyStatus = (message) => {
  if (passkeyStatus instanceof HTMLElement) {
    passkeyStatus.textContent = message || "";
  }
};

const clearPasskeyPanel = () => {
  if (passkeyList instanceof HTMLElement) passkeyList.replaceChildren();
  if (passkeyPanel instanceof HTMLElement) passkeyPanel.hidden = true;
  if (passkeyEmptyWarning instanceof HTMLElement) {
    passkeyEmptyWarning.hidden = true;
  }
  setPasskeyStatus("");
};

const showLockedGate = () => {
  if (privateGate instanceof HTMLElement) privateGate.hidden = false;
  if (privateSession instanceof HTMLElement) privateSession.hidden = true;
  clearPrivateContent();
  clearPasskeyPanel();
};

const showUnlockedSession = (email) => {
  if (privateGate instanceof HTMLElement) privateGate.hidden = true;
  if (privateSession instanceof HTMLElement) privateSession.hidden = false;
  if (privateSessionLabel instanceof HTMLElement) {
    privateSessionLabel.textContent = email
      ? `${email} 로 인증됨`
      : "인증됨";
  }
  if (passkeyPanel instanceof HTMLElement) passkeyPanel.hidden = false;
};

const createSupabaseClient = () => {
  const config = window.SUPABASE_CONFIG;
  const createClient = window.supabase?.createClient;

  if (typeof createClient !== "function") {
    throw new Error("Supabase JS SDK를 불러오지 못했습니다.");
  }
  if (
    !config?.url ||
    !config?.anonKey ||
    config.url.includes("YOUR_SUPABASE") ||
    config.anonKey.includes("YOUR_SUPABASE")
  ) {
    throw new Error(
      "supabase-config.js 에 프로젝트 URL과 anon key를 넣어 주세요."
    );
  }

  return createClient(config.url, config.anonKey);
};

let supabaseClient = null;

const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
};

/**
 * 비공개 프로필 조회.
 * - user_id 를 클라이언트가 지정하지 않음 (위조·타인 조희 방지)
 * - 행 필터는 서버 RLS(auth.uid() = user_id)만 적용
 * - 비로그인(anon): GRANT 없음 → 401/403
 * - 타인 토큰/내 토큰으로 남의 행: RLS 로 행 미반환
 */
const fetchPrivateProfile = async (client) => {
  const { data, error, status } = await client
    .from("private_profile")
    .select("project_notes, target_companies, reflection")
    .maybeSingle();

  return { data, error, status };
};

const describeFetchFailure = ({ error, status }) => {
  const code = status || error?.status || error?.code;
  const message = error?.message || "요청이 거절되었습니다.";

  if (status === 401 || status === 403 || code === "42501" || code === "PGRST301") {
    return `서버 차단 (${status || code}): ${message}`;
  }
  if (error) {
    return `불러오기 실패${status ? ` (${status})` : ""}: ${message}`;
  }
  return "비공개 데이터가 없습니다. SQL 시드를 확인하세요.";
};

const loadPrivateArea = async (session) => {
  setPrivateError("");
  setPrivateStatus("인증 확인 후 비공개 데이터를 요청하는 중…");

  try {
    const client = getSupabase();
    const result = await fetchPrivateProfile(client);

    if (result.error || !result.data) {
      showLockedGate();
      setPrivateError(describeFetchFailure(result));
      setPrivateStatus("잠금 상태입니다. 권한이 있는 계정으로 다시 시도하세요.");
      return;
    }

    showUnlockedSession(session?.user?.email ?? null);
    renderPrivateContent(result.data);
    setPrivateStatus("비공개 데이터를 서버에서 받아 렌더링했습니다.");
    await loadPasskeys();
  } catch (err) {
    showLockedGate();
    setPrivateError(err instanceof Error ? err.message : String(err));
    setPrivateStatus("잠금 상태입니다.");
  }
};

const probeUnauthenticatedFetch = async () => {
  setPrivateError("");
  setPrivateStatus("세션 없이 private_profile 을 요청합니다…");

  try {
    const client = getSupabase();
    await client.auth.signOut({ scope: "local" });

    const result = await fetchPrivateProfile(client);

    if (result.error || result.status === 401 || result.status === 403) {
      showLockedGate();
      clearPrivateContent();
      setPrivateError(describeFetchFailure(result));
      setPrivateStatus(
        "비로그인 요청이 서버에서 거절되었습니다. (소스에 비밀 데이터 없음)"
      );
      return;
    }

    // RLS가 빈 배열만 돌려주는 설정이면 본문이 비어 있어야 함
    if (!result.data) {
      showLockedGate();
      clearPrivateContent();
      setPrivateError(
        `비로그인 응답 status=${result.status ?? "n/a"} — 행이 반환되지 않음 (RLS).`
      );
      setPrivateStatus("잠금 유지: 비공개 본문을 DOM에 넣지 않았습니다.");
      return;
    }

    showLockedGate();
    clearPrivateContent();
    setPrivateError(
      "경고: 비로그인인데 데이터가 왔습니다. REVOKE anon / RLS 정책을 점검하세요."
    );
  } catch (err) {
    showLockedGate();
    setPrivateError(err instanceof Error ? err.message : String(err));
  }
};

/** localhost 또는 https 에서만 WebAuthn 허용 */
const assertPasskeySecureContext = () => {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const isHttps = window.location.protocol === "https:";

  if (!window.isSecureContext || (!isLocal && !isHttps)) {
    throw new Error(
      "패스키는 주소창이 localhost(또는 127.0.0.1)이거나 https 일 때만 동작합니다."
    );
  }

  if (typeof window.PublicKeyCredential === "undefined") {
    throw new Error("이 브라우저는 WebAuthn(패스키)을 지원하지 않습니다.");
  }
};

const getSimpleWebAuthnBrowser = () => {
  const browserApi =
    window.SimpleWebAuthnBrowser || window.simplewebauthn || null;
  if (!browserApi) {
    throw new Error("SimpleWebAuthn browser 라이브러리를 불러오지 못했습니다.");
  }
  return browserApi;
};

const getStartRegistration = () => {
  const startRegistration = getSimpleWebAuthnBrowser().startRegistration;
  if (typeof startRegistration !== "function") {
    throw new Error("startRegistration 을 사용할 수 없습니다.");
  }
  return startRegistration;
};

const getStartAuthentication = () => {
  const startAuthentication = getSimpleWebAuthnBrowser().startAuthentication;
  if (typeof startAuthentication !== "function") {
    throw new Error("startAuthentication 을 사용할 수 없습니다.");
  }
  return startAuthentication;
};

const setPasskeyEmptyWarning = (visible) => {
  if (passkeyEmptyWarning instanceof HTMLElement) {
    passkeyEmptyWarning.hidden = !visible;
  }
};

const renderPasskeyList = (rows) => {
  if (!(passkeyList instanceof HTMLElement)) return;
  passkeyList.replaceChildren();

  const list = rows ?? [];
  setPasskeyEmptyWarning(list.length === 0);

  if (!list.length) {
    const empty = document.createElement("li");
    empty.textContent = "표시할 패스키가 없습니다.";
    passkeyList.appendChild(empty);
    return;
  }

  list.forEach((row) => {
    const li = document.createElement("li");
    li.dataset.passkeyId = row.id;

    const meta = document.createElement("div");
    meta.className = "passkey-list-meta";

    const nameEl = document.createElement("strong");
    nameEl.textContent = row.device_name || "(이름 없음)";

    const dateEl = document.createElement("span");
    dateEl.className = "passkey-list-date";
    dateEl.textContent = row.created_at
      ? `등록일: ${new Date(row.created_at).toLocaleString("ko-KR")}`
      : "등록일: —";

    meta.append(nameEl, dateEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "private-btn private-btn--danger";
    deleteBtn.dataset.passkeyDelete = row.id;
    deleteBtn.textContent = "삭제";

    li.append(meta, deleteBtn);
    passkeyList.appendChild(li);
  });
};

const loadPasskeys = async () => {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("passkeys")
      .select("id, device_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setPasskeyStatus(`패스키 목록: ${error.message}`);
      return;
    }

    renderPasskeyList(data ?? []);
  } catch (err) {
    setPasskeyStatus(err instanceof Error ? err.message : String(err));
  }
};

const deletePasskey = async (passkeyId) => {
  setPrivateError("");
  setPasskeyStatus("패스키 삭제 중…");

  try {
    const client = getSupabase();
    const { data: rows, error: listError } = await client
      .from("passkeys")
      .select("id")
      .order("created_at", { ascending: false });

    if (listError) {
      throw new Error(listError.message);
    }

    const count = rows?.length ?? 0;
    if (count <= 1) {
      const ok = window.confirm(
        "마지막 패스키를 지우면 더 이상 로그인할 수 없습니다. 정말 지우시겠습니까?"
      );
      if (!ok) {
        setPasskeyStatus("삭제를 취소했습니다.");
        return;
      }
    } else {
      const ok = window.confirm("이 패스키를 삭제할까요?");
      if (!ok) {
        setPasskeyStatus("삭제를 취소했습니다.");
        return;
      }
    }

    // RLS: auth.uid() = user_id 인 본인 행만 삭제됨 (타인 id 는 0행)
    const { data: deleted, error: deleteError } = await client
      .from("passkeys")
      .delete()
      .eq("id", passkeyId)
      .select("id");

    if (deleteError) {
      throw new Error(deleteError.message);
    }
    if (!deleted?.length) {
      throw new Error(
        "삭제되지 않았습니다. 본인 패스키가 아니거나 이미 없는 키입니다. (RLS)"
      );
    }

    setPasskeyStatus("패스키를 삭제했습니다.");
    await loadPasskeys();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setPrivateError(message);
    setPasskeyStatus("패스키 삭제에 실패했습니다.");
  }
};

/**
 * 카드 2: 서버 챌린지 → navigator.credentials.create → 공개키만 서버 저장
 * 개인키는 WebAuthn 표준상 브라우저/기기를 벗어나지 않음.
 */
const registerPasskey = async () => {
  setPrivateError("");
  setPasskeyStatus("등록용 챌린지를 서버에 요청하는 중…");

  try {
    assertPasskeySecureContext();

    const client = getSupabase();
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) {
      throw new Error("패스키 등록 전에 로그인해 주세요.");
    }

    const { data: optionPayload, error: optionError } =
      await client.functions.invoke("webauthn-register-options", {
        body: {},
      });

    if (optionError) {
      throw new Error(optionError.message || "챌린지 요청에 실패했습니다.");
    }
    if (optionPayload?.error) {
      throw new Error(optionPayload.error);
    }

    const options = optionPayload?.options;
    if (!options?.challenge) {
      throw new Error("서버가 등록용 챌린지를 반환하지 않았습니다.");
    }

    const excluded = Number(optionPayload?.excludedCount ?? 0);
    setPasskeyStatus(
      excluded > 0
        ? `이미 등록된 패스키 ${excluded}개를 제외하고 새 등록 창을 엽니다…`
        : "브라우저 패스키 등록 창을 여는 중…"
    );

    const startRegistration = getStartRegistration();
    let attestation;

    try {
      // 내부적으로 navigator.credentials.create() 호출
      attestation = await startRegistration({ optionsJSON: options });
    } catch (createErr) {
      const name = createErr?.name || "";
      // 사용자가 등록을 중간에 취소 → 서버에 아무것도 저장하지 않음
      if (
        name === "NotAllowedError" ||
        name === "AbortError" ||
        /cancel|denied|abort/i.test(String(createErr?.message || ""))
      ) {
        window.alert("패스키 등록이 취소되었습니다.");
        setPasskeyStatus("등록이 취소되어 서버에 저장하지 않았습니다.");
        return;
      }
      throw createErr;
    }

    const deviceName = window.prompt(
      "이 패스키의 이름을 정해주세요 (예: 내 아이폰, 사무실 맥북)",
      ""
    );

    if (!deviceName || !deviceName.trim()) {
      window.alert("이름이 없어 패스키를 저장하지 않습니다.");
      setPasskeyStatus("이름 입력이 취소되어 공개키를 저장하지 않았습니다.");
      return;
    }

    setPasskeyStatus("공개키와 credential ID를 서버에 저장하는 중…");

    const { data: verifyPayload, error: verifyError } =
      await client.functions.invoke("webauthn-register-verify", {
        body: {
          credential: attestation,
          deviceName: deviceName.trim(),
        },
      });

    if (verifyError) {
      throw new Error(verifyError.message || "패스키 검증에 실패했습니다.");
    }
    if (verifyPayload?.error) {
      throw new Error(verifyPayload.error);
    }

    setPasskeyStatus(
      `「${deviceName.trim()}」 패스키가 등록되었습니다. (공개키만 DB 저장)`
    );
    await loadPasskeys();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setPrivateError(message);
    setPasskeyStatus("패스키 등록에 실패했습니다.");
  }
};

/**
 * 카드 3: 로그인 챌린지 → navigator.credentials.get → 공개키 검증 → JWT 세션
 */
const loginWithPasskey = async (email) => {
  assertPasskeySecureContext();

  const client = getSupabase();
  setPrivateStatus("로그인용 챌린지를 서버에 요청하는 중…");

  const { data: optionPayload, error: optionError } =
    await client.functions.invoke("webauthn-login-options", {
      body: { email },
    });

  if (optionError) {
    throw new Error(optionError.message || "로그인 챌린지 요청에 실패했습니다.");
  }
  if (optionPayload?.error) {
    throw new Error(optionPayload.error);
  }

  const options = optionPayload?.options;
  if (!options?.challenge) {
    throw new Error("서버가 로그인용 챌린지를 반환하지 않았습니다.");
  }

  setPrivateStatus("기기에서 패스키 서명을 요청하는 중…");

  const startAuthentication = getStartAuthentication();
  let assertion;

  try {
    // 내부적으로 navigator.credentials.get() 호출 — 개인키는 기기를 벗어나지 않음
    assertion = await startAuthentication({ optionsJSON: options });
  } catch (getErr) {
    const name = getErr?.name || "";
    if (
      name === "NotAllowedError" ||
      name === "AbortError" ||
      /cancel|denied|abort/i.test(String(getErr?.message || ""))
    ) {
      window.alert("패스키 로그인이 취소되었습니다.");
      setPrivateStatus("잠금 상태입니다. 로그인이 취소되었습니다.");
      return null;
    }
    throw getErr;
  }

  setPrivateStatus("서버에서 공개키로 서명을 검증하는 중…");

  const { data: verifyPayload, error: verifyError } =
    await client.functions.invoke("webauthn-login-verify", {
      body: { credential: assertion },
    });

  // functions.invoke 는 비-2xx 를 error 로 올림 — 401 본문 메시지 추출
  if (verifyError) {
    let detail = verifyError.message || "서명 검증에 실패했습니다.";
    try {
      const ctx = verifyError.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch {
      /* ignore */
    }
    const err = new Error(detail);
    err.status = 401;
    throw err;
  }
  if (verifyPayload?.error) {
    const err = new Error(verifyPayload.error);
    err.status = 401;
    throw err;
  }
  if (!verifyPayload?.token_hash) {
    throw new Error("서버가 로그인 토큰을 발급하지 않았습니다.");
  }

  setPrivateStatus("검증 성공 — 세션(JWT) 발급 중…");

  const { data: otpData, error: otpError } = await client.auth.verifyOtp({
    token_hash: verifyPayload.token_hash,
    type: verifyPayload.type || "email",
  });

  if (otpError) {
    throw new Error(otpError.message || "세션 발급에 실패했습니다.");
  }

  return otpData.session;
};

if (privateSection) {
  passkeyRegisterBtn?.addEventListener("click", () => {
    void registerPasskey();
  });

  passkeyList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.getAttribute("data-passkey-delete");
    if (!id) return;
    void deletePasskey(id);
  });

  privateAuthForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setPrivateError("");

    const formData = new FormData(privateAuthForm);
    const email = String(formData.get("email") || "").trim();

    try {
      const session = await loginWithPasskey(email);
      if (!session) return;
      await loadPrivateArea(session);
    } catch (err) {
      setPrivateError(err instanceof Error ? err.message : String(err));
      setPrivateStatus("잠금 상태입니다. 패스키 로그인에 실패했습니다.");
    }
  });

  privateProbeBtn?.addEventListener("click", () => {
    void probeUnauthenticatedFetch();
  });

  privateSignOutBtn?.addEventListener("click", async () => {
    try {
      const client = getSupabase();
      // 로컬·서버 세션(JWT) 모두 폐기 → 이후 비공개 요청은 401/403
      await client.auth.signOut({ scope: "global" });
    } catch {
      try {
        await getSupabase().auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    }
    showLockedGate();
    setPrivateError("");
    setPrivateStatus(
      "로그아웃되었습니다. 토큰이 회수되어 비공개 요청은 거절됩니다."
    );
    setPasskeyStatus("");
  });

  // 이미 세션이 있으면 자동으로 서버에서만 로드
  void (async () => {
    try {
      const client = getSupabase();
      const { data } = await client.auth.getSession();
      if (data.session) {
        await loadPrivateArea(data.session);
      }

      client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          showLockedGate();
          setPrivateStatus("잠금 상태입니다. 로그인 후 비공개 데이터를 요청합니다.");
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          void loadPrivateArea(session);
        }
      });
    } catch (err) {
      setPrivateStatus(
        err instanceof Error
          ? err.message
          : "Supabase 설정을 확인한 뒤 잠금을 해제하세요."
      );
    }
  })();
}