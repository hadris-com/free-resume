import {
  fieldLimits,
  rootKeys,
  profileKeys,
  experienceKeys,
  educationKeys,
  skillKeys,
  skillLevels,
  templateNames,
  pageSizes,
  themes,
  supportedLanguages,
} from "./schema.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: Set<string>): boolean {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function unknownKeys(value: Record<string, unknown>, allowedKeys: Set<string>): string[] {
  return Object.keys(value).filter((key) => !allowedKeys.has(key));
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === "string" && value.length <= maxLength;
}

function isBooleanLike(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

function isSkillLevelLike(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === "string" && (skillLevels as readonly string[]).includes(value);
}

function toInputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeSkillLevel(level: unknown): string {
  if (typeof level === "string" && (skillLevels as readonly string[]).includes(level)) {
    return level;
  }
  return "intermediate";
}

function resolvePageSize(pageSize: unknown): string {
  if (typeof pageSize === "string" && (pageSizes as readonly string[]).includes(pageSize)) {
    return pageSize;
  }
  return "a4";
}

function isSupportedLanguage(lang: unknown): boolean {
  return typeof lang === "string" && (supportedLanguages as readonly string[]).includes(lang);
}

export function validateResumeDetailed(rawState: unknown): string[] {
  const errors: string[] = [];

  if (!isPlainObject(rawState)) {
    errors.push("Resume must be a plain JSON object");
    return errors;
  }

  const extraRootKeys = unknownKeys(rawState, rootKeys);
  if (extraRootKeys.length > 0) {
    errors.push(`Unknown root keys: ${extraRootKeys.join(", ")}`);
  }

  if (!isOptionalString(rawState.lang, fieldLimits.lang)) {
    errors.push(`'lang' must be a string with max length ${fieldLimits.lang}`);
  } else if (typeof rawState.lang === "string" && !isSupportedLanguage(rawState.lang)) {
    errors.push(`'lang' must be one of: ${supportedLanguages.join(", ")}`);
  }

  if (!isOptionalString(rawState.uiLang, fieldLimits.lang)) {
    errors.push(`'uiLang' must be a string with max length ${fieldLimits.lang}`);
  } else if (typeof rawState.uiLang === "string" && !isSupportedLanguage(rawState.uiLang)) {
    errors.push(`'uiLang' must be one of: ${supportedLanguages.join(", ")}`);
  }

  if (!isOptionalString(rawState.cvLang, fieldLimits.lang)) {
    errors.push(`'cvLang' must be a string with max length ${fieldLimits.lang}`);
  } else if (typeof rawState.cvLang === "string" && !isSupportedLanguage(rawState.cvLang)) {
    errors.push(`'cvLang' must be one of: ${supportedLanguages.join(", ")}`);
  }

  if (!isOptionalString(rawState.template, fieldLimits.template)) {
    errors.push(`'template' must be a string with max length ${fieldLimits.template}`);
  } else if (typeof rawState.template === "string" && !(templateNames as readonly string[]).includes(rawState.template)) {
    errors.push(`'template' must be one of: ${templateNames.join(", ")}`);
  }

  if (!isOptionalString(rawState.pageSize, fieldLimits.pageSize)) {
    errors.push(`'pageSize' must be a string with max length ${fieldLimits.pageSize}`);
  } else if (typeof rawState.pageSize === "string" && !(pageSizes as readonly string[]).includes(rawState.pageSize)) {
    errors.push(`'pageSize' must be one of: ${pageSizes.join(", ")}`);
  }

  if (!isOptionalString(rawState.theme, fieldLimits.theme)) {
    errors.push(`'theme' must be a string with max length ${fieldLimits.theme}`);
  } else if (typeof rawState.theme === "string" && !(themes as readonly string[]).includes(rawState.theme)) {
    errors.push(`'theme' must be one of: ${themes.join(", ")}`);
  }

  if (!isBooleanLike(rawState.showSkills)) {
    errors.push("'showSkills' must be a boolean");
  }
  if (!isBooleanLike(rawState.showSkillLevels)) {
    errors.push("'showSkillLevels' must be a boolean");
  }
  if (!isBooleanLike(rawState.showLanguageLevels)) {
    errors.push("'showLanguageLevels' must be a boolean");
  }
  if (!isBooleanLike(rawState.alpineLocationInHeader)) {
    errors.push("'alpineLocationInHeader' must be a boolean");
  }

  if (!isOptionalString(rawState.summary, fieldLimits.summary)) {
    errors.push(`'summary' must be a string with max length ${fieldLimits.summary}`);
  }

  if (rawState.nameFontSize !== undefined && rawState.nameFontSize !== null) {
    const parsed = Number(rawState.nameFontSize);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
      errors.push("'nameFontSize' must be a number between 1 and 1000");
    }
  }

  // Profile validation
  if (rawState.profile !== undefined && rawState.profile !== null) {
    if (!isPlainObject(rawState.profile)) {
      errors.push("'profile' must be a plain object");
    } else {
      const extraProfileKeys = unknownKeys(rawState.profile, profileKeys);
      if (extraProfileKeys.length > 0) {
        errors.push(`Unknown profile keys: ${extraProfileKeys.join(", ")}`);
      }
      for (const key of profileKeys) {
        if (!isOptionalString(rawState.profile[key], fieldLimits.profile)) {
          errors.push(`'profile.${key}' must be a string with max length ${fieldLimits.profile}`);
        }
      }
    }
  }

  // Experience validation
  if (rawState.experience !== undefined && rawState.experience !== null) {
    if (!Array.isArray(rawState.experience)) {
      errors.push("'experience' must be an array");
    } else {
      if (rawState.experience.length > fieldLimits.listLength) {
        errors.push(`'experience' has ${rawState.experience.length} items, max is ${fieldLimits.listLength}`);
      }
      rawState.experience.forEach((item: unknown, i: number) => {
        if (!isPlainObject(item)) {
          errors.push(`experience[${i}] must be a plain object`);
          return;
        }
        const extra = unknownKeys(item, experienceKeys);
        if (extra.length > 0) errors.push(`experience[${i}] has unknown keys: ${extra.join(", ")}`);
        if (!isOptionalString(item.role, fieldLimits.role)) errors.push(`experience[${i}].role exceeds max length ${fieldLimits.role}`);
        if (!isOptionalString(item.company, fieldLimits.company)) errors.push(`experience[${i}].company exceeds max length ${fieldLimits.company}`);
        if (!isOptionalString(item.location, fieldLimits.location)) errors.push(`experience[${i}].location exceeds max length ${fieldLimits.location}`);
        if (!isOptionalString(item.start, fieldLimits.period)) errors.push(`experience[${i}].start exceeds max length ${fieldLimits.period}`);
        if (!isOptionalString(item.end, fieldLimits.period)) errors.push(`experience[${i}].end exceeds max length ${fieldLimits.period}`);
        if (!isOptionalString(item.bullets, fieldLimits.bullets)) errors.push(`experience[${i}].bullets exceeds max length ${fieldLimits.bullets}`);
        if (!isBooleanLike(item.isCollapsed)) errors.push(`experience[${i}].isCollapsed must be a boolean`);
      });
    }
  }

  // Education validation
  if (rawState.education !== undefined && rawState.education !== null) {
    if (!Array.isArray(rawState.education)) {
      errors.push("'education' must be an array");
    } else {
      if (rawState.education.length > fieldLimits.listLength) {
        errors.push(`'education' has ${rawState.education.length} items, max is ${fieldLimits.listLength}`);
      }
      rawState.education.forEach((item: unknown, i: number) => {
        if (!isPlainObject(item)) {
          errors.push(`education[${i}] must be a plain object`);
          return;
        }
        const extra = unknownKeys(item, educationKeys);
        if (extra.length > 0) errors.push(`education[${i}] has unknown keys: ${extra.join(", ")}`);
        if (!isOptionalString(item.degree, fieldLimits.degree)) errors.push(`education[${i}].degree exceeds max length ${fieldLimits.degree}`);
        if (!isOptionalString(item.school, fieldLimits.school)) errors.push(`education[${i}].school exceeds max length ${fieldLimits.school}`);
        if (!isOptionalString(item.location, fieldLimits.location)) errors.push(`education[${i}].location exceeds max length ${fieldLimits.location}`);
        if (!isOptionalString(item.start, fieldLimits.period)) errors.push(`education[${i}].start exceeds max length ${fieldLimits.period}`);
        if (!isOptionalString(item.end, fieldLimits.period)) errors.push(`education[${i}].end exceeds max length ${fieldLimits.period}`);
        if (!isBooleanLike(item.isCollapsed)) errors.push(`education[${i}].isCollapsed must be a boolean`);
      });
    }
  }

  // Skills validation
  if (rawState.skills !== undefined && rawState.skills !== null) {
    if (!Array.isArray(rawState.skills)) {
      errors.push("'skills' must be an array");
    } else {
      if (rawState.skills.length > fieldLimits.listLength) {
        errors.push(`'skills' has ${rawState.skills.length} items, max is ${fieldLimits.listLength}`);
      }
      rawState.skills.forEach((item: unknown, i: number) => {
        if (!isPlainObject(item)) {
          errors.push(`skills[${i}] must be a plain object`);
          return;
        }
        const extra = unknownKeys(item, skillKeys);
        if (extra.length > 0) errors.push(`skills[${i}] has unknown keys: ${extra.join(", ")}`);
        if (!isOptionalString(item.name, fieldLimits.skillName)) errors.push(`skills[${i}].name exceeds max length ${fieldLimits.skillName}`);
        if (!isSkillLevelLike(item.level)) errors.push(`skills[${i}].level must be one of: ${skillLevels.join(", ")}`);
        if (!isBooleanLike(item.showLevel)) errors.push(`skills[${i}].showLevel must be a boolean`);
      });
    }
  }

  // Languages validation
  if (rawState.languages !== undefined && rawState.languages !== null) {
    if (!Array.isArray(rawState.languages)) {
      errors.push("'languages' must be an array");
    } else {
      if (rawState.languages.length > fieldLimits.listLength) {
        errors.push(`'languages' has ${rawState.languages.length} items, max is ${fieldLimits.listLength}`);
      }
      rawState.languages.forEach((item: unknown, i: number) => {
        if (!isPlainObject(item)) {
          errors.push(`languages[${i}] must be a plain object`);
          return;
        }
        const extra = unknownKeys(item, skillKeys);
        if (extra.length > 0) errors.push(`languages[${i}] has unknown keys: ${extra.join(", ")}`);
        if (!isOptionalString(item.name, fieldLimits.skillName)) errors.push(`languages[${i}].name exceeds max length ${fieldLimits.skillName}`);
        if (!isSkillLevelLike(item.level)) errors.push(`languages[${i}].level must be one of: ${skillLevels.join(", ")}`);
        if (!isBooleanLike(item.showLevel)) errors.push(`languages[${i}].showLevel must be a boolean`);
      });
    }
  }

  return errors;
}

