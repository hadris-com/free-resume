// Starts the built server over stdio and uses it the way an AI assistant's MCP client does.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { templateNames } from "../dist/schema.js";

const serverPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));

describe("server", () => {
  let client;

  before(async () => {
    client = new Client({ name: "free-resume-tests", version: "1.0.0" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath] }));
  });

  after(async () => {
    await client?.close();
  });

  const text = (result) => result.content.map((part) => part.text).join("");

  test("lists its resources, tools and prompt", async () => {
    const { resources } = await client.listResources();
    assert.deepEqual(resources.map((r) => r.uri).sort(), ["free-resume://example", "free-resume://schema"]);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["create-resume-file", "validate-resume"]);
    // The input schemas come from zod; an assistant needs them to call the tools correctly.
    const create = tools.find((t) => t.name === "create-resume-file").inputSchema;
    assert.deepEqual(create.properties.pageSize.enum, ["a4", "letter"]);
    assert.equal(create.properties.experience.type, "array");
    assert.deepEqual(tools.find((t) => t.name === "validate-resume").inputSchema.required, ["resume"]);
    const { prompts } = await client.listPrompts();
    assert.deepEqual(prompts.map((p) => p.name), ["generate-resume"]);
  });

  test("serves the schema and an example that passes its own validation", async () => {
    const schema = JSON.parse((await client.readResource({ uri: "free-resume://schema" })).contents[0].text);
    assert.deepEqual(schema.properties.data.properties.template.enum, [...templateNames]);
    const example = (await client.readResource({ uri: "free-resume://example" })).contents[0].text;
    const result = await client.callTool({ name: "validate-resume", arguments: { resume: example } });
    assert.ok(!result.isError, text(result));
    assert.match(text(result), /^Valid!/);
  });

  test("reports what's wrong with an invalid resume", async () => {
    const resume = JSON.stringify({ app: "free-resume", schemaVersion: 2, data: { template: "nonsense", color: "red" } });
    const result = await client.callTool({ name: "validate-resume", arguments: { resume } });
    assert.equal(result.isError, true);
    assert.match(text(result), /Unknown root keys: color/);
    assert.match(text(result), /'template' must be one of/);
  });

  test("reports invalid JSON", async () => {
    const result = await client.callTool({ name: "validate-resume", arguments: { resume: "{ not json" } });
    assert.equal(result.isError, true);
    assert.match(text(result), /^Invalid JSON/);
  });

  test("creates an importable file, mapping a retired template to its replacement", async () => {
    const result = await client.callTool({
      name: "create-resume-file",
      arguments: {
        template: "noir",
        name: "Ada Lovelace",
        experience: [{ role: "Analyst", company: "Analytical Engine", bullets: "Wrote the first program" }],
        skills: [{ name: "Mathematics" }]
      }
    });
    const file = JSON.parse(text(result));
    assert.equal(file.app, "free-resume");
    assert.equal(file.schemaVersion, 2);
    assert.equal(file.data.template, "berlin");
    assert.equal(file.data.profile.name, "Ada Lovelace");
    assert.equal(file.data.skills[0].level, "intermediate");

    const check = await client.callTool({ name: "validate-resume", arguments: { resume: JSON.stringify(file) } });
    assert.ok(!check.isError, text(check));
  });

  test("refuses to create a file the app wouldn't import", async () => {
    const result = await client.callTool({
      name: "create-resume-file",
      arguments: { summary: "x".repeat(10001), skills: Array.from({ length: 101 }, (_, i) => ({ name: `Skill ${i}` })) }
    });
    assert.equal(result.isError, true);
    assert.match(text(result), /'summary' must be a string with max length 10000/);
    assert.match(text(result), /'skills' has 101 items, max is 100/);
  });

  test("builds the generation prompt with the chosen template and language", async () => {
    const { messages } = await client.getPrompt({ name: "generate-resume", arguments: { language: "es", template: "slate" } });
    const prompt = messages[0].content.text;
    assert.match(prompt, /cvLang: "es"/);
    assert.match(prompt, /template: "berlin"/);
  });
});
