const queryParams = new URLSearchParams(window.location.search || "");
const apiParam = queryParams.get("api_base");
const tenantParam = queryParams.get("tenant");
const logoParam = queryParams.get("logo");
const demoParam = queryParams.get("demo");
const resetParam = queryParams.get("reset");
if (resetParam === "1") {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("assistant_") || key.startsWith("cache_")) {
      localStorage.removeItem(key);
    }
  });
  if ("caches" in window) {
    caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.location.replace(url.toString());
  } catch (err) {
    window.location.replace(window.location.pathname);
  }
}
const storedApiBase = localStorage.getItem("assistant_api_base");
const storedLogo = localStorage.getItem("assistant_logo_url");
const resolvedOrigin =
  window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "http://localhost:3001";
const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const isVercelHost = /\\.vercel\\.app$/i.test(window.location.hostname || "");
const defaultRemoteApi = "https://assistant-pme.onrender.com";
const isFileOrigin =
  window.location.protocol === "file:" || window.location.origin === "null";
const fallbackApiBase =
  !isLocalHost && !apiParam && !storedApiBase && isVercelHost ? defaultRemoteApi : "";
const API_BASE = isLocalHost
  ? resolvedOrigin
  : apiParam || storedApiBase || fallbackApiBase || resolvedOrigin;
if (apiParam) {
  localStorage.setItem("assistant_api_base", apiParam);
}
if (isLocalHost) {
  localStorage.removeItem("assistant_api_base");
}
if (fallbackApiBase) {
  localStorage.setItem("assistant_api_base", fallbackApiBase);
}
if (logoParam) {
  localStorage.setItem("assistant_logo_url", logoParam);
}
const logoUrl = logoParam || storedLogo;
if (demoParam) {
  localStorage.setItem("assistant_demo", "1");
}
if (tenantParam) {
  localStorage.setItem("assistant_tenant_code", tenantParam);
}
const userOnlyMode =
  document.body.classList.contains("user-only") || queryParams.get("mode") === "user";
const kioskMode =
  document.body.classList.contains("kiosk-mode") || queryParams.get("kiosk") === "1";
const advancedMode = queryParams.get("advanced") === "1";
const userPresentationParam = queryParams.get("presentation") === "1";
if (kioskMode) {
  document.body.classList.add("kiosk-mode");
}
const demoDurationMs = 24 * 60 * 60 * 1000;
let demoState = { active: false, expired: false, until: 0 };

function initDemoState() {
  const now = Date.now();
  let until = Number(localStorage.getItem("assistant_demo_until") || 0);
  if (demoParam) {
    localStorage.setItem("assistant_demo", "1");
  }
  if (localStorage.getItem("assistant_demo") === "1") {
    if (!until || until < now) {
      until = now + demoDurationMs;
      localStorage.setItem("assistant_demo_until", String(until));
    }
  }
  if (until && now > until) {
    demoState.expired = true;
    localStorage.removeItem("assistant_demo");
    localStorage.removeItem("assistant_demo_until");
    localStorage.removeItem("assistant_token");
  }
  demoState.active = localStorage.getItem("assistant_demo") === "1";
  demoState.until = until;
}