export function sanitizeResumeState(rawState: unknown): Record<string, unknown> {
  const source = rawState && typeof rawState === "object" ? rawState as Record<string, unknown> : {};
  const profileSource =
    source.profile && typeof source.profile === "object"
      ? (source.profile as Record<string, unknown>)
      : {};

  const fallbackLang = isSupportedLanguage(source.lang) ? (source.lang as string) : "en";
  const uiLang = isSupportedLanguage(source.uiLang) ? (source.uiLang as string) : fallbackLang;
  const cvLang = isSupportedLanguage(source.cvLang) ? (source.cvLang as string) : fallbackLang;

  const legacyShowLevels = Array.isArray(source.skills)
    ? source.skills.some((item: unknown) => {
        if (item && typeof item === "object") {
          return toBoolean((item as Record<string, unknown>).showLevel, false);
        }
        return false;
      })
    : false;
  const showSkillLevels = toBoolean(source.showSkillLevels, legacyShowLevels);

  const templateValue =
    typeof source.template === "string" && (templateNames as readonly string[]).includes(source.template)
      ? source.template
      : "alpine";

  return {
    lang: uiLang,
    uiLang,
    cvLang,
    template: templateValue,
    pageSize: resolvePageSize(source.pageSize),
    theme: source.theme === "dark" ? "dark" : "light",
    showSkills: Boolean(source.showSkills),
    showSkillLevels,
    showLanguageLevels: toBoolean(source.showLanguageLevels, false),
    nameFontSize: Math.max(60, Math.min(140, Number(source.nameFontSize) || 100)),
    alpineLocationInHeader: toBoolean(source.alpineLocationInHeader, false),
    profile: {
      name: toInputText(profileSource.name),
      title: toInputText(profileSource.title),
      email: toInputText(profileSource.email),
      phone: toInputText(profileSource.phone),
      location: toInputText(profileSource.location),
      website: toInputText(profileSource.website),
      linkedin: toInputText(profileSource.linkedin),
      github: toInputText(profileSource.github),
    },
    summary: toInputText(source.summary),
    experience: Array.isArray(source.experience)
      ? source.experience.map((item: unknown) => {
          const src = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            role: toInputText(src.role),
            company: toInputText(src.company),
            location: toInputText(src.location),
            start: toInputText(src.start),
            end: toInputText(src.end),
            bullets: toInputText(src.bullets),
            isCollapsed: toBoolean(src.isCollapsed, false),
          };
        })
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((item: unknown) => {
          const src = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            degree: toInputText(src.degree),
            school: toInputText(src.school),
            location: toInputText(src.location),
            start: toInputText(src.start),
            end: toInputText(src.end),
            isCollapsed: toBoolean(src.isCollapsed, false),
          };
        })
      : [],
    skills: Array.isArray(source.skills)
      ? source.skills.map((item: unknown) => {
          const src =
            item && typeof item === "object" ? (item as Record<string, unknown>) : { name: item };
          return {
            name: toInputText(src.name),
            level: normalizeSkillLevel(src.level),
            showLevel: toBoolean(src.showLevel, false),
          };
        })
      : [],
    languages: Array.isArray(source.languages)
      ? source.languages.map((item: unknown) => {
          const src =
            item && typeof item === "object" ? (item as Record<string, unknown>) : { name: item };
          return {
            name: toInputText(src.name),
            level: normalizeSkillLevel(src.level),
            showLevel: toBoolean(src.showLevel, false),
          };
        })
      : [],
  };
}
