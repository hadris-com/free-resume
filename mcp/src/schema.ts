export const skillLevels = ["beginner", "intermediate", "advanced", "expert"] as const;
export type SkillLevel = (typeof skillLevels)[number];

export const templateNames = [
  "alpine",
  "aurora",
  "atelier",
  "noir",
  "fjord",
  "solstice",
  "bastion",
  "slate",
  "kernel",
  "berlin",
] as const;
export type TemplateName = (typeof templateNames)[number];

export const pageSizes = ["a4", "letter"] as const;
export type PageSize = (typeof pageSizes)[number];

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const supportedLanguages = ["en", "es", "de"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const fieldLimits = {
  lang: 8,
  template: 32,
  pageSize: 16,
  theme: 16,
  profile: 256,
  summary: 10000,
  role: 160,
  company: 160,
  location: 160,
  period: 64,
  bullets: 16000,
  degree: 180,
  school: 180,
  skillName: 80,
  listLength: 100,
} as const;

export const rootKeys = new Set([
  "lang",
  "uiLang",
  "cvLang",
  "template",
  "pageSize",
  "theme",
  "showSkills",
  "showSkillLevels",
  "showLanguageLevels",
  "nameFontSize",
  "alpineLocationInHeader",
  "profile",
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
]);

export const profileKeys = new Set([
  "name",
  "title",
  "email",
  "phone",
  "location",
  "website",
  "linkedin",
  "github",
]);

export const experienceKeys = new Set([
  "role",
  "company",
  "location",
  "start",
  "end",
  "bullets",
  "isCollapsed",
]);

export const educationKeys = new Set([
  "degree",
  "school",
  "location",
  "start",
  "end",
  "isCollapsed",
]);

export const skillKeys = new Set(["name", "level", "showLevel"]);

export const resumeJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Free Resume JSON Schema",
  description:
    "Schema for the Free Resume builder export format. The top-level wrapper has app, schemaVersion, exportedAt, and data fields. The 'data' field contains the actual resume state described below.",
  type: "object" as const,
  properties: {
    app: {
      type: "string" as const,
      const: "free-resume",
      description: "Must be 'free-resume'",
    },
    schemaVersion: {
      type: "number" as const,
      const: 2,
      description: "Schema version, currently 2",
    },
    exportedAt: {
      type: "string" as const,
      format: "date-time",
      description: "ISO 8601 timestamp of when the file was exported",
    },
    data: {
      type: "object" as const,
      description: "The resume state",
      properties: {
        lang: {
          type: "string" as const,
          enum: [...supportedLanguages],
          description:
            "Legacy language field (use uiLang/cvLang instead). Max length: " +
            fieldLimits.lang,
        },
        uiLang: {
          type: "string" as const,
          enum: [...supportedLanguages],
          description:
            "UI language for section headings and labels. Max length: " +
            fieldLimits.lang,
        },
        cvLang: {
          type: "string" as const,
          enum: [...supportedLanguages],
          description:
            "CV content language for section titles in the rendered resume. Max length: " +
            fieldLimits.lang,
        },
        template: {
          type: "string" as const,
          enum: [...templateNames],
          description:
            "Visual template. Max length: " + fieldLimits.template,
        },
        pageSize: {
          type: "string" as const,
          enum: [...pageSizes],
          description: "Page size. Max length: " + fieldLimits.pageSize,
        },
        theme: {
          type: "string" as const,
          enum: [...themes],
          description: "Color theme. Max length: " + fieldLimits.theme,
        },
        showSkills: {
          type: "boolean" as const,
          description: "Whether to show the skills section",
        },
        showSkillLevels: {
          type: "boolean" as const,
          description:
            "Whether to show skill proficiency levels (beginner/intermediate/advanced/expert)",
        },
        showLanguageLevels: {
          type: "boolean" as const,
          description: "Whether to show language proficiency levels",
        },
        nameFontSize: {
          type: "number" as const,
          minimum: 60,
          maximum: 140,
          description:
            "Name font size as percentage (60-140). Default is 100.",
        },
        alpineLocationInHeader: {
          type: "boolean" as const,
          description:
            "Alpine template option: show location in the header instead of contact section",
        },
        profile: {
          type: "object" as const,
          description: "Personal/contact information",
          properties: {
            name: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "Full name",
            },
            title: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "Professional title/headline",
            },
            email: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "Email address",
            },
            phone: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "Phone number",
            },
            location: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "City, Country",
            },
            website: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description: "Personal website URL",
            },
            linkedin: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description:
                "LinkedIn profile URL or username (e.g. linkedin.com/in/username)",
            },
            github: {
              type: "string" as const,
              maxLength: fieldLimits.profile,
              description:
                "GitHub profile URL or username (e.g. github.com/username)",
            },
          },
          additionalProperties: false,
        },
        summary: {
          type: "string" as const,
          maxLength: fieldLimits.summary,
          description:
            "Professional summary/profile text. Plain text, no HTML.",
        },
        experience: {
          type: "array" as const,
          maxItems: fieldLimits.listLength,
          description: "Work experience entries (max " + fieldLimits.listLength + " items)",
          items: {
            type: "object" as const,
            properties: {
              role: {
                type: "string" as const,
                maxLength: fieldLimits.role,
                description: "Job title/role",
              },
              company: {
                type: "string" as const,
                maxLength: fieldLimits.company,
                description: "Company/organization name",
              },
              location: {
                type: "string" as const,
                maxLength: fieldLimits.location,
                description: "Job location",
              },
              start: {
                type: "string" as const,
                maxLength: fieldLimits.period,
                description: "Start date (e.g. 'Jan 2022')",
              },
              end: {
                type: "string" as const,
                maxLength: fieldLimits.period,
                description:
                  "End date (e.g. 'Dec 2023' or 'Present')",
              },
              bullets: {
                type: "string" as const,
                maxLength: fieldLimits.bullets,
                description:
                  "Achievement bullets separated by newlines (\\n). Each line becomes a bullet point.",
              },
              isCollapsed: {
                type: "boolean" as const,
                description:
                  "Editor UI state - whether this entry is collapsed in the editor. Set to false.",
              },
            },
            additionalProperties: false,
          },
        },
        education: {
          type: "array" as const,
          maxItems: fieldLimits.listLength,
          description: "Education entries (max " + fieldLimits.listLength + " items)",
          items: {
            type: "object" as const,
            properties: {
              degree: {
                type: "string" as const,
                maxLength: fieldLimits.degree,
                description:
                  "Degree or qualification (e.g. 'B.Sc. Computer Science')",
              },
              school: {
                type: "string" as const,
                maxLength: fieldLimits.school,
                description: "School/university name",
              },
              location: {
                type: "string" as const,
                maxLength: fieldLimits.location,
                description: "School location",
              },
              start: {
                type: "string" as const,
                maxLength: fieldLimits.period,
                description: "Start date/year",
              },
              end: {
                type: "string" as const,
                maxLength: fieldLimits.period,
                description: "End date/year",
              },
              isCollapsed: {
                type: "boolean" as const,
                description:
                  "Editor UI state - whether this entry is collapsed. Set to false.",
              },
            },
            additionalProperties: false,
          },
        },
        skills: {
          type: "array" as const,
          maxItems: fieldLimits.listLength,
          description: "Skills list (max " + fieldLimits.listLength + " items)",
          items: {
            type: "object" as const,
            properties: {
              name: {
                type: "string" as const,
                maxLength: fieldLimits.skillName,
                description: "Skill name",
              },
              level: {
                type: "string" as const,
                enum: [...skillLevels],
                description: "Proficiency level",
              },
              showLevel: {
                type: "boolean" as const,
                description:
                  "Per-skill level visibility toggle (legacy). Set to false.",
              },
            },
            additionalProperties: false,
          },
        },
        languages: {
          type: "array" as const,
          maxItems: fieldLimits.listLength,
          description:
            "Languages list (max " + fieldLimits.listLength + " items). Same structure as skills.",
          items: {
            type: "object" as const,
            properties: {
              name: {
                type: "string" as const,
                maxLength: fieldLimits.skillName,
                description: "Language name",
              },
              level: {
                type: "string" as const,
                enum: [...skillLevels],
                description: "Proficiency level",
              },
              showLevel: {
                type: "boolean" as const,
                description:
                  "Per-language level visibility toggle (legacy). Set to false.",
              },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  required: ["app", "schemaVersion", "data"],
  additionalProperties: false,
};
