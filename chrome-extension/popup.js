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
    skills: (maxSkills > 0 ? (raw.skills ?? []).slice(0, maxSkills) : (raw.skills ?? [])).map((name) => ({
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

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    function onUpdated(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function runInTab(tabId, func) {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func });
  return results?.[0]?.result;
}

async function fetchContactInfo(profileUrl) {
  const baseUrl = profileUrl.replace(/\/$/, "").replace(/(\/in\/[^/]+).*/, "$1");
  const contactUrl = baseUrl + "/overlay/contact-info/";
  let tab;
  try {
    tab = await chrome.tabs.create({ url: contactUrl, active: false });
    await waitForTabComplete(tab.id);
    await new Promise((r) => setTimeout(r, 3000));
    const result = await runInTab(tab.id, () => {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Email: prefer explicit mailto link, then scan all contact sections for email-like text
      const emailLink = document.querySelector('a[href^="mailto:"]');
      let email = emailLink ? emailLink.href.replace("mailto:", "").trim() : "";
      if (!email) {
        for (const section of document.querySelectorAll(".pv-contact-info__contact-type")) {
          for (const span of section.querySelectorAll("span")) {
            const t = span.textContent.trim();
            if (EMAIL_RE.test(t)) { email = t; break; }
          }
          if (email) break;
        }
      }

      // Phone: prefer tel: link, then text inside .pv-contact-info__contact-type > Phone header
      const phoneLink = document.querySelector('a[href^="tel:"]');
      let phone = phoneLink ? phoneLink.href.replace("tel:", "").trim() : "";
      if (!phone) {
        for (const section of document.querySelectorAll(".pv-contact-info__contact-type")) {
          const header = section.querySelector(".pv-contact-info__header");
          if (header?.textContent?.trim().toLowerCase() === "phone") {
            phone = section.querySelector("span")?.textContent?.trim() ?? "";
            break;
          }
        }
      }

      // Websites: find the "Websites" section and classify links as github vs generic website
      let website = "";
      let github = "";
      for (const section of document.querySelectorAll(".pv-contact-info__contact-type")) {
        const header = section.querySelector(".pv-contact-info__header");
        if (header?.textContent?.trim().toLowerCase() !== "websites") continue;
        for (const a of section.querySelectorAll("a.pv-contact-info__contact-link")) {
          const href = a.href.trim();
          if (!href) continue;
          if (/github\.com/i.test(href)) {
            if (!github) github = href;
          } else {
            if (!website) website = href;
          }
        }
      }

      return { email, phone, website, github };
    });
    return result ?? {};
  } catch {
    return {};
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function fetchAbout(profileUrl) {
  const aboutUrl = profileUrl.replace(/\/$/, "").replace(/(\/in\/[^/]+).*/, "$1") + "/details/summary/";
  let tab;
  try {
    tab = await chrome.tabs.create({ url: aboutUrl, active: false });
    await waitForTabComplete(tab.id);
    await new Promise((r) => setTimeout(r, 2000));
    const text = await runInTab(tab.id, () => {
      // The summary detail page renders the full about text
      const section = document.querySelector("section:has(#summary), main section");
      if (!section) return "";
      const spans = section.querySelectorAll("span[aria-hidden='true']");
      return Array.from(spans)
        .map((s) => s.textContent.trim())
        .filter((t) => t.length > 30)
        .join(" ")
        .slice(0, 10000);
    });
    return text ?? "";
  } catch {
    return "";
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function fetchAllSkills(profileUrl) {
  const skillsUrl = profileUrl.replace(/\/$/, "").replace(/(\/in\/[^/]+).*/, "$1") + "/details/skills/";
  let tab;
  try {
    tab = await chrome.tabs.create({ url: skillsUrl, active: false });
    await waitForTabComplete(tab.id);
    await new Promise((r) => setTimeout(r, 2000));
    const skills = await runInTab(tab.id, () => {
      const getText = (el) => el?.textContent?.trim() ?? "";
      const items = document.querySelectorAll(
        "main ul > li.artdeco-list__item, main ul > li.pvs-list__item--line-separated"
      );
      return Array.from(items)
        .map((li) => {
          const el =
            li.querySelector(".mr1.hoverable-link-text.t-bold span[aria-hidden='true']") ||
            li.querySelector(".mr1.t-bold span[aria-hidden='true']") ||
            li.querySelector("span[aria-hidden='true']");
          const name = getText(el);
          if (!name) return null;

          // Extract endorsement count from any span like "12 endorsements"
          let endorsements = 0;
          for (const span of li.querySelectorAll("span")) {
            const m = span.textContent.trim().match(/^(\d+)\s+endorsement/i);
            if (m) { endorsements = parseInt(m[1], 10); break; }
          }
          return { name, endorsements };
        })
        .filter(Boolean);
    });
    return skills ?? [];
  } catch {
    return [];
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
  }
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

  // Fetch full skills, contact info, and about (if needed) in parallel
  setStatus("Fetching skills, contact info & about...");
  const [allSkills, contactInfo, aboutText] = await Promise.all([
    fetchAllSkills(raw.profileUrl),
    fetchContactInfo(raw.profileUrl),
    raw.about ? Promise.resolve("") : fetchAbout(raw.profileUrl)
  ]);
  if (allSkills.length > (raw.skills ?? []).length) {
    const order = getSkillsOrder();
    const sorted = order === "endorsed"
      ? [...allSkills].sort((a, b) => b.endorsements - a.endorsements)
      : allSkills;
    // Deduplicate by name (LinkedIn skills page lists items across multiple uls)
    const seen = new Set();
    raw.skills = sorted.map((s) => s.name).filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (contactInfo.email && !raw.email) raw.email = contactInfo.email;
  if (contactInfo.phone && !raw.phone) raw.phone = contactInfo.phone;
  if (contactInfo.website) raw.website = contactInfo.website;
  if (contactInfo.github) raw.github = contactInfo.github;
  if (aboutText && !raw.about) raw.about = aboutText;

  const template = templateSelect.value;
  const pageSize = getSelectedPageSize();
  const maxSkills = getMaxSkills();
  const resumeState = mapLinkedInToResumeState(raw, { template, pageSize, maxSkills });

  await chrome.storage.session.set({ resumeState });

  chrome.tabs.create({ url: chrome.runtime.getURL("renderer/renderer.html") });
});

init();
