#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resumeJsonSchema, templateNames, pageSizes, supportedLanguages, skillLevels } from "./schema.js";
import { sampleResume } from "./sample-data.js";
import { validateResumeDetailed, sanitizeResumeState } from "./validation.js";

const server = new McpServer({
  name: "free-resume",
  version: "1.0.0",
});

// --- Resources ---

server.resource("schema", "free-resume://schema", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(resumeJsonSchema, null, 2),
    },
  ],
}));

server.resource("example", "free-resume://example", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(sampleResume, null, 2),
    },
  ],
}));

// --- Prompts ---

server.prompt(
  "generate-resume",
  {
    career_info: z.string().optional().describe("Career information, job history, skills, or any raw text about the person's background"),
    language: z.enum(["en", "es", "de"]).optional().describe("Language for the CV content (en, es, de). Defaults to en."),
    template: z.string().optional().describe("Template name: " + templateNames.join(", ")),
  },
  ({ career_info, language, template }) => {
    const lang = language || "en";
    const tmpl = template && (templateNames as readonly string[]).includes(template) ? template : "alpine";

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate a complete Free Resume JSON file based on the following information.

## Output Format
Return ONLY a valid JSON object with this exact top-level structure:
\`\`\`json
{
  "app": "free-resume",
  "schemaVersion": 2,
  "exportedAt": "<ISO 8601 timestamp>",
  "data": { ... }
}
\`\`\`

## Settings to use
- uiLang: "${lang}"
- cvLang: "${lang}"
- template: "${tmpl}"
- pageSize: "a4"
- theme: "light"
- showSkills: true
- showSkillLevels: false
- showLanguageLevels: false
- nameFontSize: 100
- alpineLocationInHeader: false

## Field constraints
- profile fields: max 256 chars each (name, title, email, phone, location, website, linkedin, github)
- summary: max 10000 chars, plain text
- experience: array of objects with role (max 160), company (max 160), location (max 160), start (max 64), end (max 64), bullets (max 16000, newline-separated), isCollapsed (always false)
- education: array of objects with degree (max 180), school (max 180), location (max 160), start (max 64), end (max 64), isCollapsed (always false)
- skills: array of objects with name (max 80), level (one of: ${skillLevels.join(", ")}), showLevel (always false)
- languages: array of objects with name (max 80), level (one of: ${skillLevels.join(", ")}), showLevel (always false)
- Max 100 items per array
- Date format examples: "Jan 2022", "Present", "2018", "Sep 2012"
- Bullets: Use \\n to separate bullet points. Each line becomes a separate bullet. Start each bullet with an action verb.

## Important rules
1. All text must be plain text (no HTML, no markdown)
2. Bullets are newline-separated (\\n), NOT arrays
3. Set isCollapsed to false for all entries
4. Set showLevel to false for all skills and languages
5. The level field for skills/languages must be one of: beginner, intermediate, advanced, expert
6. Only use allowed keys - no extra fields
7. linkedin should be like "linkedin.com/in/username", github like "github.com/username"

${career_info ? `## Career information to use\n${career_info}` : "## Note\nNo career information was provided. Generate a realistic sample resume for a software engineer."}`,
          },
        },
      ],
    };
  },
);

// --- Tools ---

server.tool(
  "validate-resume",
  "Validates a resume JSON object against the Free Resume schema. Returns validation errors if any.",
  {
    resume: z
      .string()
      .describe(
        "The resume JSON string to validate. Can be the full export format (with app/schemaVersion/data wrapper) or just the data object.",
      ),
  },
  async ({ resume }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(resume);
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }

    // If it has the wrapper format, validate the wrapper and extract data
    let dataToValidate = parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      (parsed as Record<string, unknown>).data &&
      typeof (parsed as Record<string, unknown>).data === "object"
    ) {
      const wrapper = parsed as Record<string, unknown>;
      const wrapperErrors: string[] = [];

      if (wrapper.app !== undefined && wrapper.app !== "free-resume") {
        wrapperErrors.push(`'app' must be 'free-resume', got '${wrapper.app}'`);
      }
      if (wrapper.schemaVersion !== undefined && wrapper.schemaVersion !== 2) {
        wrapperErrors.push(`'schemaVersion' must be 2, got ${wrapper.schemaVersion}`);
      }

      dataToValidate = wrapper.data;

      if (wrapperErrors.length > 0) {
        const dataErrors = validateResumeDetailed(dataToValidate);
        const allErrors = [...wrapperErrors, ...dataErrors];
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation failed with ${allErrors.length} error(s):\n${allErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
            },
          ],
          isError: true,
        };
      }
    }

    const errors = validateResumeDetailed(dataToValidate);

    if (errors.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Valid! The resume JSON conforms to the Free Resume schema.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Validation failed with ${errors.length} error(s):\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
        },
      ],
      isError: true,
    };
  },
);