initDemoState();
      const loginCard = document.getElementById("loginCard");
      const loginForm = document.getElementById("loginForm");
      const loginStatus = document.getElementById("loginStatus");
      const demoBanner = document.getElementById("demoBanner");
      const refreshBtn = document.getElementById("refreshBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const logoutBtnBottom = document.getElementById("logoutBtnBottom");
      const netStatus = document.getElementById("netStatus");
      const statusBanner = document.getElementById("statusBanner");
      const sessionBadge = document.getElementById("sessionBadge");
      const roleBanner = document.getElementById("roleBanner");
      const presentationToggle = document.getElementById("presentationToggle");
      const apiConfigBtn = document.getElementById("apiConfigBtn");
      const apiConfigPanel = document.getElementById("apiConfigPanel");
      const apiBaseInput = document.getElementById("apiBaseInput");
      const apiApplyBtn = document.getElementById("apiApplyBtn");
      const apiResetBtn = document.getElementById("apiResetBtn");
      const simpleModeToggle = document.getElementById("simpleModeToggle");
      const adminCleanToggle = document.getElementById("adminCleanToggle");
      const homeBrand = document.getElementById("homeBrand");
      const quickAdminBtn = document.getElementById("quickAdminBtn");
      const quickUserBtn = document.getElementById("quickUserBtn");
      const quickLoginAdmin = document.getElementById("quickLoginAdmin");
      const quickLoginUser = document.getElementById("quickLoginUser");
      const demoClientBtn = document.getElementById("demoClientBtn");
      const tenantCodeInput = loginForm
        ? loginForm.querySelector("input[name=\"tenant_code\"]")
        : null;
      const loginEmailInput = loginForm
        ? loginForm.querySelector("input[name=\"email\"]")
        : null;
      const loginPasswordInput = loginForm
        ? loginForm.querySelector("input[name=\"password\"]")
        : null;
      let queryTenantCode = "";
      let queryEmail = "";
      let queryPassword = "";
      let autoLoginFromQuery = null;
      let autoLoginAttempted = false;
      const userAutoTestBtn = document.getElementById("userAutoTestBtn");
      const quickIssueButtons = document.querySelectorAll("[data-quick]");
      const quickGuide = document.getElementById("quickGuide");
      const quickGuideSteps = document.getElementById("quickGuideSteps");
      const quickGuideTitle = document.getElementById("quickGuideTitle");
      const showFreeTextBtn = document.getElementById("showFreeTextBtn");
      const quickIssuesContainer =
        document.getElementById("quickIssuesContainer") ||
        document.querySelector(".quick-buttons");
      const quickIssueSearchInput = document.getElementById("quickIssueSearchInput");
      const quickIssueSearchBtn = document.getElementById("quickIssueSearchBtn");
      const quickIssueDetail = document.getElementById("quickIssueDetail");
      const quickDetailTitle = document.getElementById("quickDetailTitle");
      const quickDetailMessage = document.getElementById("quickDetailMessage");
      const quickDetailProcedureBtn = document.getElementById("quickDetailProcedureBtn");
      const quickDetailStartBtn = document.getElementById("quickDetailStartBtn");
      const quickDetailCloseBtn = document.getElementById("quickDetailCloseBtn");
      const quickGuideNote = document.getElementById("quickGuideNote");
      const quickTicketInput = document.getElementById("quickTicketInput");
      const quickTicketBtn = document.getElementById("quickTicketBtn");
      const assistantTabBtn = document.getElementById("assistantTabBtn");
      const kbTabBtn = document.getElementById("kbTabBtn");
      const assistantTabPanel = document.getElementById("assistantTabPanel");
      const kbTabPanel = document.getElementById("kbTabPanel");
      const kbSearchInputUser = document.getElementById("kbSearchInputUser");
      const kbSearchBtnUser = document.getElementById("kbSearchBtnUser");
      const kbSearchResultsUser = document.getElementById("kbSearchResultsUser");
      const kbLevelFilter = document.getElementById("kbLevelFilter");
      const userPresentationToggle = document.getElementById("userPresentationToggle");
      const guidedModeToggle = document.getElementById("guidedModeToggle");
      const userSimpleToggle = document.getElementById("userSimpleToggle");
      const beginnerModeToggle = document.getElementById("beginnerModeToggle");
      const beginnerStep = document.getElementById("beginnerStep");
      const summaryTotal = document.getElementById("summaryTotal");
      const summaryOpen = document.getElementById("summaryOpen");
      const summaryResolved = document.getElementById("summaryResolved");
      const summaryFilterItems = document.querySelectorAll("[data-summary-filter]");
      const summaryLast = document.getElementById("summaryLast");
      const presentationKpis = document.getElementById("presentationKpis");
      const presentationKpiTotal = document.getElementById("presentationKpiTotal");
      const presentationKpiOpen = document.getElementById("presentationKpiOpen");
      const presentationKpiResolved = document.getElementById("presentationKpiResolved");
      const presentationKpiLast = document.getElementById("presentationKpiLast");
      const nextStepCard = document.getElementById("nextStepCard");
      const nextStepText = document.getElementById("nextStepText");
      const nextStepActions = document.getElementById("nextStepActions");
      const nextStepProcedureBtn = document.getElementById("nextStepProcedureBtn");
      const nextStepKbBtn = document.getElementById("nextStepKbBtn");
      const nextStepTicketBtn = document.getElementById("nextStepTicketBtn");
      const nextStepReplies = document.getElementById("nextStepReplies");
      const statusCard = document.getElementById("statusCard");
      const statusTimeline = document.getElementById("statusTimeline");
      const statusNote = document.getElementById("statusNote");
      const statusPill = document.getElementById("statusPill");
      const timelineSteps = statusTimeline
        ? statusTimeline.querySelectorAll(".timeline-step")
        : [];
      const contextCard = document.getElementById("contextCard");
      const contextDevice = document.getElementById("contextDevice");
      const contextOs = document.getElementById("contextOs");
      const contextLocation = document.getElementById("contextLocation");
      const contextUrgency = document.getElementById("contextUrgency");
      const contextSummary = document.getElementById("contextSummary");
      const checklistReloadBtn = document.getElementById("checklistReloadBtn");
      const checklistExportBtn = document.getElementById("checklistExportBtn");
      const onboardingCard = document.getElementById("onboardingCard");
      const kbManageCard = document.getElementById("kbManageCard");
      const setupChecklist = document.getElementById("setupChecklist");
      const setupChecklistCard = document.getElementById("setupChecklistCard");
      const userGuideCard = document.getElementById("userGuideCard");
      const metricsCard = document.getElementById("metricsCard");
      const metricsRefreshBtn = document.getElementById("metricsRefreshBtn");
      const metricsStats = document.getElementById("metricsStats");
      const miniDashboardCard = document.getElementById("miniDashboardCard");
      const miniDashboardRefreshBtn = document.getElementById("miniDashboardRefreshBtn");
      const miniStatusBars = document.getElementById("miniStatusBars");
      const miniPriorityBars = document.getElementById("miniPriorityBars");
      const miniVolumeBars = document.getElementById("miniVolumeBars");
      const miniKpiResponseValue = document.getElementById("miniKpiResponseValue");
      const miniKpiResolutionValue = document.getElementById("miniKpiResolutionValue");
      const miniKpiRatingValue = document.getElementById("miniKpiRatingValue");
      const miniKpiSlaValue = document.getElementById("miniKpiSlaValue");
      const recentTicketsCard = document.getElementById("recentTicketsCard");
      const recentTicketsList = document.getElementById("recentTicketsList");
      const recentTicketsRefreshBtn = document.getElementById("recentTicketsRefreshBtn");
      const kbCsvImportInput = document.getElementById("kbCsvImportInput");
      const kbCsvTemplateBtn = document.getElementById("kbCsvTemplateBtn");
      const kbCsvCard = document.getElementById("kbCsvCard");
      const kbExportQuery = document.getElementById("kbExportQuery");
      const kbExportLevel = document.getElementById("kbExportLevel");
      const kbExportFilteredBtn = document.getElementById("kbExportFilteredBtn");
      const adminGalleryCard = document.getElementById("adminGalleryCard");
      const adminGalleryGrid = document.getElementById("adminGalleryGrid");
      const adminGalleryRefreshBtn = document.getElementById("adminGalleryRefreshBtn");
      const adminGalleryEmpty = document.getElementById("adminGalleryEmpty");
      const adminGallerySearch = document.getElementById("adminGallerySearch");
      const adminGallerySearchBtn = document.getElementById("adminGallerySearchBtn");
      const adminGalleryCount = document.getElementById("adminGalleryCount");
      const adminGalleryRangeButtons = document.querySelectorAll("[data-gallery-range]");
      const brandLogos = document.querySelectorAll("[data-brand-logo]");

      const chatWindow = document.getElementById("chatWindow");
      const chatForm = document.getElementById("chatForm");
      const chatImageInput = document.getElementById("chatImageInput");
      const chatImageBtn = document.getElementById("chatImageBtn");
      const chatAttachmentHint = document.getElementById("chatAttachmentHint");
      const imageLightbox = document.getElementById("imageLightbox");
      const imageLightboxImg = document.getElementById("imageLightboxImg");
      const imageLightboxDownload = document.getElementById("imageLightboxDownload");
      const imageLightboxClose = document.getElementById("imageLightboxClose");
      const chatGallery = document.getElementById("chatGallery");
      const chatGalleryGrid = document.getElementById("chatGalleryGrid");
      const chatGalleryEmpty = document.getElementById("chatGalleryEmpty");
      const chatGalleryCount = document.getElementById("chatGalleryCount");
      const chatSearchInput = document.getElementById("chatSearchInput");
      const chatSearchBtn = document.getElementById("chatSearchBtn");
      const chatSearchClearBtn = document.getElementById("chatSearchClearBtn");
      const chatSources = document.getElementById("chatSources");
      const newChatBtn = document.getElementById("newChatBtn");
      const convoList = document.getElementById("convoList");
      const convoSearchInput = document.getElementById("convoSearchInput");
      const convoSearchBtn = document.getElementById("convoSearchBtn");
      const historySearch = document.getElementById("historySearch");
      const chatTickets = document.getElementById("chatTickets");
      const langSelect = document.getElementById("langSelect");
      const feedbackBox = document.getElementById("feedbackBox");
      const resolveYesBtn = document.getElementById("resolveYesBtn");
      const createTicketBtn = document.getElementById("createTicketBtn");
      const ticketBadge = document.getElementById("ticketBadge");
      const feedbackHint = document.getElementById("feedbackHint");
      const ticketPreview = document.getElementById("ticketPreview");
      const ticketPreviewTitle = document.getElementById("ticketPreviewTitle");
      const ticketPreviewCategory = document.getElementById("ticketPreviewCategory");
      const ticketPreviewPriority = document.getElementById("ticketPreviewPriority");
      const ticketPreviewSummary = document.getElementById("ticketPreviewSummary");
      const ticketPreviewConfirm = document.getElementById("ticketPreviewConfirm");
      const ticketPreviewCancel = document.getElementById("ticketPreviewCancel");
      const createTicketDefaultLabel = createTicketBtn
        ? createTicketBtn.textContent
        : "Creer un ticket";
      const ratingSelect = document.getElementById("ratingSelect");
      const feedbackComment = document.getElementById("feedbackComment");

      const kbForm = document.getElementById("kbForm");
      const kbBulkForm = document.getElementById("kbBulkForm");
      const kbUploadForm = document.getElementById("kbUploadForm");
      const kbList = document.getElementById("kbList");
      const kbSearchInput = document.getElementById("kbSearchInput");
      const kbSearchBtn = document.getElementById("kbSearchBtn");
      const dropZone = document.getElementById("dropZone");
      const kbFilesInput = document.getElementById("kbFilesInput");

      const ticketsCard = document.getElementById("ticketsCard");
      const ticketForm = document.getElementById("ticketForm");
      const ticketsTableEl = document.getElementById("ticketsTable");
      const ticketsTable = ticketsTableEl ? ticketsTableEl.querySelector("tbody") : null;
      const reloadTicketsBtn = document.getElementById("reloadTicketsBtn");
      const ticketUserFilter = document.getElementById("ticketUserFilter");
      const ticketUserFilterBtn = document.getElementById("ticketUserFilterBtn");
      const myTicketsCard = document.getElementById("myTicketsCard");
      const myTicketsTableEl = document.getElementById("myTicketsTable");
      const myTicketsTable = myTicketsTableEl ? myTicketsTableEl.querySelector("tbody") : null;
      const myTicketsList = document.getElementById("myTicketsList");
      const ticketsPrevBtn = document.getElementById("ticketsPrevBtn");
      const ticketsNextBtn = document.getElementById("ticketsNextBtn");
      const ticketsPageInfo = document.getElementById("ticketsPageInfo");
      const ticketRemindersCard = document.getElementById("ticketRemindersCard");
      const ticketRemindersList = document.getElementById("ticketRemindersList");
      const ticketDetailPanel = document.getElementById("ticketDetailPanel");
      const ticketDetailTitle = document.getElementById("ticketDetailTitle");
      const ticketDetailStatus = document.getElementById("ticketDetailStatus");
      const ticketDetailMeta = document.getElementById("ticketDetailMeta");
      const ticketDetailSummary = document.getElementById("ticketDetailSummary");
      const ticketDetailImages = document.getElementById("ticketDetailImages");
      const ticketDetailImagesGrid = document.getElementById("ticketDetailImagesGrid");
      const ticketDetailImagesCount = document.getElementById("ticketDetailImagesCount");
      const ticketDetailTimeline = document.getElementById("ticketDetailTimeline");
      const ticketDetailSteps = ticketDetailTimeline
        ? ticketDetailTimeline.querySelectorAll(".timeline-step")
        : [];
      const ticketResumeBtn = document.getElementById("ticketResumeBtn");
      const reloadMyTicketsBtn = document.getElementById("reloadMyTicketsBtn");
      const myTicketsFilterButtons = document.querySelectorAll("[data-my-tickets-filter]");
      const myTicketsCountAll = document.getElementById("myTicketsCountAll");
      const myTicketsCountOpen = document.getElementById("myTicketsCountOpen");
      const myTicketsCountResolved = document.getElementById("myTicketsCountResolved");
      const myTicketsSearchInput = document.getElementById("myTicketsSearchInput");
      const myTicketsSearchBtn = document.getElementById("myTicketsSearchBtn");
      const myTicketsSortSelect = document.getElementById("myTicketsSortSelect");
      const myTicketsExportBtn = document.getElementById("myTicketsExportBtn");
      const myTicketsExportCsvBtn = document.getElementById("myTicketsExportCsvBtn");
      const backToChatBtn = document.getElementById("backToChatBtn");
      const printSummaryBtn = document.getElementById("printSummaryBtn");
      const myTicketsPanel = document.getElementById("myTicketsPanel");
      const showTicketsBtn = document.getElementById("showTicketsBtn");
      const closeTicketsBtn = document.getElementById("closeTicketsBtn");
      const downloadGuideBtn = document.getElementById("downloadGuideBtn");
      const supportHoursCard = document.getElementById("supportHoursCard");
      const showSupportBtn = document.getElementById("showSupportBtn");
      const closeSupportBtn = document.getElementById("closeSupportBtn");
      const supportStatusText = document.getElementById("supportStatusText");
      const supportNextText = document.getElementById("supportNextText");
      const supportTimezoneText = document.getElementById("supportTimezoneText");
      const supportHoursText = document.getElementById("supportHoursText");
      const showHistoryBtn = document.getElementById("showHistoryBtn");
      const historyPanel = document.getElementById("historyPanel");
      const closeHistoryBtn = document.getElementById("closeHistoryBtn");
      const historyList = document.getElementById("historyList");
      const historySearchInputUser = document.getElementById("historySearchInputUser");
      const historySearchBtnUser = document.getElementById("historySearchBtnUser");
      const historyReloadBtn = document.getElementById("historyReloadBtn");
      const historyPrevBtn = document.getElementById("historyPrevBtn");
      const historyNextBtn = document.getElementById("historyNextBtn");
      const historyPageInfo = document.getElementById("historyPageInfo");
      const historyDetailPanel = document.getElementById("historyDetailPanel");
      const historyDetailTitle = document.getElementById("historyDetailTitle");
      const historyDetailOpenBtn = document.getElementById("historyDetailOpenBtn");
      const historyDetailSearchInput = document.getElementById("historyDetailSearchInput");
      const historyDetailSearchBtn = document.getElementById("historyDetailSearchBtn");
      const historyDetailList = document.getElementById("historyDetailList");
      const ticketThanks = document.getElementById("ticketThanks");
      const ticketThanksMsg = document.getElementById("ticketThanksMsg");
      const thanksNewBtn = document.getElementById("thanksNewBtn");
      const ticketThanksTitle = document.getElementById("ticketThanksTitle");
      const ticketThanksDetails = document.getElementById("ticketThanksDetails");
      const ticketThanksEta = document.getElementById("ticketThanksEta");
      const simpleDashboard = document.getElementById("simpleDashboard");
      const simpleSummaryTotal = document.getElementById("simpleSummaryTotal");
      const simpleSummaryOpen = document.getElementById("simpleSummaryOpen");
      const simpleSummaryResolved = document.getElementById("simpleSummaryResolved");
      const simpleStartBtn = document.getElementById("simpleStartBtn");
      const simpleTicketsBtn = document.getElementById("simpleTicketsBtn");

      if (tenantCodeInput) {
        const savedTenantCode = localStorage.getItem("assistant_tenant_code");
        const queryTenant = tenantParam
          ? tenantParam.toString().trim().toUpperCase()
          : "";
        queryTenantCode = queryParams.get("tenant_code") || "";
        queryEmail = queryParams.get("email") || "";
        queryPassword = queryParams.get("password") || "";
        if (queryTenant && !tenantCodeInput.value) {
          tenantCodeInput.value = queryTenant;
        } else if (queryTenantCode && !tenantCodeInput.value) {
          tenantCodeInput.value = queryTenantCode.toString().trim().toUpperCase();
        } else if (savedTenantCode && !tenantCodeInput.value) {
          tenantCodeInput.value = savedTenantCode;
        }
        if (!tenantCodeInput.value && isLocalHost) {
          tenantCodeInput.value = "DEFAULT";
        }
        if (loginEmailInput && queryEmail && !loginEmailInput.value) {
          loginEmailInput.value = queryEmail.toString().trim();
        }
        if (loginPasswordInput && queryPassword && !loginPasswordInput.value) {
          loginPasswordInput.value = queryPassword.toString();
        }
        const shouldPrefillDemo =
          demoParam ||
          localStorage.getItem("assistant_demo") === "1" ||
          (isLocalHost && !demoState.expired);
        if (shouldPrefillDemo) {
          if (loginEmailInput && !loginEmailInput.value) {
            loginEmailInput.value = "user@assistant.local";
          }
          if (loginPasswordInput && !loginPasswordInput.value) {
            loginPasswordInput.value = "user123";
          }
          if (tenantCodeInput && !tenantCodeInput.value) {
            tenantCodeInput.value = "DEFAULT";
          }
        }
        if (queryTenantCode || queryEmail || queryPassword) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("tenant_code");
            url.searchParams.delete("email");
            url.searchParams.delete("password");
            window.history.replaceState({}, "", url.toString());
          } catch (err) {
            // ignore URL cleanup errors
          }
        }
        if (queryEmail && queryPassword) {
          autoLoginFromQuery = {
            email: queryEmail.toString().trim(),
            password: queryPassword.toString(),
            tenantCode: (tenantCodeInput.value || "").toString().trim().toUpperCase()
          };
        }
        tenantCodeInput.addEventListener("input", () => {
          const next = getTenantCode();
          if (next) {
            localStorage.setItem("assistant_tenant_code", next);
          }
          applyTenantBranding();
        });
      }

      const getTenantCode = () => {
        const fromInput = tenantCodeInput ? tenantCodeInput.value : "";
        const fromStorage = localStorage.getItem("assistant_tenant_code");
        const fromQuery = tenantParam;
        return (fromInput || fromStorage || fromQuery || "").toString().trim().toUpperCase();
      };

      let applyTenantBranding = () => {};

      const resolveDefaultLogo = (img) =>
        img.getAttribute("data-default-logo") || "/app/assets/logo.svg";
      function applyBrandLogo(url) {
        if (!brandLogos || !brandLogos.length) return;
        const cleaned = typeof url === "string" ? url.trim() : "";
        brandLogos.forEach((img) => {
          const fallback = resolveDefaultLogo(img);
          const nextUrl = cleaned || fallback;
          img.classList.remove("hidden");
          img.onerror = () => {
            if (img.src !== fallback) {
              img.src = fallback;
            } else {
              img.classList.add("hidden");
            }
          };
          img.src = nextUrl;
        });
      }

      if (brandLogos && brandLogos.length) {
        applyBrandLogo(logoUrl || "");
      }

      if (demoState.active) {
        document.body.classList.add("demo-mode");
      }

      if (!isLocalHost) {
        if (quickLoginAdmin) {
          quickLoginAdmin.style.display = "none";
        }
        if (quickLoginUser) {
          quickLoginUser.style.display = "none";
        }
        if (userAutoTestBtn) {
          userAutoTestBtn.style.display = "none";
        }
        if (demoClientBtn) {
          demoClientBtn.style.display = "none";
        }
      }

      const usersCard = document.getElementById("usersCard");
      const userForm = document.getElementById("userForm");
      const usersTableEl = document.getElementById("usersTable");
      const usersTable = usersTableEl ? usersTableEl.querySelector("tbody") : null;
      const reloadUsersBtn = document.getElementById("reloadUsersBtn");
      const adminToolsCard = document.getElementById("adminToolsCard");
      const auditTableEl = document.getElementById("auditTable");
      const auditTable = auditTableEl ? auditTableEl.querySelector("tbody") : null;
      const activityTableEl = document.getElementById("activityTable");
      const activityTable = activityTableEl ? activityTableEl.querySelector("tbody") : null;
      const backupBtn = document.getElementById("backupBtn");
      const restoreInput = document.getElementById("restoreInput");
      const kbExportJsonBtn = document.getElementById("kbExportJsonBtn");
      const kbExportCsvBtn = document.getElementById("kbExportCsvBtn");
      const kbImportInput = document.getElementById("kbImportInput");
      const glpiTestBtn = document.getElementById("glpiTestBtn");
      const glpiTestStatus = document.getElementById("glpiTestStatus");
      const convoExportJsonBtn = document.getElementById("convoExportJsonBtn");
      const convoExportCsvBtn = document.getElementById("convoExportCsvBtn");
      const backupListBtn = document.getElementById("backupListBtn");
      const backupRestoreBtn = document.getElementById("backupRestoreBtn");
      const backupSelect = document.getElementById("backupSelect");
      const backupRestoreSelectedBtn = document.getElementById("backupRestoreSelectedBtn");
      const backupDownloadBtn = document.getElementById("backupDownloadBtn");

      const notificationsCard = document.getElementById("notificationsCard");
      const notificationsTableEl = document.getElementById("notificationsTable");
      const notificationsTable = notificationsTableEl
        ? notificationsTableEl.querySelector("tbody")
        : null;
      const reloadNotificationsBtn = document.getElementById("reloadNotificationsBtn");
      const testNotificationBtn = document.getElementById("testNotificationBtn");
      const webhookNotificationBtn = document.getElementById("webhookNotificationBtn");

      const orgSettingsCard = document.getElementById("orgSettingsCard");
      const orgSettingsForm = document.getElementById("orgSettingsForm");
      const orgSettingsReloadBtn = document.getElementById("orgSettingsReloadBtn");
      const orgSettingsStatus = document.getElementById("orgSettingsStatus");
      const mailboxPullBtn = document.getElementById("mailboxPullBtn");
      const oauthGoogleBtn = document.getElementById("oauthGoogleBtn");
      const oauthOutlookBtn = document.getElementById("oauthOutlookBtn");
      const oauthGoogleStatus = document.getElementById("oauthGoogleStatus");
      const oauthOutlookStatus = document.getElementById("oauthOutlookStatus");
      const orgCard = document.getElementById("orgCard");
      const orgForm = document.getElementById("orgForm");
      const orgStatus = document.getElementById("orgStatus");
      const orgReloadBtn = document.getElementById("orgReloadBtn");
      const invitesCard = document.getElementById("invitesCard");
      const inviteForm = document.getElementById("inviteForm");
      const inviteStatus = document.getElementById("inviteStatus");
      const invitesTableEl = document.getElementById("invitesTable");
      const invitesTable = invitesTableEl ? invitesTableEl.querySelector("tbody") : null;
      const invitesReloadBtn = document.getElementById("invitesReloadBtn");
      const inviteAcceptForm = document.getElementById("inviteAcceptForm");
      const inviteAcceptStatus = document.getElementById("inviteAcceptStatus");
      const diagnosticsCard = document.getElementById("diagnosticsCard");
      const diagnosticsReloadBtn = document.getElementById("diagnosticsReloadBtn");
      const diagnosticsDeepBtn = document.getElementById("diagnosticsDeepBtn");
      const diagnosticsTableEl = document.getElementById("diagnosticsTable");
      const diagnosticsTable = diagnosticsTableEl
        ? diagnosticsTableEl.querySelector("tbody")
        : null;
      const adminStatusPill = document.getElementById("adminStatusPill");
      const adminStatusGrid = document.getElementById("adminStatusGrid");
      const adminStatusRefreshBtn = document.getElementById("adminStatusRefreshBtn");
      const adminStatusCard = document.getElementById("adminStatusCard");
      const adminGuideCard = document.getElementById("adminGuideCard");
      const superadminCard = document.getElementById("superadminCard");
      const superadminMetrics = document.getElementById("superadminMetrics");
      const superadminRefreshBtn = document.getElementById("superadminRefreshBtn");
      const globalBackupBtn = document.getElementById("globalBackupBtn");
      const globalRestoreInput = document.getElementById("globalRestoreInput");
      const tenantsCard = document.getElementById("tenantsCard");
      const tenantForm = document.getElementById("tenantForm");
      const tenantStatus = document.getElementById("tenantStatus");
      const tenantsTableEl = document.getElementById("tenantsTable");
      const tenantsTable = tenantsTableEl ? tenantsTableEl.querySelector("tbody") : null;
      const tenantsReloadBtn = document.getElementById("tenantsReloadBtn");
      const tenantImportInput = document.getElementById("tenantImportInput");

      let conversationId = null;
      let currentRole = null;
      let currentLang = localStorage.getItem("assistant_lang") || "fr";
      const i18nConfig = window.APP_I18N || {
        supportedLangs: ["fr", "en", "es"],
        translations: { fr: {} }
      };
      const supportedLangs = Array.isArray(i18nConfig.supportedLangs)
        ? i18nConfig.supportedLangs
        : ["fr", "en", "es"];
      const translations = i18nConfig.translations || { fr: {} };
      if (!supportedLangs.includes(currentLang)) {
        currentLang = "fr";
      }
      const getActiveLang = () =>
        supportedLangs.includes(currentLang) ? currentLang : "fr";
      const t = (key, vars = null) => {
        const lang = getActiveLang();
        const pack = translations[lang] || translations.fr || {};
        let text = pack[key] || (translations.fr ? translations.fr[key] : null) || key;
        if (vars) {
          Object.entries(vars).forEach(([name, value]) => {
            text = text.replace(new RegExp(`\\{${name}\\}`, "g"), value);
          });
        }
        return text;
      };
      const issueKeyAliases = {
        "outlook-crash": "outlook",
        "o365-login": "o365",
        "sharepoint-access": "sharepoint",
        "password-reset": "password",
        "wifi-site": "wifi",
        "printer-site": "printer",
        "teams-audio": "teams",
        "ad-locked": "password",
        "network-outage": "network"
      };
      const issueTemplateMap = {
        outlook: "app_restart",
        teams: "app_restart",
        onedrive: "app_restart",
        o365: "access",
        internet: "network",
        wifi: "network",
        dns: "network",
        dhcp: "network",
        firewall: "network",
        network: "network",
        printer: "printer",
        vpn: "vpn",
        password: "access",
        sharepoint: "access",
        access: "access",
        account: "account",
        onboarding: "account",
        return: "account",
        slowpc: "hardware"
      };
      const guideTemplates = {
        app_restart: [
          "guide.template.app_restart.1",
          "guide.template.app_restart.2",
          "guide.template.app_restart.3",
          "guide.template.app_restart.4"
        ],
        network: [
          "guide.template.network.1",
          "guide.template.network.2",
          "guide.template.network.3",
          "guide.template.network.4"
        ],
        printer: [
          "guide.template.printer.1",
          "guide.template.printer.2",
          "guide.template.printer.3",
          "guide.template.printer.4"
        ],
        vpn: [
          "guide.template.vpn.1",
          "guide.template.vpn.2",
          "guide.template.vpn.3",
          "guide.template.vpn.4"
        ],
        access: [
          "guide.template.access.1",
          "guide.template.access.2",
          "guide.template.access.3",
          "guide.template.access.4"
        ],
        account: [
          "guide.template.account.1",
          "guide.template.account.2",
          "guide.template.account.3",
          "guide.template.account.4"
        ],
        hardware: [
          "guide.template.hardware.1",
          "guide.template.hardware.2",
          "guide.template.hardware.3",
          "guide.template.hardware.4"
        ],
        generic: [
          "guide.template.generic.1",
          "guide.template.generic.2",
          "guide.template.generic.3",
          "guide.template.generic.4"
        ]
      };
      const resolveIssueKey = (key) => {
        const cleaned = (key || "").toString().trim();
        if (!cleaned) return "";
        return issueKeyAliases[cleaned] || cleaned;
      };
      const getIssueLabel = (key, fallback = "") => {
        const resolved = resolveIssueKey(key);
        if (!resolved) return fallback || "";
        const labelKey = `issue.${resolved}.label`;
        const label = t(labelKey);
        if (label === labelKey) return fallback || resolved;
        return label;
      };
      const getIssueMessage = (key, fallback = "") => {
        const resolved = resolveIssueKey(key);
        if (!resolved) return fallback || "";
        const messageKey = `issue.${resolved}.message`;
        const message = t(messageKey);
        if (message === messageKey) return fallback || resolved;
        return message;
      };
      const buildGuideSteps = (templateKey) => {
        const keys = guideTemplates[templateKey] || guideTemplates.generic || [];
        return keys
          .map((stepKey) => t(stepKey))
          .filter((step) => step && !step.startsWith("guide.template."));
      };
      function buildGuidedFlow() {
        const baseIssueOptions = [
          {
            label: getIssueLabel("internet", "Plus d'internet"),
            value:
              getIssueMessage("internet", "Plus d'internet") ||
              getIssueLabel("internet", "Plus d'internet")
          },
          {
            label: getIssueLabel("outlook", "Outlook ne s'ouvre pas"),
            value:
              getIssueMessage("outlook", "Outlook ne s'ouvre pas") ||
              getIssueLabel("outlook", "Outlook ne s'ouvre pas")
          },
          {
            label: getIssueLabel("printer", "Imprimante ne repond pas"),
            value:
              getIssueMessage("printer", "Imprimante ne repond pas") ||
              getIssueLabel("printer", "Imprimante ne repond pas")
          }
        ];
        return [
          {
            key: "device",
            prompt: t("guided.device.prompt"),
            options: [
              { label: t("context.option.desktop"), value: "PC fixe" },
              { label: t("context.option.laptop"), value: "Laptop" },
              { label: t("context.option.mobile"), value: "Mobile" }
            ]
          },
          {
            key: "os",
            prompt: t("guided.os.prompt"),
            options: [
              { label: t("context.option.windows"), value: "Windows" },
              { label: t("context.option.macos"), value: "macOS" },
              { label: t("context.option.linux"), value: "Linux" },
              { label: t("context.option.other"), value: "Autre" }
            ]
          },
          {
            key: "location",
            prompt: t("guided.location.prompt"),
            options: [
              { label: t("context.option.site.hq"), value: "Siege" },
              { label: t("context.option.site.remote"), value: "Teletravail" },
              { label: t("context.option.site.branch"), value: "Agence" },
              { label: t("context.option.site.client"), value: "Client" }
            ]
          },
          {
            key: "urgency",
            prompt: t("guided.urgency.prompt"),
            options: [
              { label: t("context.option.urgency.normal"), value: "" },
              { label: t("context.option.urgency.high"), value: "Haute" },
              { label: t("context.option.urgency.critical"), value: "Critique" }
            ]
          },
          {
            key: "issue",
            prompt: t("guided.issue.prompt"),
            options: baseIssueOptions.slice(0, 5)
          }
        ];
      }
      let chatBusy = false;
      let selectedQuickIssue = null;
      let quickIssuesCache = [];
      let kbLastQuery = "";
      let conversationStatus = "idle";
      let latestTicketStatus = null;
      let pendingTicketDraft = null;
      let lastUserMessage = "";
      let lastSources = [];
      let supportMeta = { slaHours: 0, supportLabel: "" };
      let chatSearchQuery = "";
      let userPresentationEnabled =
        userPresentationParam ||
        localStorage.getItem("assistant_user_presentation") === "1";
      let myTicketsFilter = "all";
      let myTicketsSearch = "";
      let myTicketsSort = "newest";
      let lastTicketSelection = null;
      let guidedModeEnabled =
        (localStorage.getItem("assistant_guided_mode") || "off") === "on";
      let guidedStepIndex = null;
      let userRefreshTimer = null;
      let simpleUserModeEnabled =
        (localStorage.getItem("assistant_user_simple") || "off") === "on";
      let brandingLoaded = false;
      const ticketStatusCache = new Map();
      let activeHistoryConversation = null;
      let reminderHours = 72;
      let myTicketsLoading = false;
      let historyLoading = false;
      let guidedFlow = [];

      const langButtons = Array.from(document.querySelectorAll("[data-lang]"));

      const setText = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
      };

      const setHtml = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = t(key);
      };

      const setPlaceholder = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.placeholder = t(key);
      };

      const setOptionText = (selectId, value, key) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const option = Array.from(select.options).find((opt) => opt.value === value);
        if (option) option.textContent = t(key);
      };

      const updateLangButtons = () => {
        const active = getActiveLang();
        langButtons.forEach((btn) => {
          const lang = btn.getAttribute("data-lang");
          btn.classList.toggle("active", lang === active);
        });
      };

      const applyI18n = () => {
        const active = getActiveLang();
        document.documentElement.lang = active;
        document.documentElement.dir = "ltr";
        updateLangButtons();

        const isAdminPage =
          document.body.classList.contains("admin-lite") &&
          !document.body.classList.contains("user-only");
        const isUserPage = document.body.classList.contains("user-only");
        const isLoginOnly = document.body.classList.contains("login-only");

        if (isAdminPage) {
          document.title = t("title.admin");
        } else if (isUserPage) {
          document.title = isLoginOnly ? t("title.login") : t("title.user");
        } else {
          document.title = t("title.home");
        }

        setText("brandName", "brand.name");
        setText("landingBadge", "landing.badge");
        setText("heroBadge", "landing.badge");
        setText("landingTitle", "landing.title");
        setText("landingSubtitle", "landing.subtitle");
        setText("landingLoginBtn", "landing.login");
        setText("landingUserBtn", "landing.user");
        setText("landingAdminBtn", "landing.admin");
        setText("landingLogoutBtn", "landing.logout");

        setText("roleBanner", isAdminPage ? "role.adminSpace" : "role.userSpace");
        setText("userPresentationToggle", "toggle.presentation");
        setText("showSupportBtn", "nav.support");
        setText("showHistoryBtn", "nav.history");
        setText("showTicketsBtn", "nav.myTickets");
        setText("logoutBtn", "action.logout");
        setText("logoutBtnBottom", "action.logout");
        setText("refreshBtn", "tickets.refresh");

        setText("loginTitle", isAdminPage ? "login.title.admin" : "login.title.user");
        setText("loginSubtitle", "login.subtitle");
        setPlaceholder("loginTenantInput", "login.tenantPlaceholder");
        setPlaceholder("loginEmailInput", "login.emailPlaceholder");
        setPlaceholder("loginPasswordInput", "login.passwordPlaceholder");
        setText("loginSubmitBtn", "login.submit");
        setText("loginHint", isAdminPage ? "login.hint.admin" : "login.hint.user");
        setHtml("loginTestAccount", "login.testAccount");
        setText("quickUserBtn", "login.quick");
        setText("demoClientBtn", "login.demo");
        setText("quickLoginNote", "login.quickNote");
        setText("inviteTitle", "login.inviteTitle");
        setPlaceholder("inviteTokenInput", "login.inviteTokenPlaceholder");
        setPlaceholder("invitePasswordInput", "login.invitePasswordPlaceholder");

        setText("heroTitle", "hero.title");
        setText("heroSubtitle", "hero.subtitle");
        setText("heroPillGuide", "hero.pill.guide");
        setText("heroPillTicket", "hero.pill.ticket");
        setText("heroPillFollow", "hero.pill.follow");
        setText("startBtn", "hero.start");
        setText("heroNote", "hero.note");

        setText("assistantTitle", "assistant.title");
        setText("assistantTabBtn", "assistant.tab");
        setText("kbTabBtn", "assistant.kbTab");
        setText("newChatBtn", "assistant.newIssue");
        setText("printSummaryBtn", "assistant.printSummary");

        setHtml("userHintStep1", "hint.step1");
        setHtml("userHintStep2", "hint.step2");
        setHtml("userHintStep3", "hint.step3");
        setText("beginnerStep", "beginner.step1");

        setText("summaryTitle", "summary.title");
        setText("summaryLabelTickets", "summary.tickets");
        setText("summaryLabelOpen", "summary.open");
        setText("summaryLabelResolved", "summary.resolved");
        setText("summaryLastLabel", "summary.last");
        setText("presentationKpiLabelTotal", "summary.tickets");
        setText("presentationKpiLabelOpen", "summary.open");
        setText("presentationKpiLabelResolved", "summary.resolved");
        setText("presentationKpiLabelLast", "summary.last");

        setText("statusTitle", "status.title");
        setText("statusStepAssistant", "status.step.assistant");
        setText("statusStepTicket", "status.step.ticket");
        setText("statusStepResolved", "status.step.resolved");
        if (statusNote || statusPill) {
          updateTimeline();
        }

        setText("contextTitle", "context.title");
        setText("contextDeviceLabel", "context.device");
        setText("contextOsLabel", "context.os");
        setText("contextLocationLabel", "context.site");
        setText("contextUrgencyLabel", "context.urgency");
        setText("contextSummary", "context.summary");
        setOptionText("contextDevice", "", "context.option.none");
        setOptionText("contextDevice", "PC fixe", "context.option.desktop");
        setOptionText("contextDevice", "PC HP", "context.option.hp");
        setOptionText("contextDevice", "Laptop", "context.option.laptop");
        setOptionText("contextDevice", "Mobile", "context.option.mobile");
        setOptionText("contextOs", "", "context.option.none");
        setOptionText("contextOs", "Windows", "context.option.windows");
        setOptionText("contextOs", "Windows 11", "context.option.win11");
        setOptionText("contextOs", "macOS", "context.option.macos");
        setOptionText("contextOs", "Linux", "context.option.linux");
        setOptionText("contextOs", "Autre", "context.option.other");
        setOptionText("contextLocation", "", "context.option.none");
        setOptionText("contextLocation", "Siege", "context.option.site.hq");
        setOptionText("contextLocation", "Teletravail", "context.option.site.remote");
        setOptionText("contextLocation", "Agence", "context.option.site.branch");
        setOptionText("contextLocation", "Client", "context.option.site.client");
        setOptionText("contextUrgency", "", "context.option.urgency.normal");
        setOptionText("contextUrgency", "Haute", "context.option.urgency.high");
        setOptionText("contextUrgency", "Critique", "context.option.urgency.critical");

        setText("quickIssuesTitle", "quick.title");
        setPlaceholder("quickIssueSearchInput", "quick.searchPlaceholder");
        setText("quickIssueSearchBtn", "quick.searchBtn");
        setText("quickIssuesNote", "quick.note");
        setText("quickDetailTitle", "quick.detail.title");
        setText("quickDetailCloseBtn", "quick.detail.close");
        setText("quickDetailProcedureBtn", "quick.detail.procedure");
        setText("quickDetailStartBtn", "quick.detail.start");
        setText("showFreeTextBtn", "quick.other");
        setText("userAutoTestBtn", "quick.autotest");
        setText("quickTicketTitle", "ticket.quick.title");
        setPlaceholder("quickTicketInput", "ticket.quick.placeholder");
        setText("quickTicketBtn", "ticket.quick.button");
        setText("quickTicketNote", "ticket.quick.note");
        setText("quickGuideTitle", "guide.title");
        setText("quickGuideNote", "guide.note");
        setText("nextStepTitle", "next.title");
        setText("nextStepText", "next.text");
        setText("nextStepProcedureBtn", "next.procedure");
        setText("nextStepKbBtn", "next.kb");
        setText("nextStepTicketBtn", "next.ticket");

        setPlaceholder("chatSearchInput", "chat.searchPlaceholder");
        setText("chatSearchBtn", "chat.searchBtn");
        setText("chatSearchClearBtn", "chat.searchClear");
        setText("chatGalleryTitle", "chat.galleryTitle");
        setText("chatGalleryEmpty", "chat.galleryEmpty");
        setPlaceholder("chatMessageInput", "chat.inputPlaceholder");
        setText("chatImageBtn", "chat.addCapture");
        setText("chatAttachmentHint", "chat.attachHint");

        setText("feedbackTitle", "feedback.title");
        setText("resolveYesBtn", "feedback.resolvedYes");
        setText("createTicketBtn", "feedback.resolvedNo");
        setText("feedbackCommentLabel", "feedback.commentLabel");
        setPlaceholder("feedbackComment", "feedback.commentPlaceholder");

        setText("ticketPreviewHeading", "ticket.preview.title");
        setText("ticketPreviewLabelTitle", "ticket.preview.label.title");
        setText("ticketPreviewLabelCategory", "ticket.preview.label.category");
        setText("ticketPreviewLabelPriority", "ticket.preview.label.priority");
        setText("ticketPreviewLabelSummary", "ticket.preview.label.summary");
        setText("ticketPreviewConfirm", "ticket.preview.confirm");
        setText("ticketPreviewCancel", "ticket.preview.cancel");

        setPlaceholder("kbSearchInputUser", "kb.searchPlaceholder");
        setOptionText("kbLevelFilter", "all", "kb.filter.all");
        setOptionText("kbLevelFilter", "n1", "kb.filter.n1");
        setOptionText("kbLevelFilter", "n2", "kb.filter.n2");
        setOptionText("kbLevelFilter", "n3", "kb.filter.n3");
        setOptionText("kbLevelFilter", "infra", "kb.filter.infra");
        setText("kbSearchBtnUser", "kb.searchBtn");

        setText("ticketThanksHeader", "thanks.title");
        setText("ticketThanksMsg", "thanks.message");
        setText("ticketThanksLabelTitle", "thanks.label.title");
        setText("ticketThanksLabelDetails", "thanks.label.details");
        setText("ticketThanksLabelEta", "thanks.label.eta");
        setText("thanksNewBtn", "thanks.newIssue");

        setText("myTicketsTitle", "tickets.title");
        setText("reloadMyTicketsBtn", "tickets.refresh");
        setText("myTicketsExportBtn", "tickets.exportPdf");
        setText("myTicketsExportCsvBtn", "tickets.exportCsv");
        setText("backToChatBtn", "tickets.backToChat");
        setText("myTicketsFilterAllLabel", "tickets.filter.all");
        setText("myTicketsFilterOpenLabel", "tickets.filter.open");
        setText("myTicketsFilterResolvedLabel", "tickets.filter.resolved");
        setText("ticketsPrevBtn", "tickets.prev");
        setText("ticketsNextBtn", "tickets.next");
        setPlaceholder("myTicketsSearchInput", "tickets.searchPlaceholder");
        setOptionText("myTicketsSortSelect", "newest", "tickets.sort.newest");
        setOptionText("myTicketsSortSelect", "oldest", "tickets.sort.oldest");
        setOptionText("myTicketsSortSelect", "priority", "tickets.sort.priority");
        setOptionText("myTicketsSortSelect", "status", "tickets.sort.status");
        setText("myTicketsSearchBtn", "tickets.searchBtn");
        setText("ticketRemindersTitle", "tickets.reminders");
        setText("ticketDetailHeading", "tickets.detail.title");
        setText("ticketTimelineOpen", "tickets.timeline.open");
        setText("ticketTimelinePending", "tickets.timeline.pending");
        setText("ticketTimelineResolved", "tickets.timeline.resolved");
        setText("ticketResumeBtn", "tickets.resume");
        setText("ticketDetailImagesTitle", "tickets.imagesTitle");

        setText("historyTitle", "history.title");
        setText("historyReloadBtn", "history.refresh");
        setText("closeHistoryBtn", "history.close");
        setPlaceholder("historySearchInputUser", "history.searchPlaceholder");
        setText("historySearchBtnUser", "history.searchBtn");
        setText("historyPrevBtn", "tickets.prev");
        setText("historyNextBtn", "tickets.next");
        setText("historyDetailTitle", "history.conversation");
        setText("historyDetailOpenBtn", "history.openInChat");
        setPlaceholder("historyDetailSearchInput", "history.filterPlaceholder");
        setText("historyDetailSearchBtn", "history.filterBtn");

        setText("supportTitle", "support.title");
        setText("downloadGuideBtn", "support.download");
        setText("closeSupportBtn", "support.close");
        setText("supportLabelStatus", "support.label.status");
        setText("supportLabelNext", "support.label.next");
        setText("supportLabelTimezone", "support.label.timezone");
        setText("supportLabelHours", "support.label.hours");
        setText("supportNote", "support.note");

        setText("simpleDashboardTitle", "dashboard.title");
        setText("simpleSummaryLabelTotal", "dashboard.label.total");
        setText("simpleSummaryLabelOpen", "dashboard.label.open");
        setText("simpleSummaryLabelResolved", "dashboard.label.resolved");
        setText("simpleStartBtn", "dashboard.ask");
        setText("simpleTicketsBtn", "dashboard.viewTickets");
        setText("miniDashboardTitle", "mini.dashboard.title");
        setText("miniDashboardNote", "mini.dashboard.note");
        setText("miniStatusTitle", "mini.status.title");
        setText("miniPriorityTitle", "mini.priority.title");
        setText("miniVolumeTitle", "mini.volume.title");
        setText("miniKpiResponseLabel", "mini.kpi.response");
        setText("miniKpiResolutionLabel", "mini.kpi.resolution");
        setText("miniKpiRatingLabel", "mini.kpi.rating");
        setText("miniKpiSlaLabel", "mini.kpi.sla");
        setText("miniDashboardRefreshBtn", "mini.dashboard.refresh");
        setText("checklistTitle", "checklist.title");
        setText("checklistReloadBtn", "checklist.refresh");
        setText("checklistExportBtn", "checklist.export");

        setText("imageLightboxDownload", "lightbox.download");
        setText("imageLightboxClose", "lightbox.close");
        setText("footerCredit", "footer.credit");
        if (demoBanner) {
          if (demoState.expired) {
            demoBanner.textContent = t("demo.expired");
            demoBanner.classList.remove("hidden");
          } else if (demoState.active) {
            demoBanner.textContent = t("demo.banner");
            demoBanner.classList.remove("hidden");
          } else {
            demoBanner.classList.add("hidden");
          }
        }

        if (contextCard) {
          updateContextSummary();
        }
        guidedFlow = buildGuidedFlow();
        refreshQuickIssueLabels();
        if (selectedQuickIssue) {
          const updatedIssue = localizeIssue(selectedQuickIssue);
          selectedQuickIssue = updatedIssue;
          showQuickIssueDetail(updatedIssue);
        }
        applyTenantBranding();
      };

      const updateGuidedToggleLabel = () => {
        if (!guidedModeToggle) return;
        guidedModeToggle.textContent = guidedModeEnabled
          ? t("toggle.guided.on")
          : t("toggle.guided.off");
      };

      const updateSimpleToggleLabel = () => {
        if (!userSimpleToggle) return;
        userSimpleToggle.textContent = simpleUserModeEnabled
          ? t("toggle.simple.on")
          : t("toggle.simple.off");
      };
      let chatHistoryLoading = false;
      let historyPage = 1;
      const historyPageSize = 6;
      let ticketsPage = 1;
      const ticketsPageSize = 6;
      let simpleModeEnabled =
        (localStorage.getItem("assistant_simple_mode") || "off") === "on";
      const storedAdminClean = localStorage.getItem("assistant_admin_clean");
      let adminCleanEnabled =
        storedAdminClean !== null ? storedAdminClean === "on" : true;
      const storedBeginnerMode = localStorage.getItem("assistant_beginner_mode");
      let beginnerModeEnabled =
        storedBeginnerMode !== null
          ? storedBeginnerMode === "on"
          : Boolean(userOnlyMode);
      let supportConfig = {
        openHour: 9,
        closeHour: 18,
        days: [1, 2, 3, 4, 5],
        label: "Lun-Ven 9h - 18h",
        alwaysOpen: false
      };
      let scenarioRunning = false;
      let orgSettingsLoaded = false;
      let orgInfoLoaded = false;
      let orgSettingsAutoTimer = null;
      let orgAutoTimer = null;

      if (langSelect) {
        langSelect.value = getActiveLang();
        langSelect.addEventListener("change", () => {
          currentLang = langSelect.value;
          localStorage.setItem("assistant_lang", currentLang);
          applyI18n();
          updateGuidedToggleLabel();
          updateSimpleToggleLabel();
        });
      }
      if (langButtons.length) {
        langButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const nextLang = btn.getAttribute("data-lang");
            if (!supportedLangs.includes(nextLang)) return;
            currentLang = nextLang;
            localStorage.setItem("assistant_lang", currentLang);
            if (langSelect) {
              langSelect.value = currentLang;
            }
            applyI18n();
            updateGuidedToggleLabel();
            updateSimpleToggleLabel();
          });
        });
      }

      if (contextCard) {
        updateContextSummary();
        [contextDevice, contextOs, contextLocation, contextUrgency].forEach((field) => {
          if (!field) return;
          field.addEventListener("change", updateContextSummary);
        });
      }
      updateGuidedToggleLabel();
      updateSimpleToggleLabel();
      applyI18n();
      if (userOnlyMode && !advancedMode) {
        document.body.classList.add("user-basic");
      }
      if (simpleUserModeEnabled) {
        document.body.classList.add("simple-user");
      }
      if (simpleDashboard && simpleUserModeEnabled) {
        simpleDashboard.classList.remove("hidden");
      }
      if (myTicketsSortSelect) {
        myTicketsSortSelect.value = myTicketsSort;
      }
      if (simpleModeToggle) {
        simpleModeToggle.style.display = "none";
      }
      if (adminCleanToggle) {
        adminCleanToggle.style.display = "none";
      }
      if (beginnerModeToggle) {
        beginnerModeToggle.style.display = "none";
      }

      if (apiBaseInput) {
        apiBaseInput.value = API_BASE;
      }

      function getToken() {
        return localStorage.getItem("assistant_token") || "";
      }

      function setToken(token) {
        if (token) {
          localStorage.setItem("assistant_token", token);
        } else {
          localStorage.removeItem("assistant_token");
        }
      }

      function setStatus(message, isError) {
        if (!loginStatus) return;
        loginStatus.textContent = message;
        loginStatus.className = isError ? "status error" : "status";
      }

      function setSimpleMode(enabled) {
        simpleModeEnabled = Boolean(enabled);
        localStorage.setItem(
          "assistant_simple_mode",
          simpleModeEnabled ? "on" : "off"
        );
        document.body.classList.toggle("simple-mode", simpleModeEnabled);
        if (simpleModeToggle) {
          simpleModeToggle.textContent = simpleModeEnabled
            ? t("toggle.simple.on")
            : t("toggle.simple.off");
        }
      }

      function setAdminClean(enabled) {
        adminCleanEnabled = Boolean(enabled);
        localStorage.setItem(
          "assistant_admin_clean",
          adminCleanEnabled ? "on" : "off"
        );
        document.body.classList.toggle("admin-clean", adminCleanEnabled);
        if (adminCleanToggle) {
          adminCleanToggle.textContent = adminCleanEnabled
            ? "Mode admin clair: ON"
            : "Mode admin clair";
        }
      }

      function setBeginnerMode(enabled) {
        beginnerModeEnabled = Boolean(enabled);
        localStorage.setItem(
          "assistant_beginner_mode",
          beginnerModeEnabled ? "on" : "off"
        );
        document.body.classList.toggle("beginner-mode", beginnerModeEnabled);
        if (beginnerModeToggle) {
          beginnerModeToggle.textContent = beginnerModeEnabled
            ? t("toggle.beginner.on")
            : t("toggle.beginner.off");
        }
      }

      function setBeginnerStep(text) {
        if (!beginnerStep) return;
        beginnerStep.textContent = text;
      }

      function setKioskWaiting(active) {
        document.body.classList.toggle("kiosk-waiting", Boolean(active));
      }

      function startUserRefreshTimer() {
        if (!userOnlyMode || userRefreshTimer) return;
        userRefreshTimer = setInterval(() => {
          if (document.hidden) return;
          if (getToken()) {
            loadMyTickets();
            if (conversationId) {
              loadConversationTickets(conversationId);
            }
          }
        }, 30000);
      }

      function stopUserRefreshTimer() {
        if (userRefreshTimer) {
          clearInterval(userRefreshTimer);
          userRefreshTimer = null;
        }
      }

      function setAuthState(isAuthed) {
        document.body.classList.toggle("unauthenticated", !isAuthed);
        if (loginCard) {
          loginCard.style.display = isAuthed ? "none" : "block";
        }
        if (
          !isAuthed &&
          document.body.classList.contains("require-auth") &&
          !document.body.classList.contains("login-only")
        ) {
          window.location.href = "/app/login/";
          return;
        }
        if (!isAuthed) {
          document.body.classList.remove("presentation-client");
          if (userPresentationToggle) {
            userPresentationToggle.textContent = t("toggle.presentation");
          }
        }
        if (showTicketsBtn) {
          showTicketsBtn.disabled = !isAuthed;
          showTicketsBtn.classList.toggle("disabled", !isAuthed);
        }
        if (showHistoryBtn) {
          showHistoryBtn.disabled = !isAuthed;
          showHistoryBtn.classList.toggle("disabled", !isAuthed);
        }
        if (!isAuthed && myTicketsPanel) {
          myTicketsPanel.classList.add("hidden");
        }
        if (!isAuthed && simpleDashboard) {
          simpleDashboard.classList.add("hidden");
        }
        if (!isAuthed && historyPanel) {
          historyPanel.classList.add("hidden");
        }
        if (!isAuthed) {
          latestTicketStatus = null;
          ticketStatusCache.clear();
          setConversationStatus("idle");
          hideNextStep();
          stopUserRefreshTimer();
        }
        const kioskStart = document.getElementById("kioskStart");
        if (kioskStart) {
          kioskStart.classList.add("hidden");
        }
        if (!isAuthed && loginCard) {
          loginCard.classList.add("login-focus");
          loginCard.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            loginCard.classList.remove("login-focus");
          }, 1200);
        }
      }

      function getViewRole() {
        return userOnlyMode ? "user" : currentRole;
      }

      async function tryKioskAutoLogin() {
        if (!kioskMode || getToken() || !quickUserBtn) {
          return;
        }
        const kioskStart = document.getElementById("kioskStart");
        if (userOnlyMode && kioskStart && !kioskStart.classList.contains("hidden")) {
          return;
        }
        try {
          setStatus(t("auth.autoLogin.start"), false);
          if (kioskStart) {
            kioskStart.classList.add("hidden");
          }
          await quickUserLogin();
          setAuthState(true);
          setStatus("", false);
          setBanner(null);
          await loadMe();
          setKioskWaiting(false);
          refreshAll();
        } catch (err) {
          setStatus(t("auth.autoLogin.fail"), true);
          setKioskWaiting(true);
          if (kioskStart) {
            kioskStart.classList.remove("hidden");
          }
        }
      }

      function normalizeApiBase(value) {
        return String(value || "")
          .trim()
          .replace(/\/+$/, "");
      }

      function reloadWithoutApiParam() {
        const url = new URL(window.location.href);
        url.searchParams.delete("api_base");
        window.location.href = url.toString();
      }

      function setCreateTicketState(state, labelOverride) {
        if (!createTicketBtn) return;
        createTicketBtn.classList.remove("success", "pending", "muted");
        createTicketBtn.disabled = false;
        if (state === "pending") {
          createTicketBtn.classList.add("pending");
          createTicketBtn.disabled = true;
          createTicketBtn.textContent = t("ticket.create.pending");
          return;
        }
        if (state === "created") {
          createTicketBtn.classList.add("success");
          createTicketBtn.disabled = true;
          createTicketBtn.textContent = labelOverride || t("ticket.create.created");
          return;
        }
        if (state === "exists") {
          createTicketBtn.classList.add("muted");
          createTicketBtn.disabled = true;
          createTicketBtn.textContent = labelOverride || t("ticket.create.exists");
          return;
        }
        createTicketBtn.textContent = createTicketDefaultLabel;
      }

      function setTicketBadgeState(state, ticket, count) {
        if (!ticketBadge) return;
        if (state === "hidden") {
          ticketBadge.classList.add("hidden");
          ticketBadge.innerHTML = "";
          return;
        }
        const label =
          state === "created"
            ? t("ticket.badge.created")
            : state === "exists"
              ? t("ticket.badge.exists")
              : t("ticket.badge.linked");
        const check =
          state === "created" ? `<span class="badge-check">OK</span>` : "";
        let details = "";
        if (ticket) {
          const parts = [];
          if (ticket.category) parts.push(ticket.category);
          if (ticket.priority) parts.push(ticket.priority);
          if (ticket.status) parts.push(ticket.status);
          if (parts.length) {
            details = `<span>${parts.join(" | ")}</span>`;
          }
        }
        const countLine =
          typeof count === "number"
            ? `<span>${t("ticket.badge.count", { count })}</span>`
            : "";
        const link =
          ticket && ticket.external_url
            ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">${t("ticket.badge.openGlpi")}</a>`
            : ticket
              ? `<span>${t("ticket.badge.local")}</span>`
              : "";
        ticketBadge.innerHTML = `<strong>${check}${label}</strong>${details}${countLine}${link ? link : ""}`;
        ticketBadge.classList.remove("hidden");
      }

      function showTicketPreview(draft) {
        if (!ticketPreview) return;
        pendingTicketDraft = draft || null;
        if (ticketPreviewTitle) {
          ticketPreviewTitle.textContent = (draft && draft.title) || "-";
        }
        if (ticketPreviewCategory) {
          ticketPreviewCategory.textContent = (draft && draft.category) || "-";
        }
        if (ticketPreviewPriority) {
          ticketPreviewPriority.textContent = (draft && draft.priority) || "-";
        }
        if (ticketPreviewSummary) {
          ticketPreviewSummary.textContent = (draft && draft.summary) || "-";
        }
        ticketPreview.classList.remove("hidden");
        ticketPreview.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function hideTicketPreview() {
        if (!ticketPreview) return;
        ticketPreview.classList.add("hidden");
        pendingTicketDraft = null;
      }

      function resetConversation() {
        conversationId = null;
        if (chatWindow) {
          chatWindow.innerHTML = "";
        }
        if (chatSources) {
          chatSources.textContent = "";
        }
        if (chatTickets) {
          chatTickets.textContent = "";
        }
        if (chatGallery) {
          chatGallery.classList.add("hidden");
        }
        if (chatGalleryGrid) {
          chatGalleryGrid.innerHTML = "";
        }
        if (feedbackBox) {
          feedbackBox.style.display = "none";
        }
        if (quickGuide) {
          quickGuide.classList.add("hidden");
        }
        if (quickGuideSteps) {
          quickGuideSteps.innerHTML = "";
        }
        if (ticketThanks) {
          ticketThanks.classList.add("hidden");
        }
        hideTicketPreview();
        if (feedbackHint) {
          feedbackHint.textContent = "";
        }
        if (userOnlyMode) {
          document.body.classList.add("show-chat-input");
        } else {
          document.body.classList.remove("show-chat-input");
        }
        if (quickIssueDetail) {
          quickIssueDetail.classList.add("hidden");
        }
        selectedQuickIssue = null;
        lastUserMessage = "";
        lastSources = [];
        chatSearchQuery = "";
        if (chatSearchInput) {
          chatSearchInput.value = "";
        }
        setCreateTicketState("idle");
        setTicketBadgeState("hidden");
        latestTicketStatus = null;
        lastTicketSelection = null;
        hideTicketDetail();
        setConversationStatus("idle");
        setNextStep({
          text: t("next.text"),
          showProcedure: false,
          showKb: false,
          showTicket: false
        });
        if (guidedModeEnabled) {
          guidedStepIndex = 0;
          showGuidedPrompt();
        } else {
          guidedStepIndex = null;
        }
        if (userOnlyMode && !guidedModeEnabled) {
          appendMessage("assistant", t("chat.welcome"));
        }
        if (beginnerModeEnabled) {
          setBeginnerStep(t("beginner.step1"));
        }
      }

      function focusChatInput() {
        const card = document.getElementById("kbCard");
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (chatForm && chatForm.elements && chatForm.elements.message) {
          setTimeout(() => chatForm.elements.message.focus(), 250);
        }
      }

      function startChatWithQuery(query) {
        const cleaned = (query || "").trim();
        if (!chatForm || !chatForm.elements || !chatForm.elements.message) {
          return;
        }
        document.body.classList.add("show-chat-input");
        setUserTab("assistant");
        resetConversation();
        chatForm.elements.message.value = cleaned;
        focusChatInput();
      }

      function goHome() {
        if (!userOnlyMode) return;
        const kioskStart = document.getElementById("kioskStart");
        if (!getToken()) {
          if (kioskStart) {
            kioskStart.classList.remove("hidden");
            kioskStart.classList.add("show");
          }
          setKioskWaiting(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (kioskStart) {
          kioskStart.classList.add("hidden");
          kioskStart.classList.remove("show");
        }
        setKioskWaiting(false);
        if (guidedModeEnabled && guidedStepIndex === null && !conversationId) {
          guidedStepIndex = 0;
          showGuidedPrompt();
        }
        focusChatInput();
      }

      function showTicketThanks(state) {
        if (!ticketThanks) return;
        if (ticketThanksMsg) {
          ticketThanksMsg.textContent =
            state === "exists"
              ? "Votre ticket est deja enregistre."
              : "Votre ticket a ete cree. Un technicien va vous recontacter.";
        }
        if (ticketThanksTitle) {
          ticketThanksTitle.textContent = pendingTicketDraft?.title || "-";
        }
        if (ticketThanksDetails) {
          const details = pendingTicketDraft
            ? `${pendingTicketDraft.category || "-"} | ${pendingTicketDraft.priority || "-"}`
            : "-";
          ticketThanksDetails.textContent = details;
        }
        if (ticketThanksEta) {
          ticketThanksEta.textContent = buildSlaEtaText();
        }
        ticketThanks.classList.remove("hidden");
        ticketThanks.scrollIntoView({ behavior: "smooth", block: "center" });
        if (beginnerModeEnabled) {
          setBeginnerStep(t("beginner.step4.ticket"));
        }
      }

      function buildSlaEtaText() {
        const hours = Number(supportMeta.slaHours || 0);
        const supportLabel = supportConfig && supportConfig.label ? supportConfig.label : "";
        if (!hours) {
          return supportLabel ? `Support: ${supportLabel}` : "Support: horaire standard";
        }
        if (supportConfig && supportConfig.alwaysOpen) {
          return `Estimation: ${hours}h (support 24/7)`;
        }
        const status = getSupportStatus(new Date());
        const nextOpen = getNextOpeningDate(new Date());
        if (status.includes("ferme") && nextOpen) {
          return `Estimation: ${hours}h. Reprise ${formatDateShort(nextOpen)}.`;
        }
        return supportLabel
          ? `Estimation: ${hours}h (support ${supportLabel})`
          : `Estimation: ${hours}h`;
      }

      function getSupportStatus(date) {
        if (supportConfig.alwaysOpen) {
          return "Support ouvert 24/7";
        }
        const day = date.getDay(); // 0 = Sunday
        const hour = date.getHours();
        const isOpen =
          supportConfig.days.includes(day) &&
          hour >= supportConfig.openHour &&
          hour < supportConfig.closeHour;
        return isOpen
          ? `Support ouvert (ferme a ${supportConfig.closeHour}h)`
          : "Support ferme actuellement";
      }

      function getNextOpeningDate(now) {
        if (supportConfig.alwaysOpen) {
          return null;
        }
        const openHour = supportConfig.openHour;
        const closeHour = supportConfig.closeHour;
        const nowDay = now.getDay();
        const isTodayOpenDay = supportConfig.days.includes(nowDay);
        const isOpenNow =
          isTodayOpenDay && now.getHours() >= openHour && now.getHours() < closeHour;

        if (isOpenNow) {
          for (let i = 1; i <= 7; i += 1) {
            const next = new Date(now);
            next.setDate(now.getDate() + i);
            if (supportConfig.days.includes(next.getDay())) {
              next.setHours(openHour, 0, 0, 0);
              return next;
            }
          }
          return null;
        }

        if (isTodayOpenDay) {
          const todayOpen = new Date(now);
          todayOpen.setHours(openHour, 0, 0, 0);
          if (now < todayOpen) {
            return todayOpen;
          }
        }

        for (let i = 1; i <= 7; i += 1) {
          const next = new Date(now);
          next.setDate(now.getDate() + i);
          if (supportConfig.days.includes(next.getDay())) {
            next.setHours(openHour, 0, 0, 0);
            return next;
          }
        }
        return null;
      }

      function capitalize(text) {
        if (!text) return "";
        return text.charAt(0).toUpperCase() + text.slice(1);
      }

      function truncateText(text, max = 120) {
        if (!text) return "";
        const trimmed = text.trim();
        if (trimmed.length <= max) return trimmed;
        return `${trimmed.slice(0, max - 1)}…`;
      }

      function isSameDay(a, b) {
        return (
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate()
        );
      }

      function formatSupportNext(date) {
        const next = getNextOpeningDate(date);
        if (!next) {
          return "Toujours ouvert";
        }
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (isSameDay(next, date)) {
          return "Aujourd'hui a 9h";
        }
        if (isSameDay(next, tomorrow)) {
          return "Demain a 9h";
        }
        const includeYear =
          next.getFullYear() !== date.getFullYear() ||
          date.getMonth() === 11 ||
          date.getMonth() === 0;
        const formatted = new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          ...(includeYear ? { year: "numeric" } : {})
        }).format(next);
        return `${capitalize(formatted)} a 9h`;
      }

      function formatTimezoneLabel(date) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
        const offsetMinutes = -date.getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? "+" : "-";
        const abs = Math.abs(offsetMinutes);
        const hours = String(Math.floor(abs / 60)).padStart(2, "0");
        const minutes = String(abs % 60).padStart(2, "0");
        return `${tz} (UTC${sign}${hours}:${minutes})`;
      }

      function updateSupportStatus() {
        if (!supportStatusText) return;
        const now = new Date();
        supportStatusText.textContent = getSupportStatus(now);
        if (supportNextText) {
          supportNextText.textContent = formatSupportNext(now);
        }
        if (supportHoursText) {
          supportHoursText.textContent = supportConfig.label;
        }
        if (supportTimezoneText) {
          supportTimezoneText.textContent = formatTimezoneLabel(now);
        }
      }

      function togglePanel(panel, show) {
        if (!panel) return;
        panel.classList.toggle("hidden", !show);
        if (show) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      function ensureWelcomeMessage() {
        if (!chatWindow || chatWindow.children.length > 0) return;
        appendMessage("assistant", t("assistant.welcome"));
      }

      function setUserTab(tab) {
        if (!assistantTabPanel || !kbTabPanel) return;
        const isKb = tab === "kb";
        assistantTabPanel.classList.toggle("hidden", isKb);
        kbTabPanel.classList.toggle("hidden", !isKb);
        if (assistantTabBtn) {
          assistantTabBtn.classList.toggle("active", !isKb);
        }
        if (kbTabBtn) {
          kbTabBtn.classList.toggle("active", isKb);
        }
        if (!isKb) {
          document.body.classList.add("show-chat-input");
          ensureWelcomeMessage();
        }
        if (isKb && kbSearchInputUser) {
          kbSearchInputUser.focus();
        }
        if (isKb && kbSearchResultsUser && !kbSearchResultsUser.innerHTML.trim()) {
          kbSearchResultsUser.innerHTML = `<div class="ticket-empty">${t(
            "kb.emptyHint"
          )}</div>`;
        }
      }

      function normalizeSearchText(value) {
        return (value || "").toString().toLowerCase().trim();
      }

      function setUserPresentation(enabled) {
        userPresentationEnabled = Boolean(enabled);
        localStorage.setItem(
          "assistant_user_presentation",
          userPresentationEnabled ? "1" : "0"
        );
        document.body.classList.toggle("presentation-client", userPresentationEnabled);
        if (userPresentationToggle) {
          userPresentationToggle.textContent = userPresentationEnabled
            ? t("toggle.presentation.leave")
            : t("toggle.presentation");
        }
      }

      function getKbLevel(item) {
        const title = normalizeSearchText(item.document_title || "");
        if (title.includes("infra") || title.includes("reseau") || title.includes("réseau")) {
          return "infra";
        }
        if (title.includes("(n1)")) return "n1";
        if (title.includes("(n2)")) return "n2";
        if (title.includes("(n3)")) return "n3";
        return "general";
      }

      function filterKbItemsByLevel(items) {
        const level = kbLevelFilter ? kbLevelFilter.value : "all";
        if (!level || level === "all") return items;
        if (level === "n3") {
          return items.filter((item) => {
            const detected = getKbLevel(item);
            return detected === "n3" || detected === "infra";
          });
        }
        return items.filter((item) => getKbLevel(item) === level);
      }

      function localizeIssue(issue) {
        if (!issue) return null;
        const key = issue.key || "";
        return {
          ...issue,
          label: getIssueLabel(key, issue.label || issue.title || key),
          message: getIssueMessage(
            key,
            issue.message || issue.example || issue.label || issue.title || key
          )
        };
      }

      function updatePresentationKpis({ total, open, resolved, last }) {
        if (!presentationKpis) return;
        if (presentationKpiTotal) {
          presentationKpiTotal.textContent = String(total ?? 0);
        }
        if (presentationKpiOpen) {
          presentationKpiOpen.textContent = String(open ?? 0);
        }
        if (presentationKpiResolved) {
          presentationKpiResolved.textContent = String(resolved ?? 0);
        }
        if (presentationKpiLast) {
          presentationKpiLast.textContent = last || "-";
        }
      }

      function refreshQuickIssueLabels() {
        if (!quickIssuesContainer) return;
        const chips = Array.from(quickIssuesContainer.querySelectorAll(".chip"));
        if (!chips.length) return;
        chips.forEach((btn) => {
          const key = btn.getAttribute("data-quick") || "";
          const labelEl =
            btn.querySelector(".chip-label") ||
            btn.querySelector(".chip-text") ||
            btn.querySelector("span:last-child");
          if (labelEl) {
            labelEl.textContent = getIssueLabel(key, labelEl.textContent || "");
          }
        });
      }

      function bindQuickIssueButton(btn, keyOverride, messageOverride) {
        if (!btn) return;
        btn.addEventListener("click", async () => {
          const key = keyOverride || btn.getAttribute("data-quick");
          const message = getIssueMessage(key, messageOverride || key || "");
          if (!message) return;
          const rawLabel = (btn.textContent || "").toString().trim();
          const label = getIssueLabel(key, rawLabel || message);
          selectedQuickIssue = { key, message, label };
          showQuickIssueDetail(selectedQuickIssue);
        });
      }

      function showQuickIssueDetail(issue) {
        if (!quickIssueDetail) return;
        const localized = localizeIssue(issue) || issue;
        if (quickDetailTitle) {
          quickDetailTitle.textContent =
            localized.label || t("quick.detail.title");
        }
        if (quickDetailMessage) {
          quickDetailMessage.textContent = localized.message || "";
        }
        quickIssueDetail.classList.remove("hidden");
        quickIssueDetail.scrollIntoView({ behavior: "smooth", block: "start" });
        const guide = getQuickIssueGuide(localized.key, localized.label);
        setNextStep({
          text:
            guide && guide.steps && guide.steps.length
              ? t("next.suggestion", { step: guide.steps[0] })
              : t("next.suggestionFallback"),
          showProcedure: Boolean(guide),
          showKb: false,
          showTicket: false
        });
      }

      function hideQuickIssueDetail() {
        if (!quickIssueDetail) return;
        quickIssueDetail.classList.add("hidden");
      }

      function showQuickProcedure(issue) {
        if (!issue) return;
        const guide = getQuickIssueGuide(issue.key, issue.label);
        if (!guide) {
          if (!quickGuide || !quickGuideSteps) return;
          if (quickGuideTitle) {
            quickGuideTitle.textContent = t("guide.procedureTitle");
          }
          quickGuideSteps.innerHTML =
            `<div class="guide-step"><strong>${t(
              "guide.info"
            )}</strong><span>${t("guide.noProcedure")}</span></div>`;
          if (quickGuideNote) {
            quickGuideNote.textContent = t("guide.newCases");
          }
          quickGuide.classList.remove("hidden");
          quickGuide.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        showQuickGuide(issue.key);
        if (quickGuideNote) {
          quickGuideNote.textContent = t("guide.note");
        }
      }

      function hydrateQuickIssuesCacheFromDom() {
        if (!quickIssuesContainer) return;
        const chips = Array.from(quickIssuesContainer.querySelectorAll(".chip"));
        if (!chips.length) return;
        quickIssuesCache = chips
          .map((chip) => {
            const key = chip.getAttribute("data-quick") || "";
            const label = (chip.textContent || "").toString().trim();
            return {
              key,
              label,
              message: getIssueMessage(key, label)
            };
          })
          .filter((item) => item.label);
      }

      function renderQuickIssues(items, options = {}) {
        if (!quickIssuesContainer) return;
        if (quickIssueDetail) {
          quickIssueDetail.classList.add("hidden");
        }
        selectedQuickIssue = null;
        if (!options.preserveCache) {
          quickIssuesCache = Array.isArray(items) ? items.slice() : [];
        }
        if (!items || !items.length) {
          const query = (options.query || "").toString().trim();
          if (query) {
            quickIssuesContainer.innerHTML = `
              <div class="ticket-empty">
                ${t("quick.noResults", { query: escapeHtml(query) })}
                <div class="empty-actions">
                  <button class="btn primary" type="button" id="quickIssueChatBtn">
                    ${t("quick.startChat")}
                  </button>
                </div>
              </div>
            `;
            const chatBtn = document.getElementById("quickIssueChatBtn");
            if (chatBtn) {
              chatBtn.addEventListener("click", () => startChatWithQuery(query));
            }
          } else {
            quickIssuesContainer.innerHTML =
              `<div class="ticket-empty">${t("quick.none")}</div>`;
          }
          return;
        }
        quickIssuesContainer.innerHTML = "";
        items.forEach((item) => {
          const localized = localizeIssue(item) || item;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip";
          btn.setAttribute("data-quick", localized.key || "");
          const icon = document.createElement("span");
          icon.className = "chip-icon";
          icon.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.className = "chip-label";
          label.textContent = localized.label || t("quick.detail.title");
          btn.appendChild(icon);
          btn.appendChild(label);
          quickIssuesContainer.appendChild(btn);
          bindQuickIssueButton(btn, localized.key, localized.message);
        });
      }

      function filterQuickIssuesLocal(query) {
        if (!quickIssuesCache.length) {
          hydrateQuickIssuesCacheFromDom();
        }
        const normalized = normalizeSearchText(query);
        if (!normalized) {
          renderQuickIssues(quickIssuesCache, { preserveCache: true });
          return;
        }
        const filtered = quickIssuesCache.filter((item) => {
          const label = normalizeSearchText(getIssueLabel(item.key, item.label));
          const message = normalizeSearchText(
            getIssueMessage(item.key, item.message || item.example || item.label)
          );
          return label.includes(normalized) || message.includes(normalized);
        });
        renderQuickIssues(filtered, { preserveCache: true, query });
      }

      function getQuickIssueMessage(key) {
        return getIssueMessage(key, key || "");
      }

      function getQuickIssueGuide(key, labelOverride) {
        const resolved = resolveIssueKey(key);
        const templateKey = issueTemplateMap[resolved] || "generic";
        const steps = buildGuideSteps(templateKey);
        if (!steps.length) return null;
        const label = labelOverride || getIssueLabel(resolved, resolved);
        const title = t("guide.template.title", {
          label: label || t("guide.title")
        });
        return { title, steps };
      }

      function showQuickGuide(key) {
        if (!quickGuide || !quickGuideSteps) return;
        const guide = getQuickIssueGuide(key);
        if (!guide) {
          quickGuide.classList.add("hidden");
          quickGuideSteps.innerHTML = "";
          return;
        }
        if (quickGuideTitle) {
          quickGuideTitle.textContent = guide.title || t("guide.title");
        }
        quickGuideSteps.innerHTML = guide.steps
          .map(
            (step, index) =>
              `<div class="guide-step"><strong>${t("guide.stepLabel", {
                index: index + 1
              })}</strong><span>${step}</span></div>`
          )
          .join("");
        if (quickGuideNote) {
          quickGuideNote.textContent = t("guide.note");
        }
        quickGuide.classList.remove("hidden");
      }

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      async function waitForChatIdle() {
        let guard = 0;
        while (chatBusy && guard < 50) {
          await sleep(200);
          guard += 1;
        }
      }

      async function runUserTestScenario() {
        if (scenarioRunning) return;
        if (!getToken()) {
          setStatus(t("auth.connectBeforeTest"), true);
          notify(t("auth.connectBeforeTest"), "error");
          return;
        }
        scenarioRunning = true;
        resetConversation();
        ensureWelcomeMessage();
        await sleep(400);
        const issueMessage =
          getIssueMessage("outlook", t("issue.outlook.message")) ||
          t("issue.outlook.message");
        await sendChatMessage(issueMessage);
        await waitForChatIdle();
        await sleep(600);
        await sendChatMessage(t("reply.stillSame"), { keepGuide: true });
        await waitForChatIdle();
        await sleep(400);
        if (createTicketBtn && !createTicketBtn.disabled) {
          createTicketBtn.click();
        }
        scenarioRunning = false;
      }

      async function sendChatMessage(message, options = {}) {
        const cleaned = (message || "").trim();
        if (!cleaned) return;
        if (cleaned.length > 2000) {
          notify(t("chat.tooLong"), "error");
          return;
        }
        if (!getToken()) {
          setStatus(t("auth.connectBeforeMessage"), true);
          notify(t("auth.connectBeforeMessage"), "error");
          return;
        }
        if (guidedModeEnabled) {
          const guided = advanceGuidedFlow(cleaned);
          if (guided.handled) {
            appendMessage("user", cleaned);
            return;
          }
        }
        if (chatBusy) return;
        if (!options.keepGuide) {
          if (quickGuide) {
            quickGuide.classList.add("hidden");
          }
          if (quickGuideSteps) {
            quickGuideSteps.innerHTML = "";
          }
        }
        if (ticketThanks) {
          ticketThanks.classList.add("hidden");
        }
        hideTicketPreview();
        pendingTicketDraft = null;
        appendMessage("user", cleaned);
        lastUserMessage = cleaned;
        if (chatSearchQuery) {
          chatSearchQuery = "";
          if (chatSearchInput) chatSearchInput.value = "";
        }
        if (beginnerModeEnabled) {
          setBeginnerStep(t("beginner.step2"));
        }
        if (chatForm) {
          chatForm.reset();
        }
        try {
          setBanner(null);
          setChatBusyState(true);
          showTyping();
          const payload = { message: cleaned, language: currentLang };
          const contextPayload = getContextPayload();
          if (contextPayload) {
            payload.context = contextPayload;
          }
          if (conversationId) payload.conversation_id = conversationId;
          const data = await fetchWithAuth("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          conversationId = data.conversation_id;
          hideTyping();
          setChatBusyState(false);
          appendMessage("assistant", data.answer || "");
          if (beginnerModeEnabled) {
            setBeginnerStep(t("beginner.step3"));
          }
          renderSources(data.sources || []);
          lastSources = data.sources || [];
          if (typeof data.failure_count === "number" && typeof data.threshold === "number") {
            updateFailureHint(data.failure_count, data.threshold);
          }
          if (data.quick_issue && data.quick_issue.is_new) {
            notify(
              t("quick.added", { label: data.quick_issue.label }),
              "info"
            );
          }
          if (getViewRole() === "user") {
            loadQuickIssues();
          }
          loadConversations();
          loadConversationTickets(conversationId);
          if (feedbackBox) {
            feedbackBox.style.display = "flex";
          }
          if (userOnlyMode && chatWindow) {
            const shouldScroll = chatWindow.scrollHeight > chatWindow.clientHeight;
            if (shouldScroll) {
              chatWindow.scrollTop = chatWindow.scrollHeight;
            }
          }
          if (data.ticket) {
            setCreateTicketState("exists");
            setTicketBadgeState("created", data.ticket);
            pendingTicketDraft = {
              title: data.ticket.title,
              summary: data.ticket.description,
              category: data.ticket.category,
              priority: data.ticket.priority
            };
            showTicketThanks("created");
            latestTicketStatus = data.ticket.status || "open";
            setConversationStatus("escalated");
            setNextStep({
              text: "Un ticket a ete cree. Vous pouvez suivre sa resolution.",
              showProcedure: false,
              showKb: false,
              showTicket: false,
              replies: []
            });
            if (beginnerModeEnabled) {
            setBeginnerStep(t("beginner.step4.ticket"));
            }
            if (getViewRole() === "user") {
              loadMyTickets();
            } else {
              loadTickets();
            }
          } else {
            setConversationStatus("open");
            if (data.needs_ticket) {
              setNextStep({
                text: "Nous recommandons de creer un ticket pour la suite.",
                showProcedure: false,
                showKb: false,
                showTicket: true,
                replies: [
                  { label: "Toujours pareil", action: "message", payload: "Toujours pareil." },
                  { label: "C'est resolu", action: "resolve" }
                ]
              });
            } else if (selectedQuickIssue && getQuickIssueGuide(selectedQuickIssue.key)) {
              const guide = getQuickIssueGuide(selectedQuickIssue.key);
              const suggestion =
                guide && guide.steps && guide.steps.length
                  ? t("next.suggestion", { step: guide.steps[0] })
                  : t("next.suggestionFallback");
              setNextStep({
                text: suggestion,
                showProcedure: true,
                showKb: false,
                showTicket: false,
                replies: [
                  {
                    label: t("reply.restarted"),
                    action: "message",
                    payload: t("reply.restarted")
                  },
                  {
                    label: t("reply.stillSame"),
                    action: "message",
                    payload: t("reply.stillSame")
                  },
                  { label: t("reply.resolved"), action: "resolve" }
                ]
              });
            } else if (lastSources && lastSources.length) {
              const snippet = (lastSources[0].snippet || "").trim();
              setNextStep({
                text: snippet
                  ? t("next.suggestion", { step: snippet })
                  : t("next.kbAvailable"),
                showProcedure: false,
                showKb: true,
                showTicket: false,
                replies: [
                  {
                    label: t("reply.tested"),
                    action: "message",
                    payload: `${t("reply.tested")}, ${t("reply.stillSame")}`
                  },
                  { label: t("reply.resolved"), action: "resolve" }
                ]
              });
            } else {
              setNextStep({
                text: t("next.moreDetails"),
                showProcedure: false,
                showKb: true,
                showTicket: false,
                replies: [
                  {
                    label: t("reply.loginIssue"),
                    action: "message",
                    payload: t("reply.loginIssue")
                  },
                  {
                    label: getIssueLabel("internet", t("reply.noInternet")),
                    action: "message",
                    payload: getIssueMessage("internet", t("reply.noInternet"))
                  }
                ]
              });
            }
          }
        } catch (err) {
          hideTyping();
          setChatBusyState(false);
          appendMessage("assistant", t("error.backend"));
          setBanner(t("error.serverUnavailable"), "info");
          notify(t("error.backendUnavailable"), "error");
        }
      }

      async function uploadChatImage(file) {
        if (!file) return;
        if (!file.type || !file.type.startsWith("image/")) {
          notify(t("upload.imageOnly"), "error");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          notify(t("upload.imageTooLarge"), "error");
          return;
        }
        if (!getToken()) {
          setStatus(t("auth.connectBeforeImage"), true);
          notify(t("auth.connectBeforeImage"), "error");
          return;
        }
        if (chatBusy) return;
        const formData = new FormData();
        formData.append("file", file);
        if (conversationId) {
          formData.append("conversation_id", conversationId);
        }
        try {
          setBanner(null);
          setChatBusyState(true);
          const data = await fetchWithAuth("/chat/attachments", {
            method: "POST",
            body: formData
          });
          conversationId = data.conversation_id || conversationId;
          appendMessage("user", `${IMAGE_PREFIX}${data.url}`);
          if (conversationId) {
            const cacheKey = `cache_history_${conversationId}`;
            const cached = getCache(cacheKey, []);
            cached.push({
              role: "user",
              content: `${IMAGE_PREFIX}${data.url}`,
              created_at: new Date().toISOString()
            });
            setCache(cacheKey, cached);
            renderChatGallery(cached);
          }
          if (feedbackBox) {
            feedbackBox.style.display = "flex";
          }
          loadConversations();
        } catch (err) {
          notify(t("upload.imageFailed"), "error");
        } finally {
          setChatBusyState(false);
          focusChatInput();
        }
      }

      function setOrgStatus(message, isError) {
        if (!orgSettingsStatus) return;
        orgSettingsStatus.textContent = message;
        orgSettingsStatus.className = isError ? "status error" : "status";
      }

      function setOrgInfoStatus(message, isError) {
        if (!orgStatus) return;
        orgStatus.textContent = message;
        orgStatus.className = isError ? "status error" : "status";
      }

      function setTenantStatus(message, isError) {
        if (!tenantStatus) return;
        tenantStatus.textContent = message;
        tenantStatus.className = isError ? "status error" : "status";
      }

      function setInviteStatus(message, isError) {
        if (!inviteStatus) return;
        inviteStatus.textContent = message;
        inviteStatus.className = isError ? "status error" : "status";
      }

      function setInviteAcceptStatus(message, isError) {
        if (!inviteAcceptStatus) return;
        inviteAcceptStatus.textContent = message;
        inviteAcceptStatus.className = isError ? "status error" : "status";
      }

      function notify(message, type) {
        const div = document.createElement("div");
        div.className = type === "error" ? "toast error" : "toast";
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => div.classList.add("show"), 10);
        setTimeout(() => {
          div.classList.remove("show");
          setTimeout(() => div.remove(), 300);
        }, 2500);
      }

      function formatNumber(value, digits) {
        if (value === null || value === undefined) return "-";
        const num = Number(value);
        if (Number.isNaN(num)) return "-";
        if (typeof digits === "number") {
          const factor = 10 ** digits;
          return Math.round(num * factor) / factor;
        }
        return num;
      }

      async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.className = "copy-input";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      function formatDate(value) {
        if (!value) return "";
        return new Date(value).toLocaleString();
      }

      function formatDateShort(value) {
        if (!value) return "";
        return new Date(value).toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      const IMAGE_PREFIX = "__IMAGE__:";

      function getImageUrlFromMessage(text) {
        if (!text) return null;
        if (text.startsWith(IMAGE_PREFIX)) {
          const url = text.slice(IMAGE_PREFIX.length).trim();
          return url || null;
        }
        return null;
      }

      function formatMessageForSummary(text) {
        const imageUrl = getImageUrlFromMessage(text);
        return imageUrl ? t("chat.imageSent") : text;
      }

      function updateSummaryLastMessage(text) {
        const formatted = truncateText(formatMessageForSummary(text || ""), 120);
        if (summaryLast) {
          summaryLast.textContent = formatted || "-";
        }
        updatePresentationKpis({
          total: summaryTotal ? Number(summaryTotal.textContent) : 0,
          open: summaryOpen ? Number(summaryOpen.textContent) : 0,
          resolved: summaryResolved ? Number(summaryResolved.textContent) : 0,
          last: formatted || "-"
        });
      }

      function renderMessageHtml(text, query) {
        const imageUrl = getImageUrlFromMessage(text);
        if (imageUrl) {
          const safeUrl = escapeHtml(imageUrl);
          return {
            isImage: true,
            html: `<div class="image-attachment">
              <img src="${safeUrl}" alt="Capture" data-image-zoom="${safeUrl}" />
              <div class="image-actions">
                <button class="btn ghost image-zoom-btn" type="button" data-image-zoom="${safeUrl}">
                  Zoom
                </button>
                <a class="btn ghost" href="${safeUrl}" download>Telecharger</a>
              </div>
              <span class="image-caption">Capture jointe</span>
            </div>`
          };
        }
        return {
          isImage: false,
          html: query ? highlightText(text || "", query) : escapeHtml(text || "")
        };
      }

      function openImageLightbox(url) {
        if (!imageLightbox || !imageLightboxImg || !url) return;
        imageLightboxImg.src = url;
        if (imageLightboxDownload) {
          imageLightboxDownload.href = url;
          imageLightboxDownload.setAttribute("download", "capture");
        }
        imageLightbox.classList.remove("hidden");
        imageLightbox.setAttribute("aria-hidden", "false");
      }

      function closeImageLightbox() {
        if (!imageLightbox || !imageLightboxImg) return;
        imageLightboxImg.src = "";
        imageLightbox.classList.add("hidden");
        imageLightbox.setAttribute("aria-hidden", "true");
      }

      function extractImageUrls(items) {
        const urls = (items || [])
          .map((msg) => getImageUrlFromMessage(msg.content || ""))
          .filter(Boolean);
        return Array.from(new Set(urls));
      }

      function countImagesInText(text) {
        if (!text) return 0;
        const matches = String(text).match(/\/uploads\/[^\s)]+/g);
        return matches ? matches.length : 0;
      }

      function extractImageUrlsFromText(text) {
        if (!text) return [];
        const matches = String(text).match(/\/uploads\/[^\s)]+/g) || [];
        return Array.from(new Set(matches));
      }

      function renderTicketImages(text) {
        if (!ticketDetailImages || !ticketDetailImagesGrid) return;
        const urls = extractImageUrlsFromText(text);
        if (!urls.length) {
          ticketDetailImages.classList.add("hidden");
          ticketDetailImagesGrid.innerHTML = "";
          if (ticketDetailImagesCount) {
            ticketDetailImagesCount.textContent = "";
          }
          return;
        }
        ticketDetailImages.classList.remove("hidden");
        if (ticketDetailImagesCount) {
          ticketDetailImagesCount.textContent = `(${urls.length})`;
        }
        ticketDetailImagesGrid.innerHTML = urls
          .map((url) => {
            const safeUrl = escapeHtml(url);
            return `<button class="gallery-item" type="button" data-image-zoom="${safeUrl}">
              <img src="${safeUrl}" alt="Capture" />
            </button>`;
          })
          .join("");
      }

      function renderChatGallery(items) {
        if (!chatGallery || !chatGalleryGrid) return;
        const urls = extractImageUrls(items);
        if (!urls.length) {
          chatGallery.classList.add("hidden");
          chatGalleryGrid.innerHTML = "";
          if (chatGalleryCount) {
            chatGalleryCount.textContent = "";
          }
          if (chatGalleryEmpty) {
            chatGalleryEmpty.textContent = t("chat.galleryEmpty");
          }
          return;
        }
        chatGallery.classList.remove("hidden");
        if (chatGalleryCount) {
          chatGalleryCount.textContent = `(${urls.length})`;
        }
        chatGalleryGrid.innerHTML = urls
          .map((url) => {
            const safeUrl = escapeHtml(url);
            return `<button class="gallery-item" type="button" data-image-zoom="${safeUrl}">
              <img src="${safeUrl}" alt="Capture" />
            </button>`;
          })
          .join("");
      }

      function loadReminderCache() {
        const raw = localStorage.getItem("assistant_ticket_reminders");
        if (!raw) return {};
        try {
          return JSON.parse(raw);
        } catch (err) {
          return {};
        }
      }

      function saveReminderCache(cache) {
        localStorage.setItem("assistant_ticket_reminders", JSON.stringify(cache));
      }

      function checkTicketReminders(items) {
        if (!items || !items.length) return;
        const cache = loadReminderCache();
        const now = Date.now();
        const today = new Date().toISOString().slice(0, 10);
        let changed = false;
        items.forEach((ticket) => {
          const status = (ticket.status || "open").toLowerCase();
          if (status !== "open" && status !== "pending") return;
          const created = ticket.created_at ? new Date(ticket.created_at).getTime() : null;
          if (!created) return;
          const hours = (now - created) / 36e5;
          if (hours < reminderHours) return;
          const last = cache[ticket.id];
          if (last === today) return;
          cache[ticket.id] = today;
          changed = true;
          notify(
            t("ticket.reminder.open", {
              title: ticket.title || t("ticket.defaultTitle"),
              hours: Math.floor(hours)
            }),
            "info"
          );
        });
        if (changed) {
          saveReminderCache(cache);
        }
      }

      function renderTicketReminders(items) {
        if (!ticketRemindersCard || !ticketRemindersList) return;
        const now = Date.now();
        const overdue = (items || []).filter((ticket) => {
          const status = (ticket.status || "open").toLowerCase();
          if (status !== "open" && status !== "pending") return false;
          const created = ticket.created_at ? new Date(ticket.created_at).getTime() : null;
          if (!created) return false;
          const hours = (now - created) / 36e5;
          return hours >= reminderHours;
        });
        if (!overdue.length) {
          ticketRemindersCard.classList.add("hidden");
          ticketRemindersList.innerHTML = "";
          return;
        }
        ticketRemindersCard.classList.remove("hidden");
        ticketRemindersList.innerHTML = overdue
          .map((ticket) => {
            const created = ticket.created_at ? new Date(ticket.created_at).getTime() : null;
            const hours = created ? Math.floor((now - created) / 36e5) : 0;
            const canResume = Boolean(ticket.conversation_id);
            return `<div class="reminder-item">
              <strong>${ticket.title || t("ticket.defaultTitle")}</strong>
              <span>${ticket.category || "-"} | ${ticket.priority || "-"} | ${
                ticket.status || "-"
              }</span>
              <span>${t("ticket.reminder.openSince", { hours })}</span>
              ${
                canResume
                  ? `<button class="btn ghost reminder-followup-btn" data-ticket-convo="${ticket.conversation_id}" data-ticket-title="${ticket.title || t("ticket.defaultTitle")}">${t("ticket.reminder.followup")}</button>`
                  : `<span class="muted">${t("ticket.reminder.noConversation")}</span>`
              }
            </div>`;
          })
          .join("");
        document.querySelectorAll(".reminder-followup-btn").forEach((button) => {
          button.addEventListener("click", async () => {
            const convoId = button.getAttribute("data-ticket-convo");
            const title =
              button.getAttribute("data-ticket-title") || t("ticket.defaultTitle");
            if (!convoId) return;
            togglePanel(myTicketsPanel, false);
            await loadConversationHistory(convoId);
            await sendChatMessage(t("ticket.reminder.followupMessage", { title }));
            focusChatInput();
          });
        });
      }

      function highlightText(text, query) {
        const safe = escapeHtml(text);
        const q = (query || "").toString().trim();
        if (!q) return safe;
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return safe.replace(
          new RegExp(escaped, "gi"),
          (match) => `<mark>${match}</mark>`
        );
      }

      function renderChatHistory(items, query) {
        if (!chatWindow) return;
        const q = (query || "").toString().trim();
        chatWindow.innerHTML = "";
        const fragment = document.createDocumentFragment();
        items.forEach((msg) => {
          const role = msg.role === "assistant" ? "assistant" : "user";
          const bubble = document.createElement("div");
          bubble.className = `bubble ${role}`;
          const rendered = renderMessageHtml(msg.content || "", q);
          bubble.innerHTML = rendered.html;
          if (rendered.isImage) {
            bubble.classList.add("image");
          }
          fragment.appendChild(bubble);
        });
        chatWindow.appendChild(fragment);
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }

      function isNearBottom(el) {
        if (!el) return true;
        const threshold = 60;
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      }

      async function buildConversationSummary() {
        if (!conversationId) {
          return { ok: false, message: t("summary.noConversation") };
        }
        let history = getCache(`cache_history_${conversationId}`, []);
        if (!history.length) {
          try {
            const data = await fetchWithAuth(
              `/chat/history?conversation_id=${conversationId}`
            );
            history = data.items || [];
            setCache(`cache_history_${conversationId}`, history);
          } catch (err) {
            return { ok: false, message: t("summary.historyUnavailable") };
          }
        }
        const tickets = getCache(`cache_tickets_${conversationId}`, []);
        const header = [
          t("summary.header.conversation", { id: conversationId }),
          t("summary.header.updated", {
            date: history.length
              ? formatDate(history[history.length - 1].created_at)
              : "-"
          }),
          t("summary.header.status", { status: conversationStatus || "open" })
        ];
        const body = history.map((msg) => {
          const label =
            msg.role === "assistant"
              ? t("summary.role.assistant")
              : t("summary.role.user");
          return `${label}: ${formatMessageForSummary(msg.content)}`;
        });
        const ticketLines = tickets.length
          ? [
              "",
              t("summary.ticketsLabel"),
              ...tickets.map(
                (t) =>
                  `- ${t.title} (${t.status || "-"} | ${t.priority || "-"} | ${t.category || "-"})`
              )
            ]
          : [];
        const text = [...header, "", ...body, ...ticketLines].join("\n");
        return { ok: true, text };
      }

      async function refreshChatSearch() {
        if (!conversationId) return;
        const cached = getCache(`cache_history_${conversationId}`, []);
        if (cached.length) {
          renderChatHistory(cached, chatSearchQuery);
          return;
        }
        try {
          const data = await fetchWithAuth(
            `/chat/history?conversation_id=${conversationId}`
          );
          const items = data.items || [];
          setCache(`cache_history_${conversationId}`, items);
          renderChatHistory(items, chatSearchQuery);
        } catch (err) {
          // ignore
        }
      }

      function getContextPayload() {
        const payload = {};
        if (contextDevice && contextDevice.value) payload.device = contextDevice.value;
        if (contextOs && contextOs.value) payload.os = contextOs.value;
        if (contextLocation && contextLocation.value) {
          payload.location = contextLocation.value;
        }
        if (contextUrgency && contextUrgency.value) {
          payload.urgency = contextUrgency.value;
        }
        return Object.keys(payload).length ? payload : null;
      }

      function formatContextSummary(context) {
        const valueMap = {
          "PC fixe": "context.option.desktop",
          "PC HP": "context.option.hp",
          Laptop: "context.option.laptop",
          Mobile: "context.option.mobile",
          Windows: "context.option.windows",
          "Windows 11": "context.option.win11",
          macOS: "context.option.macos",
          Linux: "context.option.linux",
          Autre: "context.option.other",
          Siege: "context.option.site.hq",
          Teletravail: "context.option.site.remote",
          Agence: "context.option.site.branch",
          Client: "context.option.site.client",
          Haute: "context.option.urgency.high",
          Critique: "context.option.urgency.critical"
        };
        const translateValue = (value) => {
          const key = valueMap[value];
          return key ? t(key) : value;
        };
        if (!context) return t("context.summary");
        const parts = [];
        if (context.device) parts.push(translateValue(context.device));
        if (context.os) parts.push(translateValue(context.os));
        if (context.location) parts.push(translateValue(context.location));
        if (context.urgency) {
          parts.push(`${t("context.urgency")} ${translateValue(context.urgency)}`);
        }
        if (!parts.length) return t("context.summary");
        return t("context.active", { items: parts.join(" | ") });
      }

      function updateContextSummary() {
        if (!contextSummary) return;
        const context = getContextPayload();
        contextSummary.textContent = formatContextSummary(context);
      }

      function setConversationStatus(status, note) {
        conversationStatus = status || "idle";
        updateTimeline(note);
      }

      function updateTimeline(note) {
        if (!timelineSteps || !timelineSteps.length) return;
        const stepState = {
          assistant: false,
          ticket: false,
          resolved: false
        };
        if (conversationStatus === "open" || conversationStatus === "escalated") {
          stepState.assistant = true;
        }
        if (conversationStatus === "escalated" || latestTicketStatus) {
          stepState.assistant = true;
          stepState.ticket = true;
        }
        if (latestTicketStatus === "resolved" || latestTicketStatus === "closed") {
          stepState.assistant = true;
          stepState.ticket = true;
          stepState.resolved = true;
        }
        timelineSteps.forEach((step) => {
          const key = step.getAttribute("data-step");
          step.classList.remove("active", "done");
          if (key && stepState[key]) {
            step.classList.add(key === "resolved" ? "done" : "active");
          }
        });
        if (statusNote) {
          if (note) {
            statusNote.textContent = note;
          } else if (stepState.resolved) {
            statusNote.textContent = t("status.note.resolved");
          } else if (stepState.ticket) {
            statusNote.textContent = t("status.note.ticket");
          } else if (stepState.assistant) {
            statusNote.textContent = t("status.note.assistant");
          } else {
            statusNote.textContent = t("status.note.waiting");
          }
        }
        updateStatusPill();
      }

      function updateStatusPill() {
        if (!statusPill) return;
        const labelMap = {
          idle: t("status.waiting"),
          open: t("status.step.assistant"),
          escalated: t("status.step.ticket"),
          resolved: t("status.step.resolved")
        };
        const status = conversationStatus || "idle";
        statusPill.textContent = labelMap[status] || "En attente";
        statusPill.className = `status-pill ${status}`;
      }

      function setNextStep(options) {
        if (!nextStepCard || !nextStepText) return;
        const opts = options || {};
        nextStepText.textContent = opts.text || t("next.text");
        if (nextStepProcedureBtn) {
          nextStepProcedureBtn.style.display = opts.showProcedure ? "inline-flex" : "none";
        }
        if (nextStepKbBtn) {
          nextStepKbBtn.style.display = opts.showKb ? "inline-flex" : "none";
        }
        if (nextStepTicketBtn) {
          nextStepTicketBtn.style.display = opts.showTicket ? "inline-flex" : "none";
        }
        nextStepCard.classList.remove("hidden");
        if (Array.isArray(opts.replies)) {
          setQuickReplies(opts.replies);
        } else {
          clearQuickReplies();
        }
      }

      guidedFlow = buildGuidedFlow();

      function applyGuidedAnswer(stepKey, value) {
        if (!value && stepKey !== "urgency") return;
        if (stepKey === "device" && contextDevice) contextDevice.value = value;
        if (stepKey === "os" && contextOs) contextOs.value = value;
        if (stepKey === "location" && contextLocation) contextLocation.value = value;
        if (stepKey === "urgency" && contextUrgency) contextUrgency.value = value;
        updateContextSummary();
      }

      function showGuidedPrompt() {
        if (guidedStepIndex === null) return;
        const step = guidedFlow[guidedStepIndex];
        if (!step) return;
        setNextStep({
          text: step.prompt,
          showProcedure: false,
          showKb: false,
          showTicket: false,
          replies: step.options.map((opt) => ({
            label: opt.label,
            action: "message",
            payload: opt.value || opt.label
          }))
        });
        appendMessage("assistant", step.prompt);
      }

      function advanceGuidedFlow(message) {
        if (guidedStepIndex === null) return { handled: false };
        const step = guidedFlow[guidedStepIndex];
        if (!step) {
          guidedStepIndex = null;
          return { handled: false };
        }
        const normalized = (message || "").toLowerCase();
        const match = step.options.find((opt) =>
          normalized.includes(opt.label.toLowerCase())
        );
        const value = match ? match.value : message;
        if (step.key !== "issue") {
          applyGuidedAnswer(step.key, value);
          guidedStepIndex += 1;
          if (guidedStepIndex >= guidedFlow.length) {
            guidedStepIndex = null;
            return { handled: false };
          }
          showGuidedPrompt();
          return { handled: true };
        }
        guidedStepIndex = null;
        return { handled: false };
      }

      function hideNextStep() {
        if (!nextStepCard) return;
        nextStepCard.classList.add("hidden");
        clearQuickReplies();
      }

      function clearQuickReplies() {
        if (!nextStepReplies) return;
        nextStepReplies.innerHTML = "";
      }

      function setQuickReplies(replies) {
        if (!nextStepReplies) return;
        nextStepReplies.innerHTML = "";
        replies.forEach((reply) => {
          const btn = document.createElement("button");
          btn.className = "btn ghost";
          btn.type = "button";
          btn.textContent = reply.label;
          btn.addEventListener("click", async () => {
            if (chatBusy) return;
            if (reply.action === "resolve") {
              await sendFeedback(true);
              return;
            }
            if (reply.action === "message") {
              await sendChatMessage(reply.payload || reply.label, {
                keepGuide: true
              });
            }
          });
          nextStepReplies.appendChild(btn);
        });
      }

      function updateTicketDetailTimeline(status) {
        if (!ticketDetailSteps || !ticketDetailSteps.length) return;
        ticketDetailSteps.forEach((step) => step.classList.remove("active", "done"));
        const normalized = (status || "").toLowerCase();
        ticketDetailSteps.forEach((step) => {
          const key = step.getAttribute("data-step");
          if (!key) return;
          if (normalized === "open" && key === "open") {
            step.classList.add("active");
          }
          if (normalized === "pending") {
            if (key === "open") step.classList.add("done");
            if (key === "pending") step.classList.add("active");
          }
          if (normalized === "resolved" || normalized === "closed") {
            if (key === "open" || key === "pending") step.classList.add("done");
            if (key === "resolved") step.classList.add("active");
          }
        });
      }

      function showTicketDetail(ticket) {
        if (!ticketDetailPanel || !ticket) return;
        lastTicketSelection = ticket;
        if (ticketDetailTitle) {
          ticketDetailTitle.textContent = ticket.title || t("ticket.defaultTitle");
        }
        if (ticketDetailStatus) {
          const statusLabel = (ticket.status || "open").toLowerCase();
          ticketDetailStatus.textContent = statusLabel.toUpperCase();
          ticketDetailStatus.className = `ticket-status ${statusLabel}`;
        }
        if (ticketDetailMeta) {
          const updated = ticket.updated_at
            ? t("ticket.updated", { date: formatDate(ticket.updated_at) })
            : "";
          ticketDetailMeta.textContent = `${formatDate(ticket.created_at)} - ${
            ticket.category || "-"
          } - ${ticket.priority || "-"}${updated ? ` - ${updated}` : ""}`;
        }
        if (ticketDetailSummary) {
          ticketDetailSummary.textContent =
            ticket.description || ticket.summary || t("ticket.noSummary");
        }
        renderTicketImages(ticket.description || ticket.summary || "");
        updateTicketDetailTimeline(ticket.status || "open");
        ticketDetailPanel.classList.remove("hidden");
        if (ticketResumeBtn) {
          ticketResumeBtn.disabled = !ticket.conversation_id;
          ticketResumeBtn.dataset.conversationId = ticket.conversation_id || "";
          ticketResumeBtn.classList.toggle("disabled", !ticket.conversation_id);
        }
      }

      function hideTicketDetail() {
        if (!ticketDetailPanel) return;
        ticketDetailPanel.classList.add("hidden");
        if (ticketDetailImages) ticketDetailImages.classList.add("hidden");
        if (ticketDetailImagesGrid) ticketDetailImagesGrid.innerHTML = "";
      }

      function setNetStatus(isOnline) {
        netStatus.textContent = isOnline ? t("status.online") : t("status.offline");
        netStatus.className = isOnline ? "net-status" : "net-status offline";
      }

      function setSessionBadge(role, email) {
        if (!sessionBadge) return;
        if (!role) {
          sessionBadge.className = "session-badge hidden";
          sessionBadge.textContent = "";
          sessionBadge.removeAttribute("title");
          if (roleBanner) {
            const fallback = userOnlyMode ? t("role.userSpace") : t("role.adminSpace");
            roleBanner.textContent = fallback;
            roleBanner.className = "role-banner neutral";
            roleBanner.removeAttribute("title");
          }
          document.body.classList.remove(
            "role-admin",
            "role-user",
            "role-agent",
            "role-superadmin"
          );
          return;
        }
        const label =
          role === "superadmin"
            ? t("session.superadmin")
            : role === "admin"
              ? t("session.admin")
              : role === "agent"
                ? t("session.agent")
                : t("session.user");
        sessionBadge.textContent = label;
        sessionBadge.className = `session-badge ${role}`;
        if (email) {
          sessionBadge.title = email;
        }
        if (roleBanner) {
          const shortLabel =
            role === "superadmin"
              ? t("role.short.superadmin")
              : role === "admin"
                ? t("role.short.admin")
                : role === "agent"
                  ? t("role.short.agent")
                  : t("role.short.user");
          roleBanner.textContent = shortLabel;
          roleBanner.className = `role-banner ${role}`;
          if (email) {
            roleBanner.title = email;
          }
        }
        document.body.classList.remove(
          "role-admin",
          "role-user",
          "role-agent",
          "role-superadmin"
        );
        document.body.classList.add(`role-${role}`);
      }

      function setBanner(message, type) {
        if (!statusBanner) return;
        if (!message) {
          statusBanner.textContent = "";
          statusBanner.className = "status-banner hidden";
          return;
        }
        statusBanner.textContent = message;
        statusBanner.className = `status-banner ${type || ""}`.trim();
      }

      if (isFileOrigin) {
        setBanner(
          "Cette page est ouverte en mode fichier. Ouvrez http://localhost:3001/app/ pour vous connecter.",
          "info"
        );
      }

      function setCache(key, value) {
        const payload = { ts: Date.now(), value };
        localStorage.setItem(key, JSON.stringify(payload));
      }

      function getCache(key, fallback) {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && "value" in parsed) {
            return parsed.value;
          }
          return parsed;
        } catch (err) {
          return fallback;
        }
      }

      function pruneCache() {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith("cache_")
        );
        if (!keys.length) return;
        const now = Date.now();
        const entries = keys
          .map((key) => {
            try {
              const raw = localStorage.getItem(key);
              const parsed = raw ? JSON.parse(raw) : null;
              const ts = parsed && parsed.ts ? parsed.ts : 0;
              return { key, ts };
            } catch (err) {
              return { key, ts: 0 };
            }
          })
          .sort((a, b) => b.ts - a.ts);
        const maxItems = 40;
        entries.slice(maxItems).forEach((entry) => {
          localStorage.removeItem(entry.key);
        });
        const ttl = 1000 * 60 * 60 * 24 * 7;
        entries.forEach((entry) => {
          if (entry.ts && now - entry.ts > ttl) {
            localStorage.removeItem(entry.key);
          }
        });
      }

      function parseSupportSettings(settings) {
        const fallback = {
          openHour: 9,
          closeHour: 18,
          days: [1, 2, 3, 4, 5],
          label: "Lun-Ven 9h - 18h",
          alwaysOpen: false
        };
        const text = settings && settings.support_hours ? settings.support_hours.trim() : "";
        if (!text) return { ...fallback };
        const lower = text.toLowerCase();
        const config = { ...fallback, label: text };
        if (
          lower.includes("24/7") ||
          lower.includes("24h/24") ||
          lower.includes("7/7") ||
          lower.includes("7j/7") ||
          lower.includes("tous les jours")
        ) {
          return {
            ...config,
            alwaysOpen: true,
            days: [0, 1, 2, 3, 4, 5, 6]
          };
        }

        const hours = lower.match(/\b([01]?\d|2[0-3])\b/g);
        if (hours && hours.length >= 2) {
          const openHour = Number(hours[0]);
          const closeHour = Number(hours[1]);
          if (!Number.isNaN(openHour) && !Number.isNaN(closeHour)) {
            config.openHour = openHour;
            config.closeHour = closeHour;
          }
        }

        const dayMap = {
          lun: 1,
          lundi: 1,
          mon: 1,
          mar: 2,
          mardi: 2,
          tue: 2,
          mer: 3,
          mercredi: 3,
          wed: 3,
          jeu: 4,
          jeudi: 4,
          thu: 4,
          ven: 5,
          vendredi: 5,
          fri: 5,
          sam: 6,
          samedi: 6,
          sat: 6,
          dim: 0,
          dimanche: 0,
          sun: 0
        };
        const daysFound = new Set();
        Object.entries(dayMap).forEach(([key, value]) => {
          if (lower.includes(key)) {
            daysFound.add(value);
          }
        });

        if (lower.includes("week-end") || lower.includes("weekend")) {
          daysFound.add(6);
          daysFound.add(0);
        }

        if (!daysFound.size) {
          if (
            (lower.includes("lun") && lower.includes("ven")) ||
            (lower.includes("mon") && lower.includes("fri"))
          ) {
            config.days = [1, 2, 3, 4, 5];
          }
        } else {
          config.days = Array.from(daysFound).sort();
        }

        if (config.closeHour <= config.openHour) {
          config.alwaysOpen = true;
          config.days = [0, 1, 2, 3, 4, 5, 6];
        }

        return config;
      }

      async function login(email, password, tenantCode) {
        const payload = {
          email,
          password
        };
        if (tenantCode) {
          payload.tenant_code = tenantCode;
        }
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = new Error("login_failed");
          err.status = res.status;
          err.payload = await safeJson(res);
          throw err;
        }
        const data = await res.json();
        setToken(data.token);
        if (tenantCode) {
          localStorage.setItem("assistant_tenant_code", tenantCode);
        }
      }

      async function handleLoginFlow(email, password, tenantCode, submitBtn, options = {}) {
        let cleanEmail = (email || "").toString().trim();
        const cleanPassword = (password || "").toString();
        let cleanTenant = (tenantCode || "").toString().trim();
        const isAuto = options.auto === true;
        if (demoState.expired) {
          setStatus(t("demo.expired"), true);
          return false;
        }
        if (!cleanEmail && cleanTenant.includes("@")) {
          cleanEmail = cleanTenant;
          cleanTenant = "";
        }
        if (!cleanTenant && isLocalHost) {
          cleanTenant = getTenantCode() || "DEFAULT";
        }
        cleanEmail = cleanEmail.toLowerCase();
        if (loginEmailInput && !loginEmailInput.value && cleanEmail) {
          loginEmailInput.value = cleanEmail;
        }
        if (tenantCodeInput && !tenantCodeInput.value && cleanTenant) {
          tenantCodeInput.value = cleanTenant;
        }
        if (!cleanEmail || !cleanPassword) {
          setStatus(t("auth.invalidCredentials"), true);
          return false;
        }
        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = t("auth.loginPending");
          }
          await login(cleanEmail, cleanPassword, cleanTenant);
          setAuthState(true);
          setStatus("", false);
          setBanner(null);
          await loadMe();
          setKioskWaiting(false);
          refreshAll();
          return true;
        } catch (err) {
          const code = err && err.payload && err.payload.error ? err.payload.error : "";
          if (err && err.status === 429) {
            setStatus(t("auth.tooManyAttempts"), true);
          } else if (code === "missing_jwt_secret") {
            setStatus(t("auth.serverNotConfigured"), true);
          } else if (err && err.status >= 500) {
            setStatus(t("error.server"), true);
          } else if (isAuto) {
            setStatus(t("auth.autoLogin.fail"), true);
          } else {
            setStatus(t("auth.invalidCredentials"), true);
          }
          return false;
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = t("login.submit");
          }
        }
      }

      async function quickAdminLogin() {
        const res = await fetch(`${API_BASE}/auth/quick-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) {
          throw new Error("quick_login_failed");
        }
        const data = await res.json();
        setToken(data.token);
      }

      async function quickUserLogin() {
        const tenantCode = getTenantCode();
        const payload = {};
        if (tenantCode) {
          payload.tenant_code = tenantCode;
        }
        const res = await fetch(`${API_BASE}/auth/quick-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          throw new Error("quick_user_failed");
        }
        const data = await res.json();
        setToken(data.token);
        if (tenantCode) {
          localStorage.setItem("assistant_tenant_code", tenantCode);
        }      }

      function bootstrapTokenFromUrl() {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");
        if (!token) return;
        setToken(token);
        url.searchParams.delete("token");
        const next =
          url.pathname +
          (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
          url.hash;
        window.history.replaceState({}, "", next);
      }

      function bootstrapInviteFromUrl() {
        if (!inviteAcceptForm) return;
        const url = new URL(window.location.href);
        const invite = url.searchParams.get("invite");
        if (!invite) return;
        inviteAcceptForm.invite_token.value = invite;
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.pathname + url.search);
      }

      function setPresentationMode(enabled) {
        document.body.classList.toggle("presentation", enabled);
        if (presentationToggle) {
          presentationToggle.textContent = enabled
            ? t("toggle.presentation.leave")
            : t("toggle.presentation");
        }
        localStorage.setItem("assistant_presentation", enabled ? "1" : "0");
      }

      function initPresentationMode() {
        if (userOnlyMode) {
          setPresentationMode(false);
          return;
        }
        const url = new URL(window.location.href);
        const param = url.searchParams.get("mode");
        const stored = localStorage.getItem("assistant_presentation") === "1";
        if (param === "presentation") {
          setPresentationMode(true);
          url.searchParams.delete("mode");
          window.history.replaceState({}, "", url.pathname + url.search);
          return;
        }
        setPresentationMode(stored);
      }

      async function loadMe() {
        const data = await fetchWithAuth("/auth/me");
        if (userOnlyMode && data.role !== "user") {
          setToken("");
          setAuthState(false);
          setSessionBadge(null);
          setBanner(t("auth.userAccountRequired"), "info");
          currentRole = null;
          return;
        }
        currentRole = data.role;
        applyRoleVisibility();
        setSessionBadge(data.role, data.email);
        if (document.body.classList.contains("login-only")) {
          const target =
            data.role === "admin" || data.role === "superadmin" || data.role === "agent"
              ? "/app/admin/"
              : "/app/user/";
          window.location.href = target;
          return;
        }
        if (userOnlyMode) {
          ensureWelcomeMessage();
          loadSupportSettings();
          loadQuickIssues();
          setUserPresentation(userPresentationEnabled);
          startUserRefreshTimer();
          if (localStorage.getItem("assistant_demo") === "1") {
            localStorage.removeItem("assistant_demo");
            setTimeout(() => {
              runUserTestScenario();
            }, 600);
          }
        }
        if (kioskMode) {
          setKioskWaiting(false);
        }
      }

      async function safeLoadMe() {
        try {
          await loadMe();
          return true;
        } catch (err) {
          setToken("");
          setAuthState(false);
          setSessionBadge(null);
          setBanner(t("auth.connectionFailed"), "info");
          stopUserRefreshTimer();
          return false;
        }
      }

      async function fetchWithAuth(path, options = {}) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 401) {
            setToken("");
            setAuthState(false);
            setSessionBadge(null);
            setBanner(t("session.expired"), "info");
          } else {
            setBanner(t("error.server"), "info");
          }
          throw new Error("request_failed");
        }
        if (res.status === 204) {
          return null;
        }
        return res.json();
      }

      async function loadBranding(force = false) {
        if (!brandLogos || !brandLogos.length) return;
        if (logoParam) {
          applyBrandLogo(logoParam);
          brandingLoaded = true;
          return;
        }
        if (brandingLoaded && !force) return;
        const token = getToken();
        if (!token) return;
        try {
          const data = await fetchWithAuth("/org/settings");
          const nextLogo =
            data && typeof data.logo_url === "string" ? data.logo_url.trim() : "";
          if (nextLogo) {
            localStorage.setItem("assistant_logo_url", nextLogo);
          } else {
            localStorage.removeItem("assistant_logo_url");
          }
          applyBrandLogo(nextLogo || "");
          brandingLoaded = true;
        } catch (err) {
          // keep current logo when API is unavailable
        }
      }

      async function safeJson(res) {
        try {
          return await res.json();
        } catch (err) {
          return null;
        }
      }

      async function fetchTextWithAuth(path) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) {
            setToken("");
            setAuthState(false);
            setSessionBadge(null);
            setBanner(t("session.expired"), "info");
          } else {
            setBanner(t("error.server"), "info");
          }
          throw new Error("request_failed");
        }
        return res.text();
      }

      async function fetchBlobWithAuth(path) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) {
            setToken("");
            setAuthState(false);
            setSessionBadge(null);
            setBanner(t("session.expired"), "info");
          } else {
            setBanner(t("error.server"), "info");
          }
          throw new Error("request_failed");
        }
        return res.blob();
      }

      async function loadSupportSettings() {
        try {
          const data = await fetchWithAuth("/org/settings");
          supportConfig = parseSupportSettings(data);
          supportMeta = {
            slaHours: data && data.sla_hours ? Number(data.sla_hours) : 0,
            supportLabel: data && data.support_hours ? data.support_hours : ""
          };
          if (data && data.reminder_hours) {
            const value = Number(data.reminder_hours);
            reminderHours = !Number.isNaN(value) && value > 0 ? value : 72;
          } else {
            reminderHours = 72;
          }
          updateSupportStatus();
        } catch (err) {
          supportMeta = { slaHours: 0, supportLabel: "" };
          reminderHours = 72;
          updateSupportStatus();
        }
      }

      async function downloadFile(path, filename, type) {
        const text = await fetchTextWithAuth(path);
        const blob = new Blob([text], { type: type || "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      async function downloadBlobFile(path, filename, type) {
        const blob = await fetchBlobWithAuth(path);
        const finalBlob = type ? blob.slice(0, blob.size, type) : blob;
        const url = URL.createObjectURL(finalBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      async function loadOrgSettings() {
        if (!orgSettingsForm) return;
        const getField = (name) =>
          orgSettingsForm.querySelector(`[name="${name}"]`);
        const setFieldValue = (name, value) => {
          const el = getField(name);
          if (!el) return;
          if (el.type === "checkbox") {
            el.checked = Boolean(value);
          } else if (typeof value === "number") {
            el.value = String(value);
          } else {
            el.value = value || "";
          }
        };
        try {
          const data = await fetchWithAuth("/org/settings");
          setFieldValue("support_email", data.support_email || "");
          setFieldValue("support_phone", data.support_phone || "");
          setFieldValue("support_hours", data.support_hours || "");
          setFieldValue("logo_url", data.logo_url || "");
          setFieldValue("reminder_hours", data.reminder_hours || 72);
          setFieldValue("webhook_url", data.webhook_url || "");
          setFieldValue("webhook_secret", data.webhook_secret || "");
          setFieldValue("slack_webhook_url", data.slack_webhook_url || "");
          setFieldValue("teams_webhook_url", data.teams_webhook_url || "");
          setFieldValue("glpi_enabled", Boolean(data.glpi_enabled));
          setFieldValue("glpi_base_url", data.glpi_base_url || "");
          setFieldValue("glpi_app_token", data.glpi_app_token || "");
          setFieldValue("glpi_user_token", data.glpi_user_token || "");
          setFieldValue("ad_enabled", Boolean(data.ad_enabled));
          setFieldValue("ad_url", data.ad_url || "");
          setFieldValue("ad_domain", data.ad_domain || "");
          setFieldValue("ad_base_dn", data.ad_base_dn || "");
          setFieldValue("ad_bind_user", data.ad_bind_user || "");
          setFieldValue("ad_bind_password", data.ad_bind_password || "");
          setFieldValue("notify_on_ticket_created", Boolean(data.notify_on_ticket_created));
          setFieldValue("mailbox_enabled", Boolean(data.mailbox_enabled));
          setFieldValue("mailbox_provider", data.mailbox_provider || "gmail");
          setFieldValue("mailbox_user", data.mailbox_user || "");
          setFieldValue("mailbox_password", data.mailbox_password || "");
          setFieldValue("mailbox_host", data.mailbox_host || "");
          setFieldValue(
            "mailbox_port",
            typeof data.mailbox_port === "number" ? data.mailbox_port : 993
          );
          setFieldValue(
            "mailbox_tls",
            typeof data.mailbox_tls === "boolean" ? data.mailbox_tls : true
          );
          setFieldValue("mailbox_folder", data.mailbox_folder || "INBOX");
          setFieldValue("mailbox_subject_prefix", data.mailbox_subject_prefix || "");
          setFieldValue("slack_signing_secret", data.slack_signing_secret || "");
          setFieldValue("teams_signing_secret", data.teams_signing_secret || "");
          setFieldValue(
            "sla_hours",
            typeof data.sla_hours === "number" ? data.sla_hours : 24
          );
          setFieldValue(
            "sla_warning_pct",
            typeof data.sla_warning_pct === "number" ? data.sla_warning_pct : 80
          );
          setFieldValue(
            "cost_per_ticket",
            typeof data.cost_per_ticket === "number" ? data.cost_per_ticket : 12
          );
          setFieldValue("oauth_google_client_id", data.oauth_google_client_id || "");
          setFieldValue(
            "oauth_google_client_secret",
            data.oauth_google_client_secret || ""
          );
          setFieldValue(
            "oauth_google_redirect_uri",
            data.oauth_google_redirect_uri || ""
          );
          setFieldValue("oauth_google_scopes", data.oauth_google_scopes || "");
          setFieldValue(
            "oauth_outlook_client_id",
            data.oauth_outlook_client_id || ""
          );
          setFieldValue(
            "oauth_outlook_client_secret",
            data.oauth_outlook_client_secret || ""
          );
          setFieldValue(
            "oauth_outlook_redirect_uri",
            data.oauth_outlook_redirect_uri || ""
          );
          setFieldValue("oauth_outlook_scopes", data.oauth_outlook_scopes || "");

          if (oauthGoogleStatus) {
            oauthGoogleStatus.textContent = data.oauth_google_connected
              ? t("oauth.connected", {
                  date: data.oauth_google_expires_at || "?"
                })
              : t("oauth.notConnected");
          }
          if (oauthOutlookStatus) {
            oauthOutlookStatus.textContent = data.oauth_outlook_connected
              ? t("oauth.connected", {
                  date: data.oauth_outlook_expires_at || "?"
                })
              : t("oauth.notConnected");
          }
          const threshold =
            typeof data.escalation_threshold === "number"
              ? String(data.escalation_threshold)
              : "2";
          setFieldValue("escalation_threshold", threshold);
          setFieldValue("signature", data.signature || "");
          if (!logoParam) {
            const nextLogo =
              typeof data.logo_url === "string" ? data.logo_url.trim() : "";
            if (nextLogo) {
              localStorage.setItem("assistant_logo_url", nextLogo);
            } else {
              localStorage.removeItem("assistant_logo_url");
            }
            applyBrandLogo(nextLogo || "");
            brandingLoaded = true;
          } else if (!brandingLoaded) {
            applyBrandLogo(logoParam);
            brandingLoaded = true;
          }
          setOrgStatus(t("orgSettings.loaded"), false);
          orgSettingsLoaded = true;
        } catch (err) {
          setOrgStatus(t("orgSettings.loadFailed"), true);
        }
      }

      async function loadChecklist() {
        if (!setupChecklist) return;
        try {
          const [diagnostics, settings, orgInfo, kbData] = await Promise.all([
            fetchWithAuth("/admin/diagnostics"),
            fetchWithAuth("/org/settings"),
            fetchWithAuth("/org"),
            fetchWithAuth("/kb/documents")
          ]);
          const kbCount = (kbData.items || []).length;
          const security = diagnostics.security || {};
          const items = [
            {
              label: t("checklist.org.label"),
              ok: Boolean(orgInfo.name),
              hint: t("checklist.org.hint")
            },
            {
              label: t("checklist.jwt.label"),
              ok: Boolean(security.jwt_secret),
              hint: t("checklist.jwt.hint")
            },
            {
              label: t("checklist.quickLogin.label"),
              ok: security.quick_login === false,
              hint: t("checklist.quickLogin.hint")
            },
            {
              label: t("checklist.production.label"),
              ok: security.node_env === "production",
              hint: t("checklist.production.hint")
            },
            {
              label: t("checklist.kb.label"),
              ok: kbCount > 0,
              hint: t("checklist.kb.hint")
            },
            {
              label: t("checklist.ai.label"),
              ok: diagnostics.openai.configured || diagnostics.openai.enabled === false,
              hint: t("checklist.ai.hint")
            },
            {
              label: t("checklist.glpi.label"),
              ok: diagnostics.glpi.enabled,
              hint: t("checklist.glpi.hint")
            },
            {
              label: t("checklist.mailbox.label"),
              ok: diagnostics.mailbox.enabled && diagnostics.mailbox.configured,
              hint: t("checklist.mailbox.hint")
            },
            {
              label: t("checklist.oauth.label"),
              ok:
                diagnostics.oauth.google.connected ||
                diagnostics.oauth.outlook.connected,
              hint: t("checklist.oauth.hint")
            },
            {
              label: t("checklist.webhooks.label"),
              ok: Boolean(settings.webhook_url),
              hint: t("checklist.webhooks.hint")
            },
            {
              label: t("checklist.cors.label"),
              ok: Boolean(security.cors_restricted),
              hint: t("checklist.cors.hint")
            },
            {
              label: t("checklist.slackTeams.label"),
              ok: Boolean(settings.slack_signing_secret || settings.teams_signing_secret),
              hint: t("checklist.slackTeams.hint")
            },
            {
              label: t("checklist.sla.label"),
              ok: Number(settings.sla_hours || 0) > 0,
              hint: t("checklist.sla.hint")
            }
          ];
          const completed = items.filter((item) => item.ok).length;
          setupChecklist.innerHTML =
            `<div class="status">${t("checklist.completed", {
              done: completed,
              total: items.length
            })}</div>` +
            items
              .map(
                (item) =>
                  `<div class="checklist-item ${item.ok ? "ok" : "warn"}">
                    <div>
                      <strong>${item.label}</strong>
                      <div class="hint">${item.hint}</div>
                    </div>
                    <span class="checklist-pill">${
                      item.ok ? t("common.ok") : t("common.todo")
                    }</span>
                  </div>`
              )
              .join("");
        } catch (err) {
          setupChecklist.innerHTML = `<div class="status">${t(
            "checklist.unavailable"
          )}</div>`;
        }
      }

      async function loadMetricsSummary() {
        if (!metricsStats) return;
        try {
          const metrics = await fetchWithAuth("/admin/metrics");
          let analytics = null;
          try {
            analytics = await fetchWithAuth("/admin/analytics");
          } catch (err) {
            analytics = null;
          }
          const hoursSaved =
            analytics && analytics.roi
              ? analytics.roi.hours_saved
              : formatNumber((metrics.minutes_economisees || 0) / 60, 1);
          const items = [
            { label: t("metrics.ticketsAvoided"), value: metrics.tickets_evites },
            { label: t("metrics.ticketsCreated"), value: metrics.tickets_crees },
            { label: t("metrics.activeUsers"), value: metrics.utilisateurs_actifs },
            { label: t("metrics.conversations"), value: metrics.conversations },
            { label: t("metrics.resolved"), value: metrics.resolved },
            { label: t("metrics.escalated"), value: metrics.escalated },
            {
              label: t("metrics.resolutionRate"),
              value: `${metrics.resolution_rate || 0}%`
            },
            { label: t("metrics.hoursSaved"), value: hoursSaved }
          ];
          if (analytics && analytics.sla) {
            items.push({
              label: t("metrics.slaRisk"),
              value: analytics.sla.at_risk_count || 0
            });
            items.push({
              label: t("metrics.slaBreached"),
              value: analytics.sla.breached_open_count || 0
            });
          }
          metricsStats.innerHTML = items
            .map((item, index) => {
              const tileClass = `tile-${(index % 6) + 1}`;
              return `<div class="metric-item ${tileClass}"><strong>${formatNumber(
                item.value,
                1
              )}</strong><span>${item.label}</span></div>`;
            })
            .join("");
        } catch (err) {
          metricsStats.innerHTML = `<div class="metric-item muted">${t(
            "metrics.unavailable"
          )}</div>`;
        }
      }

      function renderMiniBars(container, data, labelMap, colorMap) {
        if (!container) return;
        const entries = Object.entries(data || {});
        if (!entries.length) {
          container.innerHTML = `<div class="ticket-empty">${t(
            "mini.dashboard.empty"
          )}</div>`;
          return;
        }
        const total = entries.reduce((acc, [, value]) => acc + (value || 0), 0) || 1;
        const sorted = entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
        container.innerHTML = sorted
          .map(([key, value]) => {
            const label = labelMap[key] || key;
            const pct = Math.max(4, Math.round(((value || 0) / total) * 100));
            const color = colorMap[key] || "linear-gradient(90deg, #2f3b52, #1e9aa2)";
            return `<div class="mini-bar">
              <span class="mini-bar-label">${label}</span>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${pct}%; background:${color}"></div>
              </div>
              <span class="mini-bar-value">${value || 0}</span>
            </div>`;
          })
          .join("");
      }

      function renderMiniVolume(container, items) {
        if (!container) return;
        const data = Array.isArray(items) ? items : [];
        if (!data.length) {
          container.innerHTML = `<div class="ticket-empty">${t(
            "mini.dashboard.empty"
          )}</div>`;
          return;
        }
        const maxValue =
          data.reduce((acc, item) => Math.max(acc, item.tickets || 0), 0) || 1;
        container.innerHTML = data
          .map((item) => {
            const value = item.tickets || 0;
            const height = Math.max(6, Math.round((value / maxValue) * 100));
            return `<div class="mini-volume-bar" style="height:${height}%;">
              <span>${item.day.slice(5)} - ${value}</span>
            </div>`;
          })
          .join("");
      }

      async function loadMiniDashboard() {
        if (!miniDashboardCard) return;
        try {
          const analytics = await fetchWithAuth("/admin/analytics");
          const statusLabels = {
            open: t("mini.status.open"),
            pending: t("mini.status.pending"),
            resolved: t("mini.status.resolved"),
            closed: t("mini.status.closed")
          };
          const statusColors = {
            open: "linear-gradient(90deg, #2f3b52, #4a6fa8)",
            pending: "linear-gradient(90deg, #5b7bb2, #7ea2d9)",
            resolved: "linear-gradient(90deg, #2ea85f, #78dc8c)",
            closed: "linear-gradient(90deg, #8aa0b8, #b6c5d6)"
          };
          const priorityLabels = {
            low: t("mini.priority.low"),
            medium: t("mini.priority.medium"),
            high: t("mini.priority.high"),
            urgent: t("mini.priority.urgent")
          };
          const priorityColors = {
            low: "linear-gradient(90deg, #2ea85f, #7ddca4)",
            medium: "linear-gradient(90deg, #f2c14f, #f6d67b)",
            high: "linear-gradient(90deg, #f28c28, #f5a15b)",
            urgent: "linear-gradient(90deg, #e0675f, #f08a84)"
          };
          renderMiniBars(
            miniStatusBars,
            analytics.tickets_by_status,
            statusLabels,
            statusColors
          );
          renderMiniBars(
            miniPriorityBars,
            analytics.tickets_by_priority,
            priorityLabels,
            priorityColors
          );
          renderMiniVolume(miniVolumeBars, analytics.volume_last_14_days);
          if (miniKpiResponseValue) {
            miniKpiResponseValue.textContent = `${analytics.response_avg_minutes} min`;
          }
          if (miniKpiResolutionValue) {
            miniKpiResolutionValue.textContent = `${analytics.resolution_avg_minutes} min`;
          }
          if (miniKpiRatingValue) {
            const rating = analytics.feedback?.average_rating || 0;
            const rate = analytics.feedback?.resolved_rate || 0;
            miniKpiRatingValue.textContent = `${rating}/5 - ${rate}%`;
          }
          if (miniKpiSlaValue) {
            const sla = analytics.sla || {};
            miniKpiSlaValue.textContent = `${sla.at_risk_count || 0} / ${
              sla.breached_open_count || 0
            }`;
          }
        } catch (err) {
          renderMiniBars(miniStatusBars, {}, {}, {});
          renderMiniBars(miniPriorityBars, {}, {}, {});
          renderMiniVolume(miniVolumeBars, []);
          if (miniKpiResponseValue) miniKpiResponseValue.textContent = "-";
          if (miniKpiResolutionValue) miniKpiResolutionValue.textContent = "-";
          if (miniKpiRatingValue) miniKpiRatingValue.textContent = "-";
          if (miniKpiSlaValue) miniKpiSlaValue.textContent = "-";
        }
      }

      async function loadOrg() {
        if (!orgForm) return;
        try {
          const data = await fetchWithAuth("/org");
          orgForm.name.value = data.name || "";
          orgForm.plan.value = data.plan || "";
          setOrgInfoStatus(t("org.loaded"), false);
          orgInfoLoaded = true;
        } catch (err) {
          setOrgInfoStatus(t("org.loadFailed"), true);
        }
      }

      async function loadInvites() {
        if (!invitesTable) return;
        try {
          const data = await fetchWithAuth("/users/invites");
          const items = data.items || [];
          renderInvites(items);
          setInviteStatus(t("invite.loaded"), false);
        } catch (err) {
          setInviteStatus(t("invite.loadFailed"), true);
        }
      }

      function renderInvites(items) {
        if (!invitesTable) return;
        invitesTable.innerHTML = items
          .map((invite) => {
            const expires = invite.expires_at ? formatDate(invite.expires_at) : "";
            const disabled = invite.status !== "pending" ? "disabled" : "";
            return `<tr>
              <td>${invite.email}</td>
              <td>${invite.role}</td>
              <td>${invite.status}</td>
              <td>${expires}</td>
              <td><code>${invite.token}</code></td>
              <td>
                <button class="btn ghost" data-invite-copy="${invite.token}">
                  ${t("invite.copyLink")}
                </button>
                <button class="btn ghost" data-invite-token="${invite.token}">
                  ${t("invite.copyToken")}
                </button>
                <button class="btn ghost" data-invite-revoke="${invite.id}" ${disabled}>
                  ${t("invite.revoke")}
                </button>
              </td>
            </tr>`;
          })
          .join("");

        document.querySelectorAll("[data-invite-copy]").forEach((button) => {
          button.addEventListener("click", async () => {
            const token = button.getAttribute("data-invite-copy");
            const link = `${window.location.origin}/app/?invite=${token}`;
            try {
              await copyText(link);
              notify(t("invite.copyLinkDone"), "info");
            } catch (err) {
              notify(t("invite.copyFailed"), "error");
            }
          });
        });

        document.querySelectorAll("[data-invite-token]").forEach((button) => {
          button.addEventListener("click", async () => {
            const token = button.getAttribute("data-invite-token");
            try {
              await copyText(token);
              notify(t("invite.copyTokenDone"), "info");
            } catch (err) {
              notify(t("invite.copyFailed"), "error");
            }
          });
        });

        document.querySelectorAll("[data-invite-revoke]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-invite-revoke");
            try {
              await fetchWithAuth(`/users/invite/${id}`, { method: "DELETE" });
              loadInvites();
            } catch (err) {
              notify(t("invite.revokeFailed"), "error");
            }
          });
        });
      }

      async function loadDiagnostics(deep = false) {
        if (!diagnosticsTable) return;
        try {
          const suffix = deep ? "?deep=1" : "";
          const data = await fetchWithAuth(`/admin/diagnostics${suffix}`);
          renderDiagnostics(data);
          updateAdminStatusSummary(data);
          if (data.openai?.enabled && !data.openai?.configured) {
            setBanner(t("ai.simulation"), "info");
          }
        } catch (err) {
          updateAdminStatusSummary(null);
          notify(t("diagnostics.unavailable"), "error");
        }
      }

      function renderDiagnostics(data) {
        if (!diagnosticsTable) return;
        const rows = [
          {
            name: "OpenAI",
            status: data.openai?.enabled
              ? data.openai.configured
                ? t("diagnostics.status.ok")
                : t("diagnostics.status.missing")
              : t("diagnostics.status.off"),
            detail: data.openai?.model || "-"
          },
          {
            name: "GLPI",
            status: data.glpi?.enabled ? data.glpi.ok : t("diagnostics.status.off"),
            detail: data.glpi?.enabled
              ? t("diagnostics.glpi.enabled")
              : t("diagnostics.glpi.disabled")
          },
          {
            name: t("diagnostics.mailbox"),
            status: data.mailbox?.enabled ? data.mailbox.ok : t("diagnostics.status.off"),
            detail: data.mailbox?.configured
              ? t("diagnostics.mailbox.configured")
              : t("diagnostics.mailbox.notConfigured")
          },
          {
            name: t("diagnostics.oauthGmail"),
            status: data.oauth?.google?.connected
              ? t("diagnostics.status.connected")
              : t("diagnostics.status.no"),
            detail: data.oauth?.google?.expires_at || "-"
          },
          {
            name: t("diagnostics.oauthOutlook"),
            status: data.oauth?.outlook?.connected
              ? t("diagnostics.status.connected")
              : t("diagnostics.status.no"),
            detail: data.oauth?.outlook?.expires_at || "-"
          },
          {
            name: t("diagnostics.slackInbound"),
            status: data.inbound?.slack_signing_secret
              ? t("diagnostics.status.signed")
              : t("diagnostics.status.unsigned"),
            detail: data.inbound?.ingest_token
              ? t("diagnostics.status.tokenOk")
              : t("diagnostics.status.tokenOff")
          },
          {
            name: t("diagnostics.teamsInbound"),
            status: data.inbound?.teams_signing_secret
              ? t("diagnostics.status.signed")
              : t("diagnostics.status.unsigned"),
            detail: data.inbound?.ingest_token
              ? t("diagnostics.status.tokenOk")
              : t("diagnostics.status.tokenOff")
          },
          {
            name: t("diagnostics.webhooks"),
            status: data.outbound?.webhook_url
              ? t("diagnostics.status.ok")
              : t("diagnostics.status.offShort"),
            detail:
              data.outbound?.slack_webhook || data.outbound?.teams_webhook
                ? t("diagnostics.status.slackTeamsOn")
                : t("common.none")
          }
        ];

        diagnosticsTable.innerHTML = rows
          .map(
            (row) => `<tr>
              <td>${row.name}</td>
              <td>${row.status}</td>
              <td>${row.detail}</td>
            </tr>`
          )
          .join("");
      }

      function updateAdminStatusSummary(diagnostics) {
        if (!adminStatusPill || !adminStatusGrid) return;
        if (!diagnostics) {
          adminStatusPill.textContent = t("adminStatus.unavailable");
          adminStatusPill.className = "status-pill warn";
          adminStatusGrid.innerHTML = "";
          return;
        }
        const glpiReady = Boolean(diagnostics.glpi && diagnostics.glpi.enabled);
        const adEnabled = Boolean(diagnostics.ad && diagnostics.ad.enabled);
        const checks = [
          {
            label: "GLPI",
            ok: glpiReady,
            detail: glpiReady
              ? t("adminStatus.configured")
              : t("adminStatus.notConfigured")
          },
          {
            label: t("adminStatus.ad"),
            ok: adEnabled,
            detail: adEnabled ? t("adminStatus.active") : t("adminStatus.optional")
          },
          {
            label: t("adminStatus.ai"),
            ok: Boolean(diagnostics.openai && diagnostics.openai.configured),
            detail:
              diagnostics.openai && diagnostics.openai.configured
                ? t("adminStatus.configured")
                : t("adminStatus.mock")
          },
          {
            label: t("adminStatus.mailbox"),
            ok: Boolean(diagnostics.mailbox && diagnostics.mailbox.enabled),
            detail:
              diagnostics.mailbox && diagnostics.mailbox.enabled
                ? t("adminStatus.active")
                : t("adminStatus.optional")
          }
        ];
        adminStatusPill.textContent = glpiReady
          ? t("adminStatus.ready")
          : t("adminStatus.needsSetup");
        adminStatusPill.className = `status-pill ${glpiReady ? "ok" : "warn"}`;
        adminStatusGrid.innerHTML = checks
          .map(
            (item) => `<div class="status-item ${item.ok ? "ok" : "warn"}">
              <strong>${item.label}</strong>
              <span>${item.detail}</span>
            </div>`
          )
          .join("");
      }

      async function loadSuperadminOverview() {
        if (!superadminMetrics) return;
        try {
          const data = await fetchWithAuth("/tenants/overview");
          const items = [
            { label: t("superadmin.tenants"), value: data.tenants || 0 },
            { label: t("superadmin.users"), value: data.users || 0 },
            { label: t("superadmin.conversations"), value: data.conversations || 0 },
            { label: t("superadmin.messages"), value: data.messages || 0 },
            { label: t("superadmin.tickets"), value: data.tickets || 0 },
            { label: t("superadmin.leads"), value: data.leads || 0 },
            { label: t("superadmin.kbDocs"), value: data.kb_documents || 0 }
          ];
          superadminMetrics.innerHTML = items
            .map(
              (item) =>
                `<div class="metric"><span>${item.label}</span><strong>${item.value}</strong></div>`
            )
            .join("");
        } catch (err) {
          superadminMetrics.innerHTML = `<div class="status">${t(
            "superadmin.unavailable"
          )}</div>`;
        }
      }

      async function loadTenants() {
        if (!tenantsTable) return;
        try {
          const data = await fetchWithAuth("/tenants");
          renderTenants(data.items || []);
          setTenantStatus(t("tenant.loaded"), false);
        } catch (err) {
          setTenantStatus(t("tenant.loadFailed"), true);
        }
      }

      function renderTenants(items) {
        if (!tenantsTable) return;
        tenantsTable.innerHTML = items
          .map(
            (tenant) => `<tr>
              <td>${tenant.name}</td>
              <td>${tenant.code ? `<code>${tenant.code}</code>` : "-"}</td>
              <td>${tenant.plan || "-"}</td>
              <td><code>${tenant.id}</code></td>
              <td>
                <button class="btn ghost" data-tenant-token="${tenant.id}">
                  ${t("tenant.adminToken")}
                </button>
                <button class="btn ghost" data-tenant-export="${tenant.id}">
                  ${t("tenant.export")}
                </button>
                <button class="btn ghost" data-tenant-import="${tenant.id}">
                  ${t("tenant.import")}
                </button>
              </td>
            </tr>`
          )
          .join("");

        document.querySelectorAll("[data-tenant-token]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-tenant-token");
            const email = prompt(t("tenant.adminEmailPrompt"));
            if (!email) return;
            try {
              const data = await fetchWithAuth(`/tenants/${id}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
              });
              await copyText(data.token);
              notify(t("tenant.adminTokenCopied"), "info");
            } catch (err) {
              notify(t("tenant.adminTokenCopyFailed"), "error");
            }
          });
        });

        document.querySelectorAll("[data-tenant-export]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-tenant-export");
            try {
              await downloadFile(`/tenants/${id}/export.json`, `tenant_${id}.json`);
            } catch (err) {
              notify(t("tenant.exportFailed"), "error");
            }
          });
        });

        document.querySelectorAll("[data-tenant-import]").forEach((button) => {
          button.addEventListener("click", () => {
            if (!tenantImportInput) return;
            tenantImportInput.dataset.tenantId = button.getAttribute("data-tenant-import");
            tenantImportInput.click();
          });
        });
      }

      function appendMessage(role, text) {
        if (!chatWindow) return;
        const shouldScroll = isNearBottom(chatWindow) || role === "user";
        const bubble = document.createElement("div");
        bubble.className = `bubble ${role}`;
        const rendered = renderMessageHtml(text || "", "");
        bubble.innerHTML = rendered.html;
        if (rendered.isImage) {
          bubble.classList.add("image");
        }
        chatWindow.appendChild(bubble);
        if (shouldScroll) {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
        updateSummaryLastMessage(text || "");
      }

      let typingBubble = null;
      function showTyping() {
        if (!chatWindow || typingBubble) return;
        const shouldScroll = isNearBottom(chatWindow);
        typingBubble = document.createElement("div");
        typingBubble.className = "bubble assistant typing";
        typingBubble.innerHTML =
          '<span class="typing-dots"><span></span><span></span><span></span></span>';
        chatWindow.appendChild(typingBubble);
        if (shouldScroll) {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      }

      function hideTyping() {
        if (!typingBubble) return;
        typingBubble.remove();
        typingBubble = null;
      }

      function setChatBusyState(isBusy) {
        chatBusy = Boolean(isBusy);
        if (!chatForm) return;
        const input = chatForm.elements ? chatForm.elements.message : null;
        const button = chatForm.querySelector("button");
        if (input) input.disabled = chatBusy;
        if (button) {
          button.disabled = chatBusy;
          button.textContent = chatBusy ? t("chat.sending") : t("chat.send");
        }
      }


      async function loadUserHistoryDetailed(query) {
        if (!historyList) return;
        if (historyLoading) return;
        historyLoading = true;
        historyList.innerHTML = `<div class="ticket-empty">${t("common.loading")}</div>`;
        try {
          const q = (query || "").toString().trim();
          const url = q
            ? `/chat/conversations?query=${encodeURIComponent(q)}`
            : "/chat/conversations";
          const data = await fetchWithAuth(url);
          const items = data.items || [];
          if (summaryLast) {
            summaryLast.textContent = items.length
              ? truncateText(items[0].last_message || "-", 120)
              : "-";
          }
          updatePresentationKpis({
            total: summaryTotal ? Number(summaryTotal.textContent) : 0,
            open: summaryOpen ? Number(summaryOpen.textContent) : 0,
            resolved: summaryResolved ? Number(summaryResolved.textContent) : 0,
            last: summaryLast ? summaryLast.textContent : "-"
          });
          if (!items.length) {
            historyList.innerHTML = `<div class="ticket-empty">${t(
              "history.noneRecent"
            )}</div>`;
            return;
          }
          const totalPages = Math.max(1, Math.ceil(items.length / historyPageSize));
          if (historyPage > totalPages) historyPage = totalPages;
          const start = (historyPage - 1) * historyPageSize;
          const paged = items.slice(start, start + historyPageSize);
          if (historyPageInfo) {
            historyPageInfo.textContent = t("pagination.page", {
              page: historyPage,
              total: totalPages
            });
          }
          if (historyPrevBtn) {
            historyPrevBtn.disabled = historyPage <= 1;
          }
          if (historyNextBtn) {
            historyNextBtn.disabled = historyPage >= totalPages;
          }
          historyList.innerHTML = paged
            .map((item) => {
              const title = item.last_message
                ? item.last_message.slice(0, 60)
                : t("history.conversation");
              const status = item.status || "open";
              return `<div class="history-item-simple" data-history-simple="${item.id}">
                <strong>${title}</strong>
                <span>${formatDate(item.updated_at)}</span>
                <span>${t("history.status", { status })}</span>
              </div>`;
            })
            .join("");
          document.querySelectorAll("[data-history-simple]").forEach((node) => {
            node.addEventListener("click", async () => {
              const id = node.getAttribute("data-history-simple");
              await loadHistoryDetail(id);
            });
          });
        } catch (err) {
          historyList.innerHTML = `<div class="ticket-empty">${t(
            "history.unavailable"
          )}</div>`;
        } finally {
          historyLoading = false;
        }
      }

      async function loadHistoryDetail(conversationId, query) {
        if (!historyDetailPanel || !historyDetailList) return;
        if (historyLoading) return;
        historyLoading = true;
        activeHistoryConversation = conversationId;
        historyDetailList.innerHTML = `<div class="ticket-empty">${t(
          "common.loading"
        )}</div>`;
        historyDetailPanel.classList.remove("hidden");
        if (historyDetailTitle) {
          historyDetailTitle.textContent = t("history.detailTitle", {
            id: conversationId.slice(0, 6)
          });
        }
        try {
          const data = await fetchWithAuth(
            `/chat/history?conversation_id=${conversationId}`
          );
          const items = data.items || [];
          setCache(`cache_history_${conversationId}`, items);
          renderHistoryDetail(items, query);
        } catch (err) {
          const cached = getCache(`cache_history_${conversationId}`, []);
          renderHistoryDetail(cached, query);
        } finally {
          historyLoading = false;
        }
      }

      function renderHistoryDetail(items, query) {
        if (!historyDetailList) return;
        const q = (query || "").toString().trim();
        const filtered = q
          ? items.filter((msg) =>
              (msg.content || "").toLowerCase().includes(q.toLowerCase())
            )
          : items;
        if (!filtered.length) {
          historyDetailList.innerHTML = `<div class="ticket-empty">${t(
            "history.noMessagesFilter"
          )}</div>`;
          return;
        }
        historyDetailList.innerHTML = filtered
          .map((msg) => {
            const label =
              msg.role === "assistant"
                ? t("summary.role.assistant")
                : t("summary.role.user");
            const content = highlightText(msg.content || "", q);
            return `<div class="history-message">
              <strong>${label}</strong>
              <span>${content}</span>
              <span class="muted">${formatDate(msg.created_at)}</span>
            </div>`;
          })
          .join("");
      }

      function updateSummaryFromTickets(items) {
        if (!summaryTotal || !summaryOpen || !summaryResolved) return;
        const total = items.length;
        const open = items.filter((t) => t.status === "open" || t.status === "pending")
          .length;
        const resolved = items.filter(
          (t) => t.status === "resolved" || t.status === "closed"
        ).length;
        summaryTotal.textContent = String(total);
        summaryOpen.textContent = String(open);
        summaryResolved.textContent = String(resolved);
        if (simpleSummaryTotal) simpleSummaryTotal.textContent = String(total);
        if (simpleSummaryOpen) simpleSummaryOpen.textContent = String(open);
        if (simpleSummaryResolved) simpleSummaryResolved.textContent = String(resolved);
        if (myTicketsCountAll) {
          myTicketsCountAll.textContent = String(total);
        }
        if (myTicketsCountOpen) {
          myTicketsCountOpen.textContent = String(open);
        }
        if (myTicketsCountResolved) {
          myTicketsCountResolved.textContent = String(resolved);
        }
        updatePresentationKpis({
          total,
          open,
          resolved,
          last: summaryLast ? summaryLast.textContent : "-"
        });
      }

      function filterMyTickets(items) {
        const query = (myTicketsSearch || "").toLowerCase().trim();
        let filtered = items;
        if (!myTicketsFilter || myTicketsFilter === "all") return items;
        if (myTicketsFilter === "open") {
          filtered = items.filter((t) => t.status === "open" || t.status === "pending");
        } else if (myTicketsFilter === "resolved") {
          filtered = items.filter(
            (t) => t.status === "resolved" || t.status === "closed"
          );
        }
        if (!query) {
          return filtered;
        }
        return filtered.filter((ticket) => {
          const title = (ticket.title || "").toLowerCase();
          const category = (ticket.category || "").toLowerCase();
          const status = (ticket.status || "").toLowerCase();
          const priority = (ticket.priority || "").toLowerCase();
          return (
            title.includes(query) ||
            category.includes(query) ||
            status.includes(query) ||
            priority.includes(query)
          );
        });
      }

      function sortMyTickets(items) {
        const sorted = items.slice();
        const priorityRank = { high: 3, medium: 2, low: 1 };
        const statusRank = { open: 3, pending: 2, resolved: 1, closed: 0 };
        if (myTicketsSort === "oldest") {
          return sorted.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        if (myTicketsSort === "priority") {
          return sorted.sort(
            (a, b) =>
              (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
          );
        }
        if (myTicketsSort === "status") {
          return sorted.sort(
            (a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
          );
        }
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      function setMyTicketsFilter(filter) {
        myTicketsFilter = filter || "all";
        if (myTicketsFilterButtons && myTicketsFilterButtons.length) {
          myTicketsFilterButtons.forEach((btn) => {
            const value = btn.getAttribute("data-my-tickets-filter");
            btn.classList.toggle("active", value === myTicketsFilter);
          });
        }
      }

      function renderSources(sources) {
        if (!sources || sources.length === 0) {
          chatSources.textContent = "";
          return;
        }
        const lines = sources.map((source) => {
          const title = source.document_title || t("kb.source.document");
          const snippet = source.snippet || source.chunk_text || "";
          const short = snippet ? ` - ${snippet.slice(0, 120)}...` : "";
          return `${t("kb.source.label")}: ${title}${short}`;
        });
        chatSources.textContent = lines.join(" | ");
      }

      function updateFailureHint(count, threshold) {
        if (!feedbackHint) return;
        if (!count || !threshold || count <= 0) {
          feedbackHint.textContent = "";
          return;
        }
        if (count >= threshold) {
          feedbackHint.textContent = t("ticket.autoEscalation");
          return;
        }
        const remaining = Math.max(threshold - count, 0);
        feedbackHint.textContent =
          remaining === 1
            ? t("ticket.autoEscalationSoon.one")
            : t("ticket.autoEscalationSoon.many", { count: remaining });
      }

      async function loadTickets() {
        if (!ticketsTable) return;
        try {
          const data = await fetchWithAuth("/tickets");
          const items = data.items || [];
          setCache("cache_tickets", items);
          renderTickets(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_tickets", []);
          renderTickets(cached);
          setNetStatus(false);
        }
      }

      function renderRecentTickets(items) {
        if (!recentTicketsList) return;
        if (!items || !items.length) {
          recentTicketsList.innerHTML = `<div class="ticket-empty">${t(
            "ticket.noneRecent"
          )}</div>`;
          return;
        }
        recentTicketsList.innerHTML = items
          .slice(0, 6)
          .map((ticket) => {
            const imageCount = countImagesInText(ticket.description);
            const imageLabel = imageCount
              ? ` | ${t("ticket.imagesCount", { count: imageCount })}`
              : "";
            return `<div class="ticket-card">
              <div class="ticket-card-title">${
                ticket.title || t("ticket.defaultTitle")
              }</div>
              <div class="ticket-card-meta">${formatDate(ticket.created_at)}</div>
              <div class="ticket-card-meta">${ticket.category || "-"} | ${
                ticket.priority || "-"
              } | ${ticket.status || "-"}${imageLabel}</div>
            </div>`;
          })
          .join("");
      }

      async function loadRecentTickets() {
        if (!recentTicketsList) return;
        try {
          const data = await fetchWithAuth("/tickets");
          const items = data.items || [];
          renderRecentTickets(items);
        } catch (err) {
          renderRecentTickets([]);
        }
      }

      async function loadMyTickets() {
        if (!myTicketsTable && !myTicketsList) return;
        if (myTicketsLoading) return;
        myTicketsLoading = true;
        setMyTicketsFilter(myTicketsFilter);
        if (!getToken()) {
          if (myTicketsTable) {
            myTicketsTable.innerHTML = "";
          }
          if (myTicketsList) {
            myTicketsList.innerHTML = `<div class="ticket-empty">${t(
              "auth.connectToViewTickets"
            )}</div>`;
          }
          hideTicketDetail();
          setAuthState(false);
          myTicketsLoading = false;
          return;
        }
        try {
          const data = await fetchWithAuth("/tickets/mine");
          const items = data.items || [];
          updateSummaryFromTickets(items);
          checkTicketReminders(items);
          renderTicketReminders(items);
          const resolvedIds = [];
          items.forEach((ticket) => {
            const prev = ticketStatusCache.get(ticket.id);
            const current = ticket.status || "open";
            if (prev && prev !== current && (current === "resolved" || current === "closed")) {
              resolvedIds.push(ticket.id);
              notify(
                t("ticket.resolved", {
                  title: ticket.title || t("ticket.defaultTitle")
                }),
                "info"
              );
            }
            ticketStatusCache.set(ticket.id, current);
          });
          if (items.length) {
            latestTicketStatus = items[0].status || null;
            if (latestTicketStatus) {
              setConversationStatus(conversationStatus === "idle" ? "open" : conversationStatus);
            }
          } else {
            latestTicketStatus = null;
            updateTimeline();
          }
          const filteredItems = sortMyTickets(filterMyTickets(items));
          if (myTicketsTable) {
            myTicketsTable.innerHTML = filteredItems
              .map(
                (ticket) =>
                  `<tr>
                    <td>${formatDate(ticket.created_at)}</td>
                    <td>${ticket.title || ""}</td>
                    <td>${ticket.category || ""}</td>
                    <td>${ticket.priority || ""}</td>
                    <td>${ticket.status || ""}</td>
                  </tr>`
              )
              .join("");
          }
          if (myTicketsList) {
            if (!filteredItems.length) {
              myTicketsList.innerHTML =
                `<div class="ticket-empty">${t("tickets.emptyFilter")}</div>` +
                `<button id="startFromTicketsBtn" class="btn primary" type="button">${t(
                  "dashboard.ask"
                )}</button>`;
              const startBtn = document.getElementById("startFromTicketsBtn");
              if (startBtn) {
                startBtn.addEventListener("click", () => {
                  focusChatInput();
                });
              }
              hideTicketDetail();
              return;
            }
            const totalPages = Math.max(1, Math.ceil(filteredItems.length / ticketsPageSize));
            if (ticketsPage > totalPages) ticketsPage = totalPages;
            const start = (ticketsPage - 1) * ticketsPageSize;
            const pagedTickets = filteredItems.slice(start, start + ticketsPageSize);
            if (ticketsPageInfo) {
              ticketsPageInfo.textContent = t("pagination.page", {
                page: ticketsPage,
                total: totalPages
              });
            }
            if (ticketsPrevBtn) {
              ticketsPrevBtn.disabled = ticketsPage <= 1;
            }
            if (ticketsNextBtn) {
              ticketsNextBtn.disabled = ticketsPage >= totalPages;
            }
            myTicketsList.innerHTML = pagedTickets
              .map(
                (ticket, index) => {
                  const imageCount = countImagesInText(ticket.description);
                  const imageLabel = imageCount
                    ? ` | ${t("ticket.imagesCount", { count: imageCount })}`
                    : "";
                  return `<div class="ticket-card" data-ticket-id="${ticket.id}">
                    <div class="ticket-card-title">${
                      ticket.title || t("ticket.defaultTitle")
                    }</div>
                    <div class="ticket-card-meta">${formatDate(ticket.created_at)}</div>
                    <div class="ticket-card-meta">${ticket.category || "-"} | ${
                      ticket.priority || "-"
                    } | ${ticket.status || "-"}${imageLabel}</div>
                    <button class="btn ghost ticket-detail-btn" data-ticket-index="${index}">
                      ${t("tickets.viewDetail")}
                    </button>
                    ${
                      ticket.conversation_id
                        ? `<button class="btn ghost ticket-resume-btn" data-ticket-convo="${ticket.conversation_id}">${t(
                            "tickets.resume"
                          )}</button>`
                        : ""
                    }
                  </div>`;
                }
              )
              .join("");
            resolvedIds.forEach((id) => {
              const card = myTicketsList.querySelector(`[data-ticket-id="${id}"]`);
              if (card) {
                card.classList.add("resolved-flash");
                setTimeout(() => card.classList.remove("resolved-flash"), 1600);
              }
            });
            document
              .querySelectorAll(".ticket-detail-btn")
              .forEach((button) => {
                button.addEventListener("click", () => {
                  const idx = Number(button.getAttribute("data-ticket-index"));
                  const target = pagedTickets[idx];
                  if (target) {
                    showTicketDetail(target);
                  }
                });
              });
            document
              .querySelectorAll(".ticket-resume-btn")
              .forEach((button) => {
                button.addEventListener("click", async () => {
                  const id = button.getAttribute("data-ticket-convo");
                  if (!id) return;
                  togglePanel(myTicketsPanel, false);
                  await loadConversationHistory(id);
                  focusChatInput();
                });
              });
            if (lastTicketSelection) {
              const refreshed = pagedTickets.find(
                (ticket) => ticket.id === lastTicketSelection.id
              );
              if (refreshed) {
                showTicketDetail(refreshed);
              }
            } else if (pagedTickets[0]) {
              showTicketDetail(pagedTickets[0]);
            }
          }
          updateTimeline();
        } catch (err) {
          const hasToken = Boolean(getToken());
          if (myTicketsTable) {
            myTicketsTable.innerHTML = "";
          }
          if (myTicketsList) {
            myTicketsList.innerHTML = hasToken
              ? `<div class="ticket-empty">${t("common.loadingFailed")}</div>`
              : `<div class="ticket-empty">${t("session.expired")}</div>`;
          }
          updateSummaryFromTickets([]);
          if (hasToken) {
            notify(t("tickets.loadFailed"), "error");
          }
        } finally {
          myTicketsLoading = false;
        }
      }

      async function loadQuickIssues() {
        if (!quickIssuesContainer || !getToken()) return;
        try {
          const data = await fetchWithAuth("/chat/quick-issues");
          const items = Array.isArray(data.items) ? data.items : [];
          if (!items.length) {
            const fallbackItems = buildTenantQuickIssues(getTenantCode());
            if (fallbackItems.length) {
              renderQuickIssues(fallbackItems);
            }
            return;
          }
          renderQuickIssues(items);
        } catch (err) {
          // keep default quick issues on failure
        }
      }

      async function searchQuickIssues(query) {
        if (!quickIssuesContainer || !getToken()) return;
        const trimmed = (query || "").toString().trim();
        if (!trimmed) {
          filterQuickIssuesLocal("");
          return;
        }
        try {
          const data = await fetchWithAuth(
            `/chat/quick-issues/search?query=${encodeURIComponent(trimmed)}`
          );
          const items = Array.isArray(data.items) ? data.items : [];
          renderQuickIssues(items, { preserveCache: true, query: trimmed });
        } catch (err) {
          // ignore search errors
        }
      }

      function renderKbResults(items) {
        if (!kbSearchResultsUser) return;
        const filtered = filterKbItemsByLevel(items || []);
        if (!filtered || !filtered.length) {
          const query = (kbLastQuery || "").trim();
          const queryLabel = query ? ` ${t("common.forQuery", { query: `<strong>${escapeHtml(query)}</strong>` })}` : "";
          kbSearchResultsUser.innerHTML = `
            <div class="ticket-empty">
              ${t("common.noResults", { query: queryLabel })}.
              <div class="empty-actions">
                <button class="btn primary" type="button" id="kbFallbackChatBtn">
                  ${t("kb.askChat")}
                </button>
              </div>
            </div>
          `;
          const fallbackBtn = document.getElementById("kbFallbackChatBtn");
          if (fallbackBtn) {
            fallbackBtn.addEventListener("click", () => {
              startChatWithQuery(query || t("kb.needHelp"));
            });
          }
          return;
        }
        kbSearchResultsUser.innerHTML = "";
        filtered.forEach((item) => {
          const card = document.createElement("div");
          card.className = "kb-result-card";
          const title = document.createElement("h4");
          title.textContent = item.document_title || t("kb.procedure");
          const snippet = document.createElement("p");
          snippet.textContent = item.snippet || "";
          const actions = document.createElement("div");
          actions.className = "kb-result-actions";
          const viewBtn = document.createElement("button");
          viewBtn.className = "btn ghost";
          viewBtn.type = "button";
          viewBtn.textContent = t("kb.viewProcedure");
          const startBtn = document.createElement("button");
          startBtn.className = "btn primary";
          startBtn.type = "button";
          startBtn.textContent = t("quick.detail.start");
          const fullText = document.createElement("p");
          fullText.className = "note hidden";
          fullText.textContent = item.chunk_text || "";
          viewBtn.addEventListener("click", () => {
            fullText.classList.toggle("hidden");
          });
          startBtn.addEventListener("click", async () => {
            setUserTab("assistant");
            document.body.classList.add("show-chat-input");
            resetConversation();
            await sendChatMessage(item.document_title || item.snippet || "", {
              keepGuide: true
            });
          });
          actions.appendChild(viewBtn);
          actions.appendChild(startBtn);
          card.appendChild(title);
          card.appendChild(snippet);
          card.appendChild(actions);
          card.appendChild(fullText);
          kbSearchResultsUser.appendChild(card);
        });
      }

      async function searchKbUser(query) {
        if (!kbSearchResultsUser || !getToken()) return;
        const trimmed = (query || "").toString().trim();
        kbLastQuery = trimmed;
        if (!trimmed) {
          kbSearchResultsUser.innerHTML = `<div class="ticket-empty">${t(
            "kb.emptyHint"
          )}</div>`;
          return;
        }
        try {
          const data = await fetchWithAuth("/kb/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: trimmed })
          });
          const items = Array.isArray(data.items) ? data.items : [];
          renderKbResults(items);
        } catch (err) {
          kbSearchResultsUser.innerHTML = `<div class="ticket-empty">${t(
            "kb.searchFailed"
          )}</div>`;
        }
      }

      function renderTickets(items) {
        if (!ticketsTable) return;
        ticketsTable.innerHTML = items
          .map((ticket) => {
            const imageCount = countImagesInText(ticket.description);
            const imageLabel = imageCount
              ? ` (${t("ticket.imagesCount", { count: imageCount })})`
              : "";
            return `<tr>
              <td>${formatDate(ticket.created_at)}</td>
              <td>${ticket.title || ""}</td>
              <td>${ticket.category || ""}</td>
              <td>${ticket.priority || ""}</td>
              <td>${ticket.status || ""}${imageLabel}</td>
              <td>${
                ticket.external_url
                  ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">${t(
                      "ticket.glpiLink"
                    )}</a>`
                  : "-"
              }</td>
            </tr>`;
          })
          .join("");
      }

      function renderAdminGallery(items) {
        if (!adminGalleryGrid || !adminGalleryCard) return;
        const list = items || [];
        if (!list.length) {
          adminGalleryGrid.innerHTML = "";
          if (adminGalleryEmpty) {
            adminGalleryEmpty.textContent = t("gallery.empty");
          }
          if (adminGalleryCount) {
            adminGalleryCount.textContent = t("gallery.countZero");
          }
          return;
        }
        if (adminGalleryEmpty) {
          adminGalleryEmpty.textContent = "";
        }
        if (adminGalleryCount) {
          adminGalleryCount.textContent =
            list.length > 1
              ? t("gallery.countMany", { count: list.length })
              : t("gallery.countOne");
        }
        adminGalleryGrid.innerHTML = list
          .map((item) => {
            const safeUrl = escapeHtml(item.url);
            const badge = item.occurrences ? `<span class="gallery-badge">x${item.occurrences}</span>` : "";
            const title = item.last_seen
              ? t("gallery.lastSeen", { date: formatDate(item.last_seen) })
              : t("gallery.capture");
            return `<button class="gallery-item" type="button" data-image-zoom="${safeUrl}" title="${escapeHtml(title)}">
              <img src="${safeUrl}" alt="${t("gallery.capture")}" />
              ${badge}
            </button>`;
          })
          .join("");
      }

      function filterAdminGalleryItems(items) {
        const query = (adminGallerySearch && adminGallerySearch.value || "").trim().toLowerCase();
        if (!query) return items;
        return items.filter((item) => {
          const url = (item.url || "").toLowerCase();
          const convoIds = (item.conversation_ids || []).join(" ").toLowerCase();
          const ticketIds = (item.ticket_ids || []).join(" ").toLowerCase();
          return url.includes(query) || convoIds.includes(query) || ticketIds.includes(query);
        });
      }

      async function loadAdminGallery() {
        if (!adminGalleryGrid) return;
        try {
          const days = Number(adminGalleryCard?.dataset?.galleryDays || 0);
          const suffix = days > 0 ? `&days=${days}` : "";
          const data = await fetchWithAuth(`/admin/uploads?limit=40${suffix}`);
          const items = filterAdminGalleryItems(data.items || []);
          renderAdminGallery(items);
        } catch (err) {
          renderAdminGallery([]);
        }
      }

      async function loadConversations() {
        if (!convoList || !convoSearchInput) return;
        const query = convoSearchInput.value || "";
        const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
        try {
          const data = await fetchWithAuth(`/chat/conversations${suffix}`);
          const items = data.items || [];
          setCache("cache_conversations", items);
          renderConversations(items);
          updateOnboarding(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_conversations", []);
          renderConversations(cached);
          updateOnboarding(cached);
          setNetStatus(false);
        }
      }

      function renderConversations(items) {
        convoList.innerHTML = items
          .map(
            (item) =>
              `<button class="convo-item" data-convo-id="${item.id}">
                <strong>${item.last_message || t("history.newConversation")}</strong>
                <span>${formatDate(item.updated_at)}</span>
              </button>`
          )
          .join("");

        document.querySelectorAll("[data-convo-id]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-convo-id");
            await loadConversationHistory(id);
          });
        });
      }

      function updateOnboarding(items) {
        const card = document.getElementById("onboardingCard");
        if (!card) return;
        if (items && items.length) {
          card.style.display = "none";
        } else {
          card.style.display = "block";
        }
      }

      async function searchHistory() {
        if (!historySearch || !convoSearchInput) return;
        const query = convoSearchInput.value || "";
        if (!query) {
          historySearch.innerHTML = "";
          return;
        }
        try {
          const data = await fetchWithAuth(
            `/chat/search?query=${encodeURIComponent(query)}`
          );
          const items = data.items || [];
          setCache("cache_history_search", items);
          renderHistorySearch(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_history_search", []);
          renderHistorySearch(cached);
          setNetStatus(false);
        }
      }

      function renderHistorySearch(items) {
        historySearch.innerHTML = items
          .map(
            (msg) =>
              `<div class="history-item" data-history-id="${msg.conversation_id}">
                <strong>${msg.role}</strong> - ${msg.content}
                <span>${formatDate(msg.created_at)}</span>
              </div>`
          )
          .join("");

        document.querySelectorAll("[data-history-id]").forEach((item) => {
          item.addEventListener("click", async () => {
            const id = item.getAttribute("data-history-id");
            await loadConversationHistory(id);
          });
        });
      }

      async function loadConversationHistory(id) {
        conversationId = id;
        if (chatHistoryLoading) return;
        chatHistoryLoading = true;
        chatWindow.innerHTML = "";
        setCreateTicketState("idle");
        setTicketBadgeState("hidden");
        if (chatSearchInput) {
          chatSearchInput.value = "";
        }
        chatSearchQuery = "";
        if (historyDetailPanel) {
          historyDetailPanel.classList.add("hidden");
        }
        try {
          const data = await fetchWithAuth(
            `/chat/history?conversation_id=${conversationId}`
          );
          const items = data.items || [];
          setCache(`cache_history_${id}`, items);
          if (historyDetailTitle) {
            historyDetailTitle.textContent = t("history.detailTitle", {
              id: conversationId.slice(0, 6)
            });
          }
          renderChatHistory(items, chatSearchQuery);
          renderChatGallery(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache(`cache_history_${id}`, []);
          renderChatHistory(cached, chatSearchQuery);
          renderChatGallery(cached);
          setNetStatus(false);
        } finally {
          await loadConversationTickets(conversationId);
          feedbackBox.style.display = "flex";
          setConversationStatus("open");
          chatHistoryLoading = false;
        }
      }

      async function loadConversationTickets(id) {
        if (!chatTickets) return;
        if (!id) {
          chatTickets.textContent = "";
          setCreateTicketState("idle");
          setTicketBadgeState("hidden");
          return;
        }
        try {
          const data = await fetchWithAuth(`/tickets/conversation/${id}`);
          const items = data.items || [];
          setCache(`cache_tickets_${id}`, items);
          if (!items.length) {
            chatTickets.textContent = t("ticket.noneConversation");
            setCreateTicketState("idle");
            setTicketBadgeState("hidden");
            latestTicketStatus = null;
            updateTimeline();
            return;
          }
          setCreateTicketState("exists");
          setTicketBadgeState("exists", items[items.length - 1], items.length);
          latestTicketStatus = items[items.length - 1].status || "open";
          setConversationStatus("escalated");
          chatTickets.innerHTML = items
            .map(
              (ticket) =>
                `<div class="chat-ticket">
                  <strong>${ticket.title}</strong>
                  <span>${ticket.category} | ${ticket.priority} | ${ticket.status}</span>
                  ${
                    ticket.external_url
                      ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">${t(
                          "ticket.badge.openGlpi"
                        )}</a>`
                      : ""
                  }
                </div>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache(`cache_tickets_${id}`, []);
          if (!cached.length) {
            chatTickets.textContent = "";
            setCreateTicketState("idle");
            setTicketBadgeState("hidden");
            latestTicketStatus = null;
            updateTimeline();
            return;
          }
          setCreateTicketState("exists");
          setTicketBadgeState("exists", cached[cached.length - 1], cached.length);
          latestTicketStatus = cached[cached.length - 1].status || "open";
          setConversationStatus("escalated");
          chatTickets.innerHTML = cached
            .map(
              (ticket) =>
                `<div class="chat-ticket">
                  <strong>${ticket.title}</strong>
                  <span>${ticket.category} | ${ticket.priority} | ${ticket.status}</span>
                  ${
                    ticket.external_url
                      ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">Ouvrir GLPI</a>`
                      : ""
                  }
                </div>`
            )
            .join("");
          setNetStatus(false);
        }
      }

      async function loadKb() {
        if (!kbList) return;
        try {
          const data = await fetchWithAuth("/kb/documents");
          const items = data.items || [];
          setCache("cache_kb", items);
          renderKbList(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_kb", []);
          renderKbList(cached);
          setNetStatus(false);
        }
      }

      function renderKbList(items) {
        if (!kbList) return;
        kbList.innerHTML = items
          .map(
            (doc) =>
              `<li>
                <div>
                  <strong>${doc.title}</strong>
                  <span class="muted">${doc.source_type} | chunks: ${doc.chunk_count}</span>
                </div>
                ${
                  currentRole === "admin" || currentRole === "agent"
                    ? `<button class="btn ghost" data-kb-delete="${doc.id}">Supprimer</button>`
                    : ""
                }
              </li>`
          )
          .join("");

        document.querySelectorAll("[data-kb-delete]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-kb-delete");
            try {
              await fetchWithAuth(`/kb/documents/${id}`, { method: "DELETE" });
              loadKb();
            } catch (err) {
              setStatus(t("common.deleteFailed"), true);
            }
          });
        });
      }

      async function searchKb() {
        if (!kbSearchInput) return;
        const query = kbSearchInput.value || "";
        if (!query) {
          loadKb();
          return;
        }
        try {
          const data = await fetchWithAuth("/kb/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
          });
          const items = (data.items || []).map((chunk) => ({
            id: chunk.id,
            title: chunk.document_title,
            source_type: "chunk",
            chunk_count: "-",
            chunk_text: chunk.chunk_text
          }));
          kbList.innerHTML = items
            .map(
              (chunk) =>
                `<li>
                  <div>
                    <strong>${chunk.title}</strong>
                    <span class="muted">${chunk.source_type}</span>
                    <p class="snippet">${chunk.chunk_text}</p>
                  </div>
                </li>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_kb", []);
          const filtered = cached.filter((doc) =>
            `${doc.title} ${doc.source_type}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
          renderKbList(filtered);
          setNetStatus(false);
        }
      }

      async function loadUsers() {
        if (!usersTable) return;
        try {
          const data = await fetchWithAuth("/users");
          const items = data.items || [];
          setCache("cache_users", items);
          usersTable.innerHTML = items
            .map(
              (user) =>
                `<tr>
                  <td>${formatDate(user.created_at)}</td>
                  <td>${user.email || ""}</td>
                  <td>${user.role || ""}</td>
                </tr>`
            )
            .join("");
          renderTicketUserOptions(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_users", []);
          if (cached.length) {
            usersTable.innerHTML = cached
              .map(
                (user) =>
                  `<tr>
                    <td>${formatDate(user.created_at)}</td>
                    <td>${user.email || ""}</td>
                    <td>${user.role || ""}</td>
                  </tr>`
              )
              .join("");
          } else {
            if (usersCard) {
              usersCard.style.display = "none";
            }
          }
          setNetStatus(false);
        }
      }

      function renderTicketUserOptions(items) {
        if (!ticketUserFilter) return;
        ticketUserFilter.innerHTML = [
          `<option value="">Tous</option>`,
          ...items.map((user) => `<option value="${user.id}">${user.email}</option>`)
        ].join("");
      }

      async function loadAudit() {
        if (!auditTable) return;
        try {
          const data = await fetchWithAuth("/admin/audit");
          const items = data.items || [];
          setCache("cache_audit", items);
          auditTable.innerHTML = items
            .map(
              (log) =>
                `<tr>
                  <td>${formatDate(log.created_at)}</td>
                  <td>${log.action || ""}</td>
                  <td>${log.user_id || ""}</td>
                  <td>${log.meta ? JSON.stringify(log.meta) : ""}</td>
                </tr>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_audit", []);
          if (cached.length) {
            auditTable.innerHTML = cached
              .map(
                (log) =>
                  `<tr>
                    <td>${formatDate(log.created_at)}</td>
                    <td>${log.action || ""}</td>
                    <td>${log.user_id || ""}</td>
                    <td>${log.meta ? JSON.stringify(log.meta) : ""}</td>
                  </tr>`
              )
              .join("");
          } else {
            if (adminToolsCard) {
              adminToolsCard.style.display = "none";
            }
          }
          setNetStatus(false);
        }
      }

      async function loadActivity() {
        if (!activityTable) return;
        try {
          const data = await fetchWithAuth("/admin/activity/users");
          const items = data.items || [];
          setCache("cache_activity", items);
          renderActivity(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_activity", []);
          renderActivity(cached);
          setNetStatus(false);
        }
      }

      function renderActivity(items) {
        if (!activityTable) return;
        activityTable.innerHTML = items
          .map(
            (item) =>
              `<tr>
                <td>${item.email || ""}</td>
                <td>${item.role || ""}</td>
                <td>${item.conversations || 0}</td>
                <td>${item.messages || 0}</td>
                <td>${item.tickets || 0}</td>
                <td>${formatDate(item.last_active)}</td>
              </tr>`
          )
          .join("");
      }

      async function loadNotifications() {
        if (!notificationsTable) return;
        try {
          const data = await fetchWithAuth("/notifications");
          const items = data.items || [];
          setCache("cache_notifications", items);
          renderNotifications(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_notifications", []);
          renderNotifications(cached);
          setNetStatus(false);
        }
      }

      function renderNotifications(items) {
        if (!notificationsTable) return;
        notificationsTable.innerHTML = items
          .map(
            (n) =>
              `<tr>
                <td>${formatDate(n.created_at)}</td>
                <td>${n.type || ""}</td>
                <td>${n.channel || ""}</td>
                <td>${n.payload ? JSON.stringify(n.payload) : ""}</td>
              </tr>`
          )
          .join("");
      }

      if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(loginForm);
          const tenantCode = (formData.get("tenant_code") || "").toString().trim();
          const submitBtn = loginForm.querySelector("button[type=\"submit\"]");
          await handleLoginFlow(
            formData.get("email"),
            formData.get("password"),
            tenantCode,
            submitBtn
          );
        });
      }

      function tryAutoLoginFromQuery() {
        if (!isLocalHost || !loginForm || !autoLoginFromQuery || autoLoginAttempted) {
          return;
        }
        if (getToken()) {
          autoLoginAttempted = true;
          return;
        }
        autoLoginAttempted = true;
        setStatus(t("auth.autoLogin.start"), false);
        const submitBtn = loginForm.querySelector("button[type=\"submit\"]");
        handleLoginFlow(
          autoLoginFromQuery.email,
          autoLoginFromQuery.password,
          autoLoginFromQuery.tenantCode,
          submitBtn,
          { auto: true }
        );
      }

      if (autoLoginFromQuery) {
        setTimeout(() => {
          tryAutoLoginFromQuery();
        }, 200);
      }

      if (inviteAcceptForm) {
        inviteAcceptForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(inviteAcceptForm);
          const token = formData.get("invite_token");
          const password = formData.get("invite_password");
          try {
            const res = await fetch(`${API_BASE}/users/invite/accept`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password })
            });
          if (!res.ok) {
            setInviteAcceptStatus(t("invite.activateFailed"), true);
            return;
          }
          const data = await res.json();
          await login(data.email, password);
          setInviteAcceptStatus(t("invite.activated"), false);
          setAuthState(true);
          setBanner(null);
          await loadMe();
          setKioskWaiting(false);
          refreshAll();
        } catch (err) {
          setInviteAcceptStatus(t("invite.activateFailed"), true);
        }
        });
      }

      pruneCache();
      bootstrapTokenFromUrl();
      bootstrapInviteFromUrl();
      initPresentationMode();
      tryKioskAutoLogin();

      if (quickAdminBtn) {
        quickAdminBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          try {
            setStatus(t("auth.quickLoginPending"), false);
            notify(t("auth.quickLoginInfo"), "info");
            await quickAdminLogin();
            setAuthState(true);
            setStatus("", false);
            setBanner(null);
            await loadMe();
            setKioskWaiting(false);
            refreshAll();
          } catch (err) {
            const fallback = quickAdminBtn.getAttribute("href");
            if (fallback) {
              window.location.href = fallback;
              return;
            }
            setStatus(t("auth.quickLoginFail"), true);
            notify(t("auth.quickLoginFail"), "error");
          }
        });
      }

      if (quickUserBtn) {
        quickUserBtn.addEventListener("click", async () => {
          try {
            setStatus(t("auth.userLoginPending"), false);
            notify(t("auth.userLoginInfo"), "info");
            await quickUserLogin();
            setAuthState(true);
            setStatus("", false);
            setBanner(null);
            await loadMe();
            setKioskWaiting(false);
            refreshAll();
          } catch (err) {
            setStatus(t("auth.userLoginFail"), true);
            notify(t("auth.userLoginFail"), "error");
          }
        });
      }

      if (demoClientBtn) {
        demoClientBtn.addEventListener("click", async () => {
          const now = Date.now();
          localStorage.setItem("assistant_demo", "1");
          localStorage.setItem("assistant_demo_until", String(now + demoDurationMs));
          demoState.active = true;
          demoState.expired = false;
          demoState.until = now + demoDurationMs;
          document.body.classList.add("demo-mode");
          if (demoBanner) {
            demoBanner.textContent = t("demo.banner");
            demoBanner.classList.remove("hidden");
          }
          const submitBtn = loginForm ? loginForm.querySelector("button[type=\"submit\"]") : null;
          await handleLoginFlow(
            "user@assistant.local",
            "user123",
            getTenantCode() || "DEFAULT",
            submitBtn,
            { auto: true }
          );
        });
      }

      if (userAutoTestBtn) {
        userAutoTestBtn.addEventListener("click", () => {
          runUserTestScenario();
        });
      }

      if (presentationToggle) {
        presentationToggle.addEventListener("click", () => {
          const enabled = !document.body.classList.contains("presentation");
          setPresentationMode(enabled);
        });
      }
      if (simpleModeToggle) {
        simpleModeToggle.addEventListener("click", () => {
          setSimpleMode(!simpleModeEnabled);
        });
      }
      if (adminCleanToggle) {
        adminCleanToggle.addEventListener("click", () => {
          setAdminClean(!adminCleanEnabled);
        });
      }
      if (beginnerModeToggle) {
        beginnerModeToggle.addEventListener("click", () => {
          setBeginnerMode(!beginnerModeEnabled);
        });
      }
      if (apiConfigBtn && apiConfigPanel) {
        apiConfigBtn.addEventListener("click", () => {
          apiConfigPanel.classList.toggle("hidden");
        });
      }
      if (apiApplyBtn) {
        apiApplyBtn.addEventListener("click", () => {
          const next = normalizeApiBase(apiBaseInput ? apiBaseInput.value : "");
          if (!next) {
            notify(t("auth.invalidApiUrl"), "error");
            return;
          }
          localStorage.setItem("assistant_api_base", next);
          reloadWithoutApiParam();
        });
      }
      if (apiResetBtn) {
        apiResetBtn.addEventListener("click", () => {
          localStorage.removeItem("assistant_api_base");
          reloadWithoutApiParam();
        });
      }

      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          refreshAll();
        });
      }

      const handleLogout = () => {
        setToken("");
        setAuthState(false);
        setSessionBadge(null);
        setBanner(null);
        setSimpleMode(false);
        setAdminClean(false);
        setBeginnerMode(false);
        if (simpleModeToggle) {
          simpleModeToggle.style.display = "none";
        }
        if (adminCleanToggle) {
          adminCleanToggle.style.display = "none";
        }
        if (beginnerModeToggle) {
          beginnerModeToggle.style.display = "none";
        }
        if (userOnlyMode) {
          const kioskStart = document.getElementById("kioskStart");
          if (kioskStart) {
            kioskStart.classList.remove("hidden");
          }
          if (kioskMode) {
            setKioskWaiting(true);
          }
        }
      };

      if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
      }
      if (logoutBtnBottom) {
        logoutBtnBottom.addEventListener("click", handleLogout);
      }

      if (newChatBtn) {
        newChatBtn.addEventListener("click", () => {
          resetConversation();
          ensureWelcomeMessage();
        });
      }

      if (thanksNewBtn) {
        thanksNewBtn.addEventListener("click", () => {
          resetConversation();
          ensureWelcomeMessage();
        });
      }

      if (showTicketsBtn) {
        showTicketsBtn.addEventListener("click", () => {
          if (!getToken()) {
            setAuthState(false);
            setBanner(t("auth.connectToViewTickets"), "info");
            return;
          }
          setMyTicketsFilter("all");
          togglePanel(myTicketsPanel, true);
          loadMyTickets();
        });
      }
      if (closeTicketsBtn) {
        closeTicketsBtn.addEventListener("click", () => {
          togglePanel(myTicketsPanel, false);
        });
      }
      if (showSupportBtn) {
        showSupportBtn.addEventListener("click", () => {
          loadSupportSettings();
          togglePanel(supportHoursCard, true);
        });
      }
      if (downloadGuideBtn) {
        downloadGuideBtn.addEventListener("click", async () => {
          try {
            await downloadBlobFile(
              "/docs/user-guide.pdf",
              "guide_utilisateur.pdf",
              "application/pdf"
            );
            notify(t("support.guideDownloaded"), "info");
          } catch (err) {
            notify(t("support.guideDownloadFailed"), "error");
          }
        });
      }
      if (closeSupportBtn) {
        closeSupportBtn.addEventListener("click", () => {
          togglePanel(supportHoursCard, false);
        });
      }


      if (showHistoryBtn) {
        showHistoryBtn.addEventListener("click", () => {
          togglePanel(historyPanel, true);
          historyPage = 1;
          loadUserHistoryDetailed(historySearchInputUser ? historySearchInputUser.value : "");
          if (historyDetailPanel) {
            historyDetailPanel.classList.add("hidden");
          }
        });
      }

      if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener("click", () => {
          togglePanel(historyPanel, false);
        });
      }

      if (historyReloadBtn) {
        historyReloadBtn.addEventListener("click", () => {
          historyPage = 1;
          loadUserHistoryDetailed(historySearchInputUser ? historySearchInputUser.value : "");
        });
      }

      if (historySearchBtnUser) {
        historySearchBtnUser.addEventListener("click", () => {
          historyPage = 1;
          loadUserHistoryDetailed(historySearchInputUser ? historySearchInputUser.value : "");
        });
      }
      if (historyPrevBtn) {
        historyPrevBtn.addEventListener("click", () => {
          historyPage = Math.max(1, historyPage - 1);
          loadUserHistoryDetailed(historySearchInputUser ? historySearchInputUser.value : "");
        });
      }
      if (historyNextBtn) {
        historyNextBtn.addEventListener("click", () => {
          historyPage += 1;
          loadUserHistoryDetailed(historySearchInputUser ? historySearchInputUser.value : "");
        });
      }

      if (historySearchInputUser) {
        let historyTimer = null;
        historySearchInputUser.addEventListener("input", () => {
          if (historyTimer) clearTimeout(historyTimer);
          historyTimer = setTimeout(() => {
            historyPage = 1;
            loadUserHistoryDetailed(historySearchInputUser.value);
          }, 350);
        });
      }
      if (historyDetailSearchBtn) {
        historyDetailSearchBtn.addEventListener("click", () => {
          const q = historyDetailSearchInput ? historyDetailSearchInput.value : "";
          const cached = activeHistoryConversation
            ? getCache(`cache_history_${activeHistoryConversation}`, [])
            : [];
          renderHistoryDetail(cached, q);
        });
      }
      if (historyDetailSearchInput) {
        let detailTimer = null;
        historyDetailSearchInput.addEventListener("input", () => {
          if (detailTimer) clearTimeout(detailTimer);
          detailTimer = setTimeout(() => {
            const q = historyDetailSearchInput.value || "";
            const cached = activeHistoryConversation
              ? getCache(`cache_history_${activeHistoryConversation}`, [])
              : [];
            renderHistoryDetail(cached, q);
          }, 300);
        });
      }
      if (historyDetailOpenBtn) {
        historyDetailOpenBtn.addEventListener("click", async () => {
          if (!activeHistoryConversation) return;
          togglePanel(historyPanel, false);
          await loadConversationHistory(activeHistoryConversation);
          focusChatInput();
        });
      }

      if (userOnlyMode) {
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            stopUserRefreshTimer();
          } else if (getToken()) {
            startUserRefreshTimer();
            loadMyTickets();
            if (conversationId) {
              loadConversationTickets(conversationId);
            }
          }
        });
      }
      if (simpleStartBtn) {
        simpleStartBtn.addEventListener("click", () => {
          focusChatInput();
        });
      }
      if (simpleTicketsBtn) {
        simpleTicketsBtn.addEventListener("click", () => {
          togglePanel(myTicketsPanel, true);
          loadMyTickets();
        });
      }

      if (supportStatusText) {
        updateSupportStatus();
        setInterval(updateSupportStatus, 60000);
      }

      if (quickIssueButtons && quickIssueButtons.length) {
        quickIssueButtons.forEach((btn) => {
          bindQuickIssueButton(btn);
        });
      }
      if (showFreeTextBtn) {
        showFreeTextBtn.addEventListener("click", () => {
          document.body.classList.add("show-chat-input");
          ensureWelcomeMessage();
          if (chatForm && chatForm.elements && chatForm.elements.message) {
            chatForm.elements.message.focus();
          }
        });
      }
      if (assistantTabBtn) {
        assistantTabBtn.addEventListener("click", () => setUserTab("assistant"));
      }
      if (kbTabBtn) {
        kbTabBtn.addEventListener("click", () => setUserTab("kb"));
      }
      if (quickIssueSearchInput) {
        let searchTimer = null;
        quickIssueSearchInput.addEventListener("input", () => {
          filterQuickIssuesLocal(quickIssueSearchInput.value);
          if (searchTimer) {
            clearTimeout(searchTimer);
          }
          const value = quickIssueSearchInput.value;
          searchTimer = setTimeout(() => {
            if (value && value.trim().length >= 2) {
              searchQuickIssues(value);
            }
          }, 300);
        });
        quickIssueSearchInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            searchQuickIssues(quickIssueSearchInput.value);
          }
        });
      }
      if (quickIssueSearchBtn) {
        quickIssueSearchBtn.addEventListener("click", () => {
          searchQuickIssues(quickIssueSearchInput ? quickIssueSearchInput.value : "");
        });
      }
      if (kbSearchInputUser) {
        let kbSearchTimer = null;
        kbSearchInputUser.addEventListener("input", () => {
          if (kbSearchTimer) {
            clearTimeout(kbSearchTimer);
          }
          const value = kbSearchInputUser.value;
          kbSearchTimer = setTimeout(() => {
            searchKbUser(value);
          }, 300);
        });
        kbSearchInputUser.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            searchKbUser(kbSearchInputUser.value);
          }
        });
      }
      if (kbSearchBtnUser) {
        kbSearchBtnUser.addEventListener("click", () => {
          searchKbUser(kbSearchInputUser ? kbSearchInputUser.value : "");
        });
      }
      if (kbLevelFilter) {
        kbLevelFilter.addEventListener("change", () => {
          if (kbLastQuery) {
            searchKbUser(kbLastQuery);
          } else {
            renderKbResults([]);
            if (kbSearchResultsUser) {
              kbSearchResultsUser.innerHTML =
                '<div class="ticket-empty">Entrez un mot-cle pour rechercher une procedure.</div>';
            }
          }
        });
      }
      if (userPresentationToggle) {
        userPresentationToggle.addEventListener("click", () => {
          if (!getToken()) return;
          setUserPresentation(!userPresentationEnabled);
        });
      }
      if (quickDetailProcedureBtn) {
        quickDetailProcedureBtn.addEventListener("click", () => {
          if (selectedQuickIssue) {
            showQuickProcedure(selectedQuickIssue);
          }
        });
      }
      if (quickDetailStartBtn) {
        quickDetailStartBtn.addEventListener("click", async () => {
          if (!selectedQuickIssue) return;
          setUserTab("assistant");
          document.body.classList.add("show-chat-input");
          resetConversation();
          await sendChatMessage(selectedQuickIssue.message, { keepGuide: true });
          hideQuickIssueDetail();
        });
      }
      if (quickDetailCloseBtn) {
        quickDetailCloseBtn.addEventListener("click", () => {
          hideQuickIssueDetail();
        });
      }

      if (nextStepProcedureBtn) {
        nextStepProcedureBtn.addEventListener("click", () => {
          if (selectedQuickIssue) {
            showQuickProcedure(selectedQuickIssue);
          }
        });
      }

      if (nextStepKbBtn) {
        nextStepKbBtn.addEventListener("click", async () => {
          setUserTab("kb");
          const query =
            lastUserMessage ||
            (selectedQuickIssue && selectedQuickIssue.label) ||
            "";
          if (query) {
            await searchKbUser(query);
          }
        });
      }

      if (nextStepTicketBtn) {
        nextStepTicketBtn.addEventListener("click", () => {
          if (createTicketBtn) {
            createTicketBtn.click();
          }
        });
      }
      if (guidedModeToggle) {
        guidedModeToggle.addEventListener("click", () => {
          guidedModeEnabled = !guidedModeEnabled;
          localStorage.setItem(
            "assistant_guided_mode",
            guidedModeEnabled ? "on" : "off"
          );
          updateGuidedToggleLabel();
          resetConversation();
        });
      }
      if (userSimpleToggle) {
        userSimpleToggle.addEventListener("click", () => {
          simpleUserModeEnabled = !simpleUserModeEnabled;
          localStorage.setItem(
            "assistant_user_simple",
            simpleUserModeEnabled ? "on" : "off"
          );
          updateSimpleToggleLabel();
          document.body.classList.toggle("simple-user", simpleUserModeEnabled);
          if (simpleDashboard) {
            simpleDashboard.classList.toggle("hidden", !simpleUserModeEnabled);
          }
        });
      }
      if (printSummaryBtn) {
        printSummaryBtn.addEventListener("click", async () => {
          const summary = await buildConversationSummary();
          if (!summary.ok) {
            notify(summary.message || t("summary.unavailable"), "error");
            return;
          }
          const win = window.open("", "_blank");
          if (!win) {
            notify(t("summary.popupBlocked"), "error");
            return;
          }
          const title = t("summary.printTitle");
          win.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>${title}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
                  h1 { font-size: 20px; margin-bottom: 12px; }
                  pre { white-space: pre-wrap; font-size: 13px; line-height: 1.45; }
                </style>
              </head>
              <body>
                <h1>${title}</h1>
                <pre>${escapeHtml(summary.text)}</pre>
              </body>
            </html>
          `);
          win.document.close();
          win.focus();
          win.print();
        });
      }
      if (homeBrand && userOnlyMode) {
        homeBrand.addEventListener("click", (event) => {
          event.preventDefault();
          goHome();
        });
      }
      if (backToChatBtn) {
        backToChatBtn.addEventListener("click", () => {
          togglePanel(myTicketsPanel, false);
          hideTicketDetail();
          focusChatInput();
        });
      }
      if (ticketResumeBtn) {
        ticketResumeBtn.addEventListener("click", async () => {
          const convoId = ticketResumeBtn.dataset.conversationId;
          if (!convoId) return;
          togglePanel(myTicketsPanel, false);
          await loadConversationHistory(convoId);
          focusChatInput();
        });
      }
      if (chatSearchBtn) {
        chatSearchBtn.addEventListener("click", () => {
          chatSearchQuery = chatSearchInput ? chatSearchInput.value || "" : "";
          refreshChatSearch();
        });
      }
      if (chatSearchInput) {
        let chatSearchTimer = null;
        chatSearchInput.addEventListener("input", () => {
          chatSearchQuery = chatSearchInput.value || "";
          if (chatSearchTimer) clearTimeout(chatSearchTimer);
          chatSearchTimer = setTimeout(() => {
            refreshChatSearch();
          }, 300);
        });
      }
      if (chatSearchClearBtn) {
        chatSearchClearBtn.addEventListener("click", () => {
          if (chatSearchInput) {
            chatSearchInput.value = "";
          }
          chatSearchQuery = "";
          refreshChatSearch();
        });
      }
      if (summaryFilterItems && summaryFilterItems.length) {
        summaryFilterItems.forEach((item) => {
          item.addEventListener("click", () => {
            const filter = item.getAttribute("data-summary-filter") || "all";
            setMyTicketsFilter(filter);
            ticketsPage = 1;
            togglePanel(myTicketsPanel, true);
            loadMyTickets();
          });
        });
      }
      if (myTicketsFilterButtons && myTicketsFilterButtons.length) {
        myTicketsFilterButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const filter = btn.getAttribute("data-my-tickets-filter") || "all";
            setMyTicketsFilter(filter);
            ticketsPage = 1;
            loadMyTickets();
          });
        });
      }
      if (ticketsPrevBtn) {
        ticketsPrevBtn.addEventListener("click", () => {
          ticketsPage = Math.max(1, ticketsPage - 1);
          loadMyTickets();
        });
      }
      if (ticketsNextBtn) {
        ticketsNextBtn.addEventListener("click", () => {
          ticketsPage += 1;
          loadMyTickets();
        });
      }
      if (myTicketsSearchInput) {
        let ticketsSearchTimer = null;
        myTicketsSearchInput.addEventListener("input", () => {
          myTicketsSearch = myTicketsSearchInput.value || "";
          if (ticketsSearchTimer) {
            clearTimeout(ticketsSearchTimer);
          }
          ticketsSearchTimer = setTimeout(() => {
            ticketsPage = 1;
            loadMyTickets();
          }, 300);
        });
      }
      if (myTicketsSearchBtn) {
        myTicketsSearchBtn.addEventListener("click", () => {
          myTicketsSearch = myTicketsSearchInput ? myTicketsSearchInput.value : "";
          loadMyTickets();
        });
      }
      if (myTicketsSortSelect) {
        myTicketsSortSelect.addEventListener("change", () => {
          myTicketsSort = myTicketsSortSelect.value || "newest";
          ticketsPage = 1;
          loadMyTickets();
        });
      }
      if (myTicketsExportBtn) {
        myTicketsExportBtn.addEventListener("click", async () => {
          try {
            await downloadFile(
              "/tickets/mine/export.pdf",
              "mes_tickets.pdf",
              "application/pdf"
            );
          } catch (err) {
            notify(t("export.pdfFailed"), "error");
          }
        });
      }
      if (myTicketsExportCsvBtn) {
        myTicketsExportCsvBtn.addEventListener("click", async () => {
          try {
            await downloadFile("/tickets/mine/export.csv", "mes_tickets.csv", "text/csv");
          } catch (err) {
            notify(t("export.csvFailed"), "error");
          }
        });
      }
      if (adminGalleryRefreshBtn) {
        adminGalleryRefreshBtn.addEventListener("click", () => {
          loadAdminGallery();
        });
      }
      if (adminGallerySearchBtn) {
        adminGallerySearchBtn.addEventListener("click", () => {
          loadAdminGallery();
        });
      }
      if (adminGallerySearch) {
        adminGallerySearch.addEventListener("input", () => {
          loadAdminGallery();
        });
      }
      if (adminGalleryRangeButtons && adminGalleryRangeButtons.length) {
        adminGalleryRangeButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const value = btn.getAttribute("data-gallery-range") || "all";
            const days = value === "all" ? 0 : Number(value || 0);
            if (adminGalleryCard) {
              adminGalleryCard.dataset.galleryDays = String(days || 0);
            }
            adminGalleryRangeButtons.forEach((item) => {
              item.classList.toggle("active", item === btn);
            });
            loadAdminGallery();
          });
        });
      }
      const kioskStart = document.getElementById("kioskStart");
      const startBtn = document.getElementById("startBtn");
      if (kioskStart && userOnlyMode) {
        kioskStart.classList.remove("hidden");
        setTimeout(() => kioskStart.classList.add("show"), 20);
        if (startBtn) {
          startBtn.addEventListener("click", async () => {
            kioskStart.classList.remove("show");
            kioskStart.classList.add("hidden");
            setKioskWaiting(false);
            await tryKioskAutoLogin();
            focusChatInput();
          });
        }
      }

      if (convoSearchBtn) {
        convoSearchBtn.addEventListener("click", (event) => {
          event.preventDefault();
          loadConversations();
          searchHistory();
        });
      }

      if (convoSearchInput) {
        convoSearchInput.addEventListener("input", () => {
          loadConversations();
          searchHistory();
        });
      }

      if (chatForm) {
        chatForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(chatForm);
          const message = formData.get("message");
          await sendChatMessage(message);
        });
      }

      if (quickTicketBtn && quickTicketInput) {
        quickTicketBtn.addEventListener("click", () => {
          handleQuickTicketRequest();
        });
        quickTicketInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleQuickTicketRequest();
          }
        });
      }

      function isChatTarget(target) {
        if (!target) return false;
        return (
          (chatForm && chatForm.contains(target)) ||
          (chatWindow && chatWindow.contains(target))
        );
      }

      function handleChatImageFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const file = Array.from(fileList).find(
          (item) => item && item.type && item.type.startsWith("image/")
        );
        if (!file) {
          notify(t("upload.noImageDetected"), "error");
          return;
        }
        uploadChatImage(file);
      }

      if (chatImageBtn && chatImageInput) {
        chatImageBtn.addEventListener("click", () => chatImageInput.click());
        chatImageInput.addEventListener("change", () => {
          handleChatImageFiles(chatImageInput.files);
          chatImageInput.value = "";
        });
      }

      if (chatWindow || chatForm) {
        const dragEnter = (event) => {
          event.preventDefault();
          if (chatWindow) chatWindow.classList.add("dragover");
        };
        const dragLeave = () => {
          if (chatWindow) chatWindow.classList.remove("dragover");
        };
        const dropHandler = (event) => {
          event.preventDefault();
          if (chatWindow) chatWindow.classList.remove("dragover");
          if (!isChatTarget(event.target)) return;
          handleChatImageFiles(event.dataTransfer.files);
        };
        if (chatWindow) {
          chatWindow.addEventListener("dragover", dragEnter);
          chatWindow.addEventListener("dragleave", dragLeave);
          chatWindow.addEventListener("drop", dropHandler);
        }
        if (chatForm) {
          chatForm.addEventListener("dragover", dragEnter);
          chatForm.addEventListener("dragleave", dragLeave);
          chatForm.addEventListener("drop", dropHandler);
        }
      }

      document.addEventListener("paste", (event) => {
        if (!isChatTarget(event.target)) return;
        const items = event.clipboardData ? event.clipboardData.items : [];
        if (!items || !items.length) return;
        const imageItem = Array.from(items).find(
          (item) => item.type && item.type.startsWith("image/")
        );
        if (!imageItem) return;
        const file = imageItem.getAsFile();
        if (file) {
          uploadChatImage(file);
        }
      });

      if (chatWindow) {
        chatWindow.addEventListener("click", (event) => {
          const target = event.target.closest("[data-image-zoom]");
          if (!target) return;
          event.preventDefault();
          const url = target.getAttribute("data-image-zoom");
          openImageLightbox(url);
        });
      }

      if (chatGallery) {
        chatGallery.addEventListener("click", (event) => {
          const target = event.target.closest("[data-image-zoom]");
          if (!target) return;
          event.preventDefault();
          const url = target.getAttribute("data-image-zoom");
          openImageLightbox(url);
        });
      }

      if (adminGalleryGrid) {
        adminGalleryGrid.addEventListener("click", (event) => {
          const target = event.target.closest("[data-image-zoom]");
          if (!target) return;
          event.preventDefault();
          const url = target.getAttribute("data-image-zoom");
          openImageLightbox(url);
        });
      }

      if (imageLightbox) {
        const overlay = imageLightbox.querySelector("[data-lightbox-close]");
        if (overlay) {
          overlay.addEventListener("click", closeImageLightbox);
        }
        if (imageLightboxClose) {
          imageLightboxClose.addEventListener("click", closeImageLightbox);
        }
        imageLightbox.addEventListener("click", (event) => {
          if (event.target === imageLightbox) {
            closeImageLightbox();
          }
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeImageLightbox();
          }
        });
      }

      async function loadTicketDraft() {
        if (!conversationId) return null;
        try {
          const data = await fetchWithAuth("/tickets/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conversationId })
          });
          return data.draft || null;
        } catch (err) {
          notify(t("ticket.draftFailed"), "error");
          return null;
        }
      }

      async function handleQuickTicketRequest() {
        if (!quickTicketInput || !quickTicketBtn) return;
        const message = (quickTicketInput.value || "").trim();
        if (!message) {
          notify(t("ticket.quick.empty"), "error");
          return;
        }
        if (!getToken()) {
          setStatus(t("auth.connectBeforeMessage"), true);
          notify(t("auth.connectBeforeMessage"), "error");
          return;
        }
        quickTicketBtn.disabled = true;
        quickTicketBtn.textContent = t("ticket.quick.pending");
        try {
          await sendChatMessage(message);
          await waitForChatIdle();
          const draft = await loadTicketDraft();
          if (draft) {
            pendingTicketDraft = draft;
            showTicketPreview(draft);
          } else {
            notify(t("ticket.autoEscalationNote"), "info");
          }
          quickTicketInput.value = "";
        } finally {
          quickTicketBtn.disabled = false;
          quickTicketBtn.textContent = t("ticket.quick.button");
        }
      }

      async function sendFeedback(resolved) {
        if (!conversationId) {
          notify(t("chat.noConversation"), "error");
          return;
        }
        const rating =
          ratingSelect && ratingSelect.value ? Number(ratingSelect.value) : undefined;
        const comment = feedbackComment ? feedbackComment.value || undefined : undefined;
        try {
          const token = getToken();
          const res = await fetch(`${API_BASE}/chat/feedback`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              resolved,
              rating,
              comment
            })
          });
          if (!res.ok) {
            const payload = await safeJson(res);
            if (res.status === 401) {
              notify(t("session.expiredShort"), "error");
              return;
            }
            if (res.status === 404) {
              notify(t("chat.notFound"), "error");
              return;
            }
            notify(
              payload && payload.error
                ? t("feedback.failedWithError", { error: payload.error })
                : t("feedback.failed"),
              "error"
            );
            return;
          }
          const data = await safeJson(res);
          notify(t("feedback.sent"), "info");
          if (beginnerModeEnabled && resolved) {
            setBeginnerStep(t("beginner.step4.resolved"));
          }
          if (data && typeof data.failure_count === "number" && typeof data.threshold === "number") {
            updateFailureHint(data.failure_count, data.threshold);
          }
          if (resolved) {
            setConversationStatus("resolved");
            setNextStep({
              text: t("conversation.resolvedThanks"),
              showProcedure: false,
              showKb: false,
              showTicket: false,
              replies: []
            });
          } else if (data && data.ticket_created) {
            setConversationStatus("escalated");
            setNextStep({
              text: t("conversation.ticketCreated"),
              showProcedure: false,
              showKb: false,
              showTicket: false,
              replies: []
            });
          } else {
            setConversationStatus("open");
            setNextStep({
              text: t("conversation.needMore"),
              showProcedure: Boolean(selectedQuickIssue && getQuickIssueGuide(selectedQuickIssue.key)),
              showKb: Boolean(lastSources && lastSources.length),
              showTicket: true,
              replies: [
                {
                  label: t("reply.stillSame"),
                  action: "message",
                  payload: `${t("reply.stillSame")}.`
                },
                { label: t("reply.resolved"), action: "resolve" }
              ]
            });
          }
          return data;
        } catch (err) {
          notify(t("feedback.failed"), "error");
        }
      }

      if (resolveYesBtn) {
        resolveYesBtn.addEventListener("click", () => sendFeedback(true));
      }
      if (createTicketBtn) {
        createTicketBtn.addEventListener("click", async () => {
          if (!conversationId) {
            notify(t("chat.noConversation"), "error");
            return;
          }
          hideTicketPreview();
          try {
            const feedback = await sendFeedback(false);
            if (feedback && feedback.ticket_created && feedback.ticket) {
              setCreateTicketState("created");
              setTicketBadgeState("created", feedback.ticket);
              pendingTicketDraft = {
                title: feedback.ticket.title,
                summary: feedback.ticket.description,
                category: feedback.ticket.category,
                priority: feedback.ticket.priority
              };
              showTicketThanks("created");
              latestTicketStatus = feedback.ticket.status || "open";
              setConversationStatus("escalated");
              loadConversationTickets(conversationId);
              if (getViewRole() === "user") {
                loadMyTickets();
              } else {
                loadTickets();
              }
              if (beginnerModeEnabled) {
                setBeginnerStep(t("beginner.step4.ticket"));
              }
            } else {
              const draft = await loadTicketDraft();
              if (draft) {
                pendingTicketDraft = draft;
                showTicketPreview(draft);
              } else {
                notify(t("ticket.autoEscalationNote"), "info");
              }
            }
          } catch (err) {
            notify(t("feedback.failed"), "error");
          }
        });
      }

      if (ticketPreviewCancel) {
        ticketPreviewCancel.addEventListener("click", hideTicketPreview);
      }

      if (ticketPreviewConfirm) {
        ticketPreviewConfirm.addEventListener("click", async () => {
          if (!conversationId) {
            notify(t("chat.noConversation"), "error");
            return;
          }
          try {
            setCreateTicketState("pending");
            const ticket = await fetchWithAuth("/chat/escalate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversation_id: conversationId,
                reason: t("ticket.userEscalationReason")
              })
            });
            hideTicketPreview();
            setCreateTicketState(ticket.created ? "created" : "exists");
            setTicketBadgeState(ticket.created ? "created" : "exists", ticket.ticket);
            if (ticket.ticket) {
              pendingTicketDraft = {
                title: ticket.ticket.title,
                summary: ticket.ticket.description,
                category: ticket.ticket.category,
                priority: ticket.ticket.priority
              };
            }
            showTicketThanks(ticket.created ? "created" : "exists");
            latestTicketStatus = ticket.ticket ? ticket.ticket.status : "open";
            setConversationStatus("escalated");
            loadConversationTickets(conversationId);
            if (getViewRole() === "user") {
              loadMyTickets();
            } else {
              loadTickets();
            }
          } catch (err) {
            setCreateTicketState("idle");
            notify(t("ticket.createFailed"), "error");
          }
        });
      }

      if (kbForm) {
        kbForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(kbForm);
          const payload = {
            title: formData.get("title"),
            source_type: formData.get("source_type"),
            content: formData.get("content")
          };
          try {
            await fetchWithAuth("/kb/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            kbForm.reset();
            loadKb();
          } catch (err) {
            setStatus(t("kb.addFailed"), true);
            notify(t("kb.addFailed"), "error");
          }
        });
      }

      if (kbBulkForm) {
        kbBulkForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(kbBulkForm);
          const baseTitle = (formData.get("bulk_title") || "").trim();
          const sourceType = formData.get("bulk_type") || "faq";
          const raw = formData.get("bulk_content") || "";
          const lines = raw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          if (!lines.length) {
            setStatus(t("import.none"), true);
            return;
          }

          let success = 0;
          for (const line of lines) {
            const parts = line.split("|");
            const title = (parts[0] || "").trim();
            const content = (parts.slice(1).join("|") || "").trim();
            if (!title || !content) {
              continue;
            }
            const fullTitle = baseTitle ? `${baseTitle} - ${title}` : title;
            try {
              await fetchWithAuth("/kb/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: fullTitle,
                  source_type: sourceType,
                  content
                })
              });
              success += 1;
            } catch (err) {
              // continue
            }
          }
          kbBulkForm.reset();
          loadKb();
          notify(t("import.done", { count: success }), "info");
        });
      }

      if (kbSearchBtn) {
        kbSearchBtn.addEventListener("click", (event) => {
          event.preventDefault();
          searchKb();
        });
      }

      if (kbUploadForm) {
        kbUploadForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(kbUploadForm);
          const files = kbFilesInput ? kbFilesInput.files : null;
          if (!files || files.length === 0) {
            setStatus(t("upload.chooseFile"), true);
            return;
          }
          const payload = new FormData();
          Array.from(files).forEach((file) => payload.append("files", file));
          const title = formData.get("file_title");
          const type = formData.get("file_type");
          if (title) payload.append("title", title);
          if (type) payload.append("source_type", type);
          try {
            await fetchWithAuth("/kb/upload", {
              method: "POST",
              body: payload
            });
            kbUploadForm.reset();
            loadKb();
          } catch (err) {
            setStatus(t("kb.uploadFailed"), true);
            notify(t("kb.uploadFailed"), "error");
          }
        });
      }

      if (dropZone) {
        ["dragenter", "dragover"].forEach((eventName) => {
          dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("active");
          });
        });

        ["dragleave", "drop"].forEach((eventName) => {
          dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("active");
          });
        });

        dropZone.addEventListener("drop", (event) => {
          const files = event.dataTransfer.files;
          if (files && files.length && kbFilesInput) {
            const dataTransfer = new DataTransfer();
            Array.from(files).forEach((file) => dataTransfer.items.add(file));
            kbFilesInput.files = dataTransfer.files;
          }
        });
      }

      if (ticketForm) {
        ticketForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(ticketForm);
          const payload = {
            title: formData.get("title"),
            summary: formData.get("summary"),
            category: formData.get("category"),
            priority: formData.get("priority")
          };
          try {
            await fetchWithAuth("/tickets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            ticketForm.reset();
            loadTickets();
          } catch (err) {
            setStatus(t("ticket.createFailed"), true);
            notify(t("ticket.createFailed"), "error");
          }
        });
      }

      if (reloadTicketsBtn) {
        reloadTicketsBtn.addEventListener("click", loadTickets);
      }
      if (reloadMyTicketsBtn) {
        reloadMyTicketsBtn.addEventListener("click", loadMyTickets);
      }
      if (ticketUserFilterBtn) {
        ticketUserFilterBtn.addEventListener("click", async () => {
          const userId = ticketUserFilter ? ticketUserFilter.value : "";
          if (!userId) {
            loadTickets();
            return;
          }
          try {
            const data = await fetchWithAuth(`/tickets/user/${userId}`);
            renderTickets(data.items || []);
            setNetStatus(true);
          } catch (err) {
            setStatus(t("tickets.filterFailed"), true);
            setNetStatus(false);
          }
        });
      }
      if (reloadUsersBtn) {
        reloadUsersBtn.addEventListener("click", loadUsers);
      }

      if (backupBtn) {
        backupBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/backup");
          const blob = new Blob([text], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "backup.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus(t("backup.failed"), true);
          notify(t("backup.failed"), "error");
        }
        });
      }

      if (kbExportJsonBtn) {
        kbExportJsonBtn.addEventListener("click", async () => {
          try {
            const text = await fetchTextWithAuth("/admin/kb/export.json");
            const blob = new Blob([text], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "kb_export.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (err) {
            setStatus(t("kb.exportJsonFailed"), true);
            notify(t("kb.exportJsonFailed"), "error");
          }
        });
      }

      if (kbExportCsvBtn) {
        kbExportCsvBtn.addEventListener("click", async () => {
          try {
            const text = await fetchTextWithAuth("/admin/kb/export.csv");
            const blob = new Blob([text], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "kb_export.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (err) {
            setStatus(t("kb.exportCsvFailed"), true);
            notify(t("kb.exportCsvFailed"), "error");
          }
        });
      }

      if (kbImportInput) {
        kbImportInput.addEventListener("change", async () => {
          const file = kbImportInput.files[0];
          if (!file) return;
          const payload = new FormData();
          payload.append("file", file);
          try {
            await fetchWithAuth("/admin/kb/import", {
              method: "POST",
              body: payload
            });
            kbImportInput.value = "";
            loadKb();
          } catch (err) {
            setStatus(t("kb.importFailed"), true);
            notify(t("kb.importFailed"), "error");
          }
        });
      }

      if (kbCsvImportInput) {
        kbCsvImportInput.addEventListener("change", async () => {
          const file = kbCsvImportInput.files[0];
          if (!file) return;
          const payload = new FormData();
          payload.append("file", file);
          try {
            const data = await fetchWithAuth("/admin/kb/import-csv", {
              method: "POST",
              body: payload
            });
            kbCsvImportInput.value = "";
            loadKb();
            notify(
              t("kb.csvImported", { count: data && data.count ? data.count : 0 }),
              "info"
            );
          } catch (err) {
            notify(t("import.csvFailed"), "error");
          }
        });
      }

      if (kbCsvTemplateBtn) {
        kbCsvTemplateBtn.addEventListener("click", () => {
          const template =
            "title,content,source_type,source_url\n" +
            "Procedure VPN,Etape 1... Etape 2...,procedure,\n";
          const blob = new Blob([template], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "kb_template.csv";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        });
      }

      if (kbExportFilteredBtn) {
        kbExportFilteredBtn.addEventListener("click", async () => {
          const params = new URLSearchParams();
          const query = kbExportQuery ? kbExportQuery.value.trim() : "";
          const level = kbExportLevel ? kbExportLevel.value : "all";
          if (query) {
            params.set("query", query);
          }
          if (level && level !== "all") {
            params.set("level", level);
          }
          const suffix = params.toString() ? `?${params.toString()}` : "";
          try {
            await downloadFile(`/admin/kb/export.csv${suffix}`, "kb_export.csv", "text/csv");
          } catch (err) {
            notify(t("kb.exportCsvFilterFailed"), "error");
          }
        });
      }

      if (convoExportJsonBtn) {
        convoExportJsonBtn.addEventListener("click", async () => {
          try {
            const text = await fetchTextWithAuth("/admin/conversations/export.json");
            const blob = new Blob([text], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "conversations_export.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (err) {
            setStatus(t("conversations.exportJsonFailed"), true);
            notify(t("conversations.exportJsonFailed"), "error");
          }
        });
      }

      if (convoExportCsvBtn) {
        convoExportCsvBtn.addEventListener("click", async () => {
          try {
            const text = await fetchTextWithAuth("/admin/conversations/export.csv");
            const blob = new Blob([text], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "conversations_export.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (err) {
            setStatus(t("conversations.exportCsvFailed"), true);
            notify(t("conversations.exportCsvFailed"), "error");
          }
        });
      }

      if (glpiTestBtn) {
        glpiTestBtn.addEventListener("click", async () => {
          if (glpiTestStatus) {
            glpiTestStatus.textContent = t("glpi.testPending");
            glpiTestStatus.className = "status";
          }
          try {
            const data = await fetchWithAuth("/admin/glpi/test");
            if (data && data.ok) {
              notify(t("glpi.ok"), "info");
              if (glpiTestStatus) {
                glpiTestStatus.textContent = t("glpi.okLabel");
                glpiTestStatus.className = "status";
              }
              return;
            }
            notify(t("glpi.checkFailed"), "error");
            if (glpiTestStatus) {
              glpiTestStatus.textContent = t("glpi.checkFailedLabel");
              glpiTestStatus.className = "status error";
            }
          } catch (err) {
            notify(t("glpi.notConfigured"), "error");
            if (glpiTestStatus) {
              glpiTestStatus.textContent = t("glpi.notConfiguredLabel");
              glpiTestStatus.className = "status error";
            }
          }
        });
      }

      if (backupListBtn) {
        backupListBtn.addEventListener("click", async () => {
          try {
            const data = await fetchWithAuth("/admin/backups");
            const items = data.items || [];
            if (!items.length) {
              notify(t("backup.none"), "info");
              return;
            }
            const latest = items[0];
            const date = latest.mtime
              ? new Date(latest.mtime).toLocaleString("fr-FR")
              : "";
            notify(
              t("backup.count", { count: items.length, date }),
              "info"
            );
            if (backupSelect) {
              backupSelect.innerHTML = `<option value="">${t(
                "backup.choose"
              )}</option>`;
              items.forEach((item) => {
                const label = `${item.file} (${new Date(item.mtime).toLocaleString("fr-FR")})`;
                const option = document.createElement("option");
                option.value = item.file;
                option.textContent = label;
                backupSelect.appendChild(option);
              });
              backupSelect.value = latest.file || "";
            }
          } catch (err) {
            notify(t("backup.readFailed"), "error");
          }
        });
      }

      if (backupRestoreBtn) {
        backupRestoreBtn.addEventListener("click", async () => {
          try {
            await fetchWithAuth("/admin/backups/restore-latest", {
              method: "POST"
            });
            notify(t("backup.restored"), "info");
            refreshAll();
          } catch (err) {
            notify(t("backup.restoreFailed"), "error");
          }
        });
      }

      if (backupRestoreSelectedBtn) {
        backupRestoreSelectedBtn.addEventListener("click", async () => {
          const file = backupSelect ? backupSelect.value : "";
          if (!file) {
            notify(t("backup.choose"), "error");
            return;
          }
          try {
            await fetchWithAuth(`/admin/backups/restore/${encodeURIComponent(file)}`, {
              method: "POST"
            });
            notify(t("backup.restored"), "info");
            refreshAll();
          } catch (err) {
            notify(t("backup.restoreFailed"), "error");
          }
        });
      }

      if (backupDownloadBtn) {
        backupDownloadBtn.addEventListener("click", async () => {
          const file = backupSelect ? backupSelect.value : "";
          if (!file) {
            notify(t("backup.choose"), "error");
            return;
          }
          try {
            await downloadBlobFile(
              `/admin/backups/download/${encodeURIComponent(file)}`,
              file,
              "application/json"
            );
          } catch (err) {
            notify(t("backup.downloadFailed"), "error");
          }
        });
      }

      if (restoreInput) {
        restoreInput.addEventListener("change", async () => {
          const file = restoreInput.files[0];
          if (!file) return;
          const payload = new FormData();
          payload.append("file", file);
          try {
            await fetchWithAuth("/admin/restore", {
              method: "POST",
              body: payload
            });
            restoreInput.value = "";
            refreshAll();
          } catch (err) {
            setStatus(t("backup.restoreFailed"), true);
            notify(t("backup.restoreFailed"), "error");
          }
        });
      }

      if (reloadNotificationsBtn) {
        reloadNotificationsBtn.addEventListener("click", loadNotifications);
      }
      if (testNotificationBtn) {
        testNotificationBtn.addEventListener("click", async () => {
          try {
            await fetchWithAuth("/notifications/test", { method: "POST" });
            loadNotifications();
          } catch (err) {
            setStatus(t("notifications.testFailed"), true);
            notify(t("notifications.testFailed"), "error");
          }
        });
      }

      if (webhookNotificationBtn) {
        webhookNotificationBtn.addEventListener("click", async () => {
          try {
            await fetchWithAuth("/notifications/webhook-local", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sample: "payload", at: new Date().toISOString() })
            });
            loadNotifications();
          } catch (err) {
            setStatus(t("notifications.webhookFailed"), true);
            notify(t("notifications.webhookFailed"), "error");
          }
        });
      }

      if (orgSettingsForm) {
        const buildOrgSettingsPayload = () => {
          const formData = new FormData(orgSettingsForm);
          const getField = (name) =>
            orgSettingsForm.querySelector(`[name="${name}"]`);
          const hasField = (name) => Boolean(getField(name));
          const readField = (name, fallback = "") => {
            const el = getField(name);
            if (!el) return undefined;
            if (el.type === "checkbox") {
              return el.checked;
            }
            const raw = formData.get(name);
            return raw == null ? fallback : raw;
          };
          const payload = {
          };
          const setIf = (name, value) => {
            if (value === undefined) return;
            payload[name] = value;
          };
          setIf("support_email", readField("support_email", ""));
          setIf("support_phone", readField("support_phone", ""));
          setIf("support_hours", readField("support_hours", ""));
          setIf("logo_url", readField("logo_url", ""));
          setIf("signature", readField("signature", ""));
          setIf("webhook_url", readField("webhook_url", ""));
          setIf("webhook_secret", readField("webhook_secret", ""));
          setIf("slack_webhook_url", readField("slack_webhook_url", ""));
          setIf("teams_webhook_url", readField("teams_webhook_url", ""));
          setIf("glpi_enabled", readField("glpi_enabled", false));
          setIf("glpi_base_url", readField("glpi_base_url", ""));
          setIf("glpi_app_token", readField("glpi_app_token", ""));
          setIf("glpi_user_token", readField("glpi_user_token", ""));
          setIf("ad_enabled", readField("ad_enabled", false));
          setIf("ad_url", readField("ad_url", ""));
          setIf("ad_domain", readField("ad_domain", ""));
          setIf("ad_base_dn", readField("ad_base_dn", ""));
          setIf("ad_bind_user", readField("ad_bind_user", ""));
          setIf("ad_bind_password", readField("ad_bind_password", ""));
          setIf(
            "notify_on_ticket_created",
            readField("notify_on_ticket_created", false)
          );
          setIf("mailbox_enabled", readField("mailbox_enabled", false));
          setIf("mailbox_provider", readField("mailbox_provider", "gmail"));
          setIf("mailbox_user", readField("mailbox_user", ""));
          setIf("mailbox_password", readField("mailbox_password", ""));
          setIf("mailbox_host", readField("mailbox_host", ""));
          setIf("mailbox_folder", readField("mailbox_folder", "INBOX"));
          setIf("mailbox_subject_prefix", readField("mailbox_subject_prefix", ""));
          setIf("slack_signing_secret", readField("slack_signing_secret", ""));
          setIf("teams_signing_secret", readField("teams_signing_secret", ""));
          setIf("oauth_google_client_id", readField("oauth_google_client_id", ""));
          setIf(
            "oauth_google_client_secret",
            readField("oauth_google_client_secret", "")
          );
          setIf(
            "oauth_google_redirect_uri",
            readField("oauth_google_redirect_uri", "")
          );
          setIf("oauth_google_scopes", readField("oauth_google_scopes", ""));
          setIf("oauth_outlook_client_id", readField("oauth_outlook_client_id", ""));
          setIf(
            "oauth_outlook_client_secret",
            readField("oauth_outlook_client_secret", "")
          );
          setIf(
            "oauth_outlook_redirect_uri",
            readField("oauth_outlook_redirect_uri", "")
          );
          setIf("oauth_outlook_scopes", readField("oauth_outlook_scopes", ""));

          if (hasField("mailbox_port")) {
            const mailboxPort = Number(readField("mailbox_port", 993));
            if (!Number.isNaN(mailboxPort)) {
              payload.mailbox_port = mailboxPort;
            }
          }
          if (hasField("mailbox_tls")) {
            payload.mailbox_tls = Boolean(readField("mailbox_tls", true));
          }
          if (hasField("escalation_threshold")) {
            const threshold = Number(readField("escalation_threshold", 2));
            if (!Number.isNaN(threshold)) {
              payload.escalation_threshold = threshold;
            }
          }
          if (hasField("sla_hours")) {
            const slaHours = Number(readField("sla_hours", 0));
            if (!Number.isNaN(slaHours)) {
              payload.sla_hours = slaHours;
            }
          }
          if (hasField("sla_warning_pct")) {
            const slaWarningPct = Number(readField("sla_warning_pct", 0));
            if (!Number.isNaN(slaWarningPct)) {
              payload.sla_warning_pct = slaWarningPct;
            }
          }
          if (hasField("cost_per_ticket")) {
            const costPerTicket = Number(readField("cost_per_ticket", 0));
            if (!Number.isNaN(costPerTicket)) {
              payload.cost_per_ticket = costPerTicket;
            }
          }
          if (hasField("reminder_hours")) {
            const reminderValue = Number(readField("reminder_hours", 72));
            if (!Number.isNaN(reminderValue)) {
              payload.reminder_hours = reminderValue;
            }
          }
          return payload;
        };

        const isBlank = (value) => !value || !String(value).trim();
        const isValidUrl = (value, protocols = []) => {
          if (!value) return false;
          try {
            const url = new URL(value);
            if (protocols.length && !protocols.includes(url.protocol)) {
              return false;
            }
            return true;
          } catch (err) {
            return false;
          }
        };
        const validateOrgSettingsPayload = (payload) => {
          const errors = [];
          if (payload.glpi_enabled) {
            const missing = ["glpi_base_url", "glpi_app_token", "glpi_user_token"].filter(
              (field) => isBlank(payload[field])
            );
            if (missing.length) {
              errors.push(t("orgSettings.validation.glpi"));
            }
          }
          if (payload.ad_enabled) {
            const missing = [
              "ad_url",
              "ad_domain",
              "ad_base_dn",
              "ad_bind_user",
              "ad_bind_password"
            ].filter((field) => isBlank(payload[field]));
            if (missing.length) {
              errors.push(t("orgSettings.validation.ad"));
            }
          }
          if (payload.glpi_base_url && !isValidUrl(payload.glpi_base_url, ["http:", "https:"])) {
            errors.push(t("orgSettings.validation.url", { field: "GLPI" }));
          }
          if (payload.ad_url && !isValidUrl(payload.ad_url, ["ldap:", "ldaps:"])) {
            errors.push(t("orgSettings.validation.url", { field: "AD/LDAP" }));
          }
          return errors;
        };

        const saveOrgSettings = async ({ validate = false } = {}) => {
          const payload = buildOrgSettingsPayload();
          const validationErrors = validateOrgSettingsPayload(payload);
          if (validationErrors.length) {
            setOrgStatus(validationErrors[0], true);
            if (validate) {
              const err = new Error("validation_failed");
              err.validationMessage = validationErrors[0];
              throw err;
            }
            return;
          }
          try {
            await fetchWithAuth("/org/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (!logoParam && Object.prototype.hasOwnProperty.call(payload, "logo_url")) {
              const nextLogo =
                typeof payload.logo_url === "string" ? payload.logo_url.trim() : "";
              if (nextLogo) {
                localStorage.setItem("assistant_logo_url", nextLogo);
              } else {
                localStorage.removeItem("assistant_logo_url");
              }
              applyBrandLogo(nextLogo || "");
              brandingLoaded = true;
            }
            setOrgStatus(t("orgSettings.saved"), false);
          } catch (err) {
            setOrgStatus(t("orgSettings.saveFailed"), true);
            throw err;
          }
        };

        orgSettingsForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (orgSettingsAutoTimer) {
            clearTimeout(orgSettingsAutoTimer);
            orgSettingsAutoTimer = null;
          }
          try {
            await saveOrgSettings({ validate: true });
            notify(t("orgSettings.saved"), "info");
          } catch (err) {
            if (err && err.message === "validation_failed") {
              if (err.validationMessage) {
                notify(err.validationMessage, "error");
              }
              return;
            }
            notify(t("orgSettings.saveFailed"), "error");
          }
        });

        const scheduleOrgSettingsSave = () => {
          if (!orgSettingsLoaded) return;
          if (orgSettingsAutoTimer) {
            clearTimeout(orgSettingsAutoTimer);
          }
          setOrgStatus(t("orgSettings.autoSaving"), false);
          orgSettingsAutoTimer = setTimeout(async () => {
            try {
              await saveOrgSettings({ validate: false });
              notify(t("orgSettings.autoSaved"), "info");
            } catch (err) {
              notify(t("orgSettings.autoSaveFailed"), "error");
            }
          }, 800);
        };

        orgSettingsForm.addEventListener("input", scheduleOrgSettingsSave);
        orgSettingsForm.addEventListener("change", scheduleOrgSettingsSave);
      }

      if (orgSettingsReloadBtn) {
        orgSettingsReloadBtn.addEventListener("click", () => loadOrgSettings());
      }

      if (checklistReloadBtn) {
        checklistReloadBtn.addEventListener("click", () => loadChecklist());
      }
      if (metricsRefreshBtn) {
        metricsRefreshBtn.addEventListener("click", () => loadMetricsSummary());
      }
      if (miniDashboardRefreshBtn) {
        miniDashboardRefreshBtn.addEventListener("click", () => loadMiniDashboard());
      }
      if (recentTicketsRefreshBtn) {
        recentTicketsRefreshBtn.addEventListener("click", () => loadRecentTickets());
      }
      if (checklistExportBtn) {
        checklistExportBtn.addEventListener("click", async () => {
          try {
            await downloadFile(
              "/admin/checklist/export.csv",
              "checklist_configuration.csv",
              "text/csv"
            );
            notify(t("checklist.exported"), "info");
          } catch (err) {
            notify(t("checklist.exportFailed"), "error");
          }
        });
      }

      if (mailboxPullBtn) {
        mailboxPullBtn.addEventListener("click", async () => {
          try {
            await fetchWithAuth("/ingest/email/pull", { method: "POST" });
            notify(t("email.importStarted"), "info");
          } catch (err) {
            notify(t("email.importFailed"), "error");
          }
        });
      }

      if (oauthGoogleBtn) {
        oauthGoogleBtn.addEventListener("click", async () => {
          try {
            const data = await fetchWithAuth("/oauth/google/url");
            if (data.url) {
              window.location.href = data.url;
            }
          } catch (err) {
            notify(t("oauth.gmailFailed"), "error");
          }
        });
      }

      if (oauthOutlookBtn) {
        oauthOutlookBtn.addEventListener("click", async () => {
          try {
            const data = await fetchWithAuth("/oauth/outlook/url");
            if (data.url) {
              window.location.href = data.url;
            }
          } catch (err) {
            notify(t("oauth.outlookFailed"), "error");
          }
        });
      }

      if (orgForm) {
        const buildOrgPayload = () => {
          const formData = new FormData(orgForm);
          return {
            name: formData.get("name"),
            plan: formData.get("plan") || undefined
          };
        };

        const saveOrg = async () => {
          const payload = buildOrgPayload();
          try {
            await fetchWithAuth("/org", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            setOrgInfoStatus(t("org.saved"), false);
          } catch (err) {
            setOrgInfoStatus(t("org.saveFailed"), true);
            throw err;
          }
        };

        orgForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (orgAutoTimer) {
            clearTimeout(orgAutoTimer);
            orgAutoTimer = null;
          }
          try {
            await saveOrg();
            notify(t("org.saved"), "info");
          } catch (err) {
            notify(t("org.saveFailed"), "error");
          }
        });

        const scheduleOrgSave = () => {
          if (!orgInfoLoaded) return;
          if (orgAutoTimer) {
            clearTimeout(orgAutoTimer);
          }
          setOrgInfoStatus(t("org.autoSaving"), false);
          orgAutoTimer = setTimeout(async () => {
            try {
              await saveOrg();
              notify(t("org.autoSaved"), "info");
            } catch (err) {
              notify(t("org.autoSaveFailed"), "error");
            }
          }, 800);
        };

        orgForm.addEventListener("input", scheduleOrgSave);
        orgForm.addEventListener("change", scheduleOrgSave);
      }

      if (orgReloadBtn) {
        orgReloadBtn.addEventListener("click", () => loadOrg());
      }

      if (inviteForm) {
        inviteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(inviteForm);
          const payload = {
            email: formData.get("email"),
            role: formData.get("role"),
            expires_hours: Number(formData.get("expires_hours") || 72)
          };
          try {
            await fetchWithAuth("/users/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            inviteForm.reset();
            loadInvites();
            setInviteStatus(t("invite.created"), false);
          } catch (err) {
            setInviteStatus(t("invite.createFailed"), true);
          }
        });
      }

      if (invitesReloadBtn) {
        invitesReloadBtn.addEventListener("click", () => loadInvites());
      }

      if (diagnosticsReloadBtn) {
        diagnosticsReloadBtn.addEventListener("click", () => loadDiagnostics(false));
      }

      if (diagnosticsDeepBtn) {
        diagnosticsDeepBtn.addEventListener("click", () => loadDiagnostics(true));
      }

      if (adminStatusRefreshBtn) {
        adminStatusRefreshBtn.addEventListener("click", () => loadDiagnostics(false));
      }

      if (superadminRefreshBtn) {
        superadminRefreshBtn.addEventListener("click", () => loadSuperadminOverview());
      }

      if (globalBackupBtn) {
        globalBackupBtn.addEventListener("click", async () => {
          try {
            await downloadFile("/tenants/export.json", "global_backup.json");
          } catch (err) {
            notify(t("backup.globalFailed"), "error");
          }
        });
      }

      if (globalRestoreInput) {
        globalRestoreInput.addEventListener("change", async () => {
          const file = globalRestoreInput.files[0];
          if (!file) return;
          const payload = new FormData();
          payload.append("file", file);
          try {
            await fetchWithAuth("/tenants/import", {
              method: "POST",
              body: payload
            });
            globalRestoreInput.value = "";
            loadSuperadminOverview();
            loadTenants();
            notify(t("backup.globalRestored"), "info");
          } catch (err) {
            notify(t("backup.globalRestoreFailed"), "error");
          }
        });
      }

      if (tenantImportInput) {
        tenantImportInput.addEventListener("change", async () => {
          const file = tenantImportInput.files[0];
          const tenantId = tenantImportInput.dataset.tenantId;
          if (!file || !tenantId) return;
          const payload = new FormData();
          payload.append("file", file);
          try {
            await fetchWithAuth(`/tenants/${tenantId}/import`, {
              method: "POST",
              body: payload
            });
            tenantImportInput.value = "";
            notify(t("tenant.importDone"), "info");
            loadTenants();
          } catch (err) {
            notify(t("tenant.importFailed"), "error");
          }
        });
      }

      if (tenantsReloadBtn) {
        tenantsReloadBtn.addEventListener("click", () => loadTenants());
      }

      if (tenantForm) {
        tenantForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(tenantForm);
          const payload = {
            name: formData.get("name"),
            code: formData.get("code"),
            plan: formData.get("plan") || "starter",
            admin_email: formData.get("admin_email"),
            admin_password: formData.get("admin_password")
          };
          try {
            await fetchWithAuth("/tenants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            tenantForm.reset();
            loadTenants();
            setTenantStatus("Tenant cree", false);
          } catch (err) {
            setTenantStatus("Creation tenant impossible", true);
          }
        });
      }

      if (userForm) {
        userForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(userForm);
          const payload = {
            email: formData.get("email"),
            password: formData.get("password"),
            role: formData.get("role")
          };
          try {
            await fetchWithAuth("/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            userForm.reset();
            loadUsers();
          } catch (err) {
            setStatus(t("user.createFailed"), true);
            notify(t("user.createFailed"), "error");
          }
        });
      }

      async function refreshAll() {
        const viewRole = getViewRole();
        const tasks = [loadKb(), loadConversations(), loadBranding()];
        if (viewRole === "admin" || viewRole === "superadmin") {
          tasks.push(loadUsers());
          tasks.push(loadOrgSettings());
          tasks.push(loadOrg());
          tasks.push(loadInvites());
          tasks.push(loadDiagnostics(false));
          tasks.push(loadChecklist());
          tasks.push(loadMetricsSummary());
          tasks.push(loadMiniDashboard());
          tasks.push(loadRecentTickets());
          tasks.push(loadAdminGallery());
          if (viewRole === "superadmin") {
            tasks.push(loadTenants());
            tasks.push(loadSuperadminOverview());
          }
        }
        if (viewRole === "admin" || viewRole === "agent" || viewRole === "superadmin") {
          tasks.push(loadTickets());
          tasks.push(loadNotifications());
        }
        if (viewRole === "user") {
          tasks.push(loadMyTickets());
          tasks.push(loadQuickIssues());
        }
        if (viewRole === "admin" || viewRole === "superadmin") {
          tasks.push(loadAudit());
          tasks.push(loadActivity());
        }
        await Promise.all(tasks);
      }

      if (getToken()) {
        setAuthState(true);
        safeLoadMe().then((ok) => {
          if (ok) {
            refreshAll();
          }
        });
      } else {
        setAuthState(false);
      }

      window.addEventListener("online", () => {
        setNetStatus(true);
        setBanner(null);
      });
      window.addEventListener("offline", () => {
        setNetStatus(false);
        setBanner(t("error.offline"), "info");
      });
      setNetStatus(navigator.onLine);

      function applyRoleVisibility() {
        const viewRole = getViewRole();
        const isAdmin = viewRole === "admin" || viewRole === "superadmin";
        const isStaff = viewRole === "admin" || viewRole === "agent" || viewRole === "superadmin";

        const setDisplay = (el, value) => {
          if (!el) return;
          el.style.display = value;
        };

        document.body.classList.toggle("user-mode", viewRole === "user");

        if (isStaff) {
          setDisplay(usersCard, isAdmin ? "block" : "none");
          setDisplay(kbForm, "grid");
          setDisplay(kbUploadForm, "grid");
          setDisplay(ticketsCard, "block");
          setDisplay(notificationsCard, "block");
          setDisplay(ticketForm, "grid");
          setDisplay(ticketUserFilter, isAdmin ? "inline-flex" : "none");
          setDisplay(ticketUserFilterBtn, isAdmin ? "inline-flex" : "none");
          setDisplay(adminToolsCard, isAdmin ? "block" : "none");
          setDisplay(myTicketsCard, "none");
          setDisplay(userGuideCard, "none");
          setDisplay(onboardingCard, isAdmin ? "block" : "none");
          setDisplay(metricsCard, isAdmin ? "block" : "none");
          setDisplay(miniDashboardCard, isAdmin ? "block" : "none");
          setDisplay(recentTicketsCard, isAdmin ? "block" : "none");
          setDisplay(kbCsvCard, isAdmin ? "block" : "none");
          setDisplay(kbManageCard, "block");
          setDisplay(orgSettingsCard, isAdmin ? "block" : "none");
          setDisplay(orgCard, isAdmin ? "block" : "none");
          setDisplay(invitesCard, isAdmin ? "block" : "none");
          setDisplay(diagnosticsCard, isAdmin ? "block" : "none");
          setDisplay(adminStatusCard, isAdmin ? "block" : "none");
          setDisplay(adminGuideCard, isAdmin ? "block" : "none");
          setDisplay(setupChecklistCard, isAdmin ? "block" : "none");
          setDisplay(apiConfigBtn, "inline-flex");
          setDisplay(presentationToggle, "inline-flex");
          setDisplay(simpleModeToggle, "none");
          setSimpleMode(false);
          setDisplay(adminCleanToggle, isAdmin ? "inline-flex" : "none");
          if (isAdmin) {
            setAdminClean(adminCleanEnabled);
          } else {
            setAdminClean(false);
          }
          setDisplay(beginnerModeToggle, "none");
          setBeginnerMode(false);
          setDisplay(tenantsCard, viewRole === "superadmin" ? "block" : "none");
          setDisplay(superadminCard, viewRole === "superadmin" ? "block" : "none");
          return;
        }

        if (viewRole === "user") {
          setDisplay(usersCard, "none");
          setDisplay(kbForm, "none");
          setDisplay(kbUploadForm, "none");
          setDisplay(kbManageCard, "none");
          setDisplay(ticketsCard, "none");
          setDisplay(notificationsCard, "none");
          setDisplay(adminToolsCard, "none");
          setDisplay(orgSettingsCard, "none");
          setDisplay(orgCard, "none");
          setDisplay(invitesCard, "none");
          setDisplay(diagnosticsCard, "none");
          setDisplay(adminStatusCard, "none");
          setDisplay(adminGuideCard, "none");
          setDisplay(setupChecklistCard, "none");
          setDisplay(metricsCard, "none");
          setDisplay(miniDashboardCard, "none");
          setDisplay(recentTicketsCard, "none");;
          setDisplay(kbCsvCard, "none");
          setDisplay(tenantsCard, "none");
          setDisplay(superadminCard, "none");
          setDisplay(myTicketsCard, "block");
          setDisplay(userGuideCard, "block");
          setDisplay(onboardingCard, "none");
          setDisplay(apiConfigBtn, "none");
          setDisplay(adminCleanToggle, "none");
          setAdminClean(false);;
          setDisplay(beginnerModeToggle, "inline-flex");
          setBeginnerMode(beginnerModeEnabled);
          setBeginnerStep(t("beginner.step1"));
          setNextStep({
            text: t("next.text"),
            showProcedure: false,
            showKb: false,
            showTicket: false
          });
          document.body.classList.add("show-chat-input");
          setUserTab("assistant");
          if (apiConfigPanel) {
            apiConfigPanel.classList.add("hidden");
          }
          setDisplay(presentationToggle, "none");
          if (userOnlyMode) {
            setDisplay(simpleModeToggle, "none");
            setSimpleMode(true);
          } else {
            setDisplay(simpleModeToggle, "inline-flex");
            setSimpleMode(simpleModeEnabled);
          }
          return;
        }

        document.body.classList.remove("user-mode");
        setDisplay(simpleModeToggle, "none");
        setSimpleMode(false);
        setDisplay(adminCleanToggle, "none");
        setAdminClean(false);;
        setDisplay(beginnerModeToggle, "none");
        setBeginnerMode(false);
        setDisplay(usersCard, "none");
        setDisplay(kbForm, "none");
        setDisplay(kbUploadForm, "none");
        setDisplay(ticketsCard, "none");
        setDisplay(notificationsCard, "none");
        setDisplay(adminToolsCard, "none");
        setDisplay(myTicketsCard, "none");
        setDisplay(orgSettingsCard, "none");
        setDisplay(orgCard, "none");
        setDisplay(invitesCard, "none");
        setDisplay(diagnosticsCard, "none");
        setDisplay(adminStatusCard, "none");
        setDisplay(adminGuideCard, "none");
        setDisplay(setupChecklistCard, "none");
        setDisplay(userGuideCard, "none");
        setDisplay(metricsCard, "none");
        setDisplay(miniDashboardCard, "none");
        setDisplay(recentTicketsCard, "none");;
        setDisplay(kbCsvCard, "none");
        setDisplay(tenantsCard, "none");
        setDisplay(superadminCard, "none");
      }










