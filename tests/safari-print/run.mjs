// Serves the app, builds print-check.swift and runs it: Safari's print path on macOS, checked
// against the preview. Set PDF_DIR to keep the PDFs it prints.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../helpers/server.mjs";

if (process.platform !== "darwin") {
  console.error("The Safari print check runs on macOS only.");
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "safari-print-"));
const binary = join(work, "print-check");
const pdfDir = process.env.PDF_DIR || join(work, "pdf");
mkdirSync(pdfDir, { recursive: true });

execFileSync("swiftc", ["-O", fileURLToPath(new URL("print-check.swift", import.meta.url)), "-o", binary], { stdio: "inherit" });

const server = await startServer();
const child = spawn(binary, [server.url, pdfDir], { stdio: "inherit" });
const code = await new Promise((done) => child.on("exit", (exitCode) => done(exitCode ?? 1)));
await server.close();
process.exit(code);