server.tool(
  "create-resume-file",
  "Takes resume fields, sanitizes them, and returns a valid Free Resume export-format JSON ready to be saved as a .json file and uploaded to the Free Resume app.",
  {
    uiLang: z.enum(["en", "es", "de"]).optional().describe("UI language. Defaults to 'en'."),
    cvLang: z.enum(["en", "es", "de"]).optional().describe("CV content language. Defaults to 'en'."),
    template: z.string().optional().describe("Template: " + templateNames.join(", ") + ". Defaults to 'alpine'."),
    pageSize: z.enum(["a4", "letter"]).optional().describe("Page size. Defaults to 'a4'."),
    theme: z.enum(["light", "dark"]).optional().describe("Color theme. Defaults to 'light'."),
    showSkills: z.boolean().optional().describe("Show skills section. Defaults to true."),
    showSkillLevels: z.boolean().optional().describe("Show skill proficiency levels. Defaults to false."),
    showLanguageLevels: z.boolean().optional().describe("Show language proficiency levels. Defaults to false."),
    nameFontSize: z.number().optional().describe("Name font size percentage (60-140). Defaults to 100."),
    name: z.string().optional().describe("Full name"),
    title: z.string().optional().describe("Professional title"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    location: z.string().optional().describe("City, Country"),
    website: z.string().optional().describe("Website URL"),
    linkedin: z.string().optional().describe("LinkedIn URL or username"),
    github: z.string().optional().describe("GitHub URL or username"),
    summary: z.string().optional().describe("Professional summary text"),
    experience: z
      .array(
        z.object({
          role: z.string().optional(),
          company: z.string().optional(),
          location: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          bullets: z.string().optional().describe("Newline-separated bullet points"),
        }),
      )
      .optional()
      .describe("Work experience entries"),
    education: z
      .array(
        z.object({
          degree: z.string().optional(),
          school: z.string().optional(),
          location: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
        }),
      )
      .optional()
      .describe("Education entries"),
    skills: z
      .array(
        z.object({
          name: z.string(),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        }),
      )
      .optional()
      .describe("Skills list"),
    languages: z
      .array(
        z.object({
          name: z.string(),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        }),
      )
      .optional()
      .describe("Languages list"),
  },
  async (args) => {
    const rawState = {
      uiLang: args.uiLang || "en",
      cvLang: args.cvLang || "en",
      template: args.template || "alpine",
      pageSize: args.pageSize || "a4",
      theme: args.theme || "light",
      showSkills: args.showSkills ?? true,
      showSkillLevels: args.showSkillLevels ?? false,
      showLanguageLevels: args.showLanguageLevels ?? false,
      nameFontSize: args.nameFontSize ?? 100,
      alpineLocationInHeader: false,
      profile: {
        name: args.name || "",
        title: args.title || "",
        email: args.email || "",
        phone: args.phone || "",
        location: args.location || "",
        website: args.website || "",
        linkedin: args.linkedin || "",
        github: args.github || "",
      },
      summary: args.summary || "",
      experience: (args.experience || []).map((e) => ({
        ...e,
        isCollapsed: false,
      })),
      education: (args.education || []).map((e) => ({
        ...e,
        isCollapsed: false,
      })),
      skills: (args.skills || []).map((s) => ({
        ...s,
        level: s.level || "intermediate",
        showLevel: false,
      })),
      languages: (args.languages || []).map((l) => ({
        ...l,
        level: l.level || "intermediate",
        showLevel: false,
      })),
    };

    const sanitized = sanitizeResumeState(rawState);

    const exportPayload = {
      app: "free-resume",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data: sanitized,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(exportPayload, null, 2),
        },
      ],
    };
  },
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
