/**
 * Popup script — orchestrates the LinkedIn → PDF flow.
 *
 * 1. On load: check if the active tab is a LinkedIn profile page.
 * 2. On "Generate PDF": ask content.js to extract profile data,
 *    map it to the free-resume state schema, store it in session
 *    storage, and open the renderer tab.
 */

const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const templateSelect = document.getElementById("template-select");
const maxSkillsInput = document.getElementById("max-skills");

function getMaxSkills() {
  const val = parseInt(maxSkillsInput.value, 10);
  return isNaN(val) || val < 0 ? 10 : val;
}

function getSkillsOrder() {
  return document.querySelector('input[name="skills-order"]:checked')?.value ?? "linkedin";
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function isLinkedInProfileUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "www.linkedin.com" && u.pathname.startsWith("/in/");
  } catch {
    return false;
  }
}

function getSelectedPageSize() {
  const checked = document.querySelector('input[name="page-size"]:checked');
  return checked?.value ?? "a4";
}

function mapLinkedInToResumeState(raw, { template, pageSize, maxSkills }) {
  return {
    uiLang: "en",
    cvLang: "en",
    template,
    pageSize,
    theme: "light",
    showSkills: raw.skills.length > 0,
    showSkillLevels: false,
    showLanguageLevels: false,
    nameFontSize: 100,
    alpineLocationInHeader: false,
    collapsedSections: {},
    profile: {
      name: raw.name ?? "",
      title: raw.headline ?? "",
      email: raw.email ?? "",
      phone: raw.phone ?? "",
      location: raw.location ?? "",
      website: raw.website ?? "",
      linkedin: raw.profileUrl ?? "",
      github: raw.github ?? ""
    },
    summary: (raw.about ?? "").slice(0, 10000),
    experience: (raw.experience ?? []).map((exp) => ({
      role: exp.role ?? "",
      company: exp.company ?? "",
      location: exp.location ?? "",
      start: exp.start ?? "",
      end: exp.end ?? "",
      bullets: exp.bullets ?? "",
      isCollapsed: false
    })),
    education: (raw.education ?? []).map((edu) => ({
      degree: edu.degree ?? "",
      school: edu.school ?? "",
      location: "",
      start: edu.start ?? "",
      end: edu.end ?? "",
      isCollapsed: false
    })),
    skills: (raw.skills ?? []).map((name) => ({
      name,
      level: "intermediate",
      showLevel: false
    })),
    languages: (raw.languages ?? []).map((lang) => ({
      name: lang.name,
      level: lang.level,
      showLevel: false
    }))
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getActiveTab();

  if (!isLinkedInProfileUrl(tab?.url ?? "")) {
    setStatus("Visit a LinkedIn profile page to use this extension.", "warning");
    generateBtn.disabled = true;
    return;
  }

  setStatus("Ready — pick a template and generate.", "success");
  generateBtn.disabled = false;
}

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  setStatus("Extracting profile data...");

  const tab = await getActiveTab();

  let raw;
  try {
    raw = await chrome.tabs.sendMessage(tab.id, { action: "extract" });
  } catch {
    setStatus(
      "Could not read the page. Try scrolling the profile fully into view first, then try again.",
      "error"
    );
    generateBtn.disabled = false;
    return;
  }

  if (!raw?.name && !raw?.headline) {
    setStatus(
      "Profile data appears empty. Scroll the LinkedIn page to load all sections, then try again.",
      "warning"
    );
    generateBtn.disabled = false;
    return;
  }

  const template = templateSelect.value;
  const pageSize = getSelectedPageSize();
  const resumeState = mapLinkedInToResumeState(raw, { template, pageSize });

  await chrome.storage.session.set({ resumeState });

  chrome.tabs.create({ url: chrome.runtime.getURL("renderer/renderer.html") });
});

init();
