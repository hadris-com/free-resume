// Prints the app to PDF through macOS WebKit, the engine and print path Safari uses, and checks
// that every page of the PDF holds the text of the preview sheet it was laid out on. Safari prints
// at its own scale and breaks pages its own way, so this is the only check of what Safari users get.
//
// Usage: print-check <app url> <directory for the PDFs>
// Run it through run.mjs, which serves the app and builds this file.
import AppKit
import PDFKit
import WebKit

let appURL = URL(string: CommandLine.arguments[1])!
let outDir = CommandLine.arguments[2]

// The resumes each template is printed with: the sample on one page, longer ones across two or
// three, and one with a job too long to move whole, which breaks between its bullets.
let resumes: [(name: String, script: String)] = [
  ("sample", ""),
  ("6 more jobs", "addJobs(6);"),
  ("10 more jobs", "addJobs(10);"),
  ("a long job", "addLongJob();")
]

struct Case {
  let template: String
  let pageSize: String
  let resume: (name: String, script: String)
  var label: String { "\(template) \(pageSize), \(resume.name)" }
  var file: String { "\(outDir)/\(template)-\(pageSize)-\(resume.name.replacingOccurrences(of: " ", with: "-")).pdf" }
}

// Letters of a text, counted. PDFKit reads ligatures (fi, fl, ff, tt) as other characters, so those
// letters are left out, and Berlin draws its section labels several times over, so repeats go.
func letters(_ text: String) -> [Character: Int] {
  let deduped = text.replacingOccurrences(of: "([A-Z][A-Z ]{2,}?)\\1+", with: "$1", options: .regularExpression)
  var counts: [Character: Int] = [:]
  for c in deduped.precomposedStringWithCompatibilityMapping.lowercased() where (c.isLetter || c.isNumber) && !"filt".contains(c) {
    counts[c, default: 0] += 1
  }
  return counts
}

func difference(_ a: [Character: Int], _ b: [Character: Int]) -> Int {
  Set(a.keys).union(b.keys).reduce(0) { $0 + abs(a[$1, default: 0] - b[$1, default: 0]) }
}

final class Checker: NSObject, WKNavigationDelegate {
  let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900), styleMask: [.borderless], backing: .buffered, defer: false)
  let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1440, height: 900))
  var afterLoad: (() -> Void)?
  var cases: [Case] = []
  var failures: [String] = []

  func start() {
    // Uncaught errors in the page, reported with the case they broke.
    web.configuration.userContentController.addUserScript(WKUserScript(source: """
      window.__errors = [];
      addEventListener("error", (event) => window.__errors.push(String(event.message)));
      addEventListener("unhandledrejection", (event) => window.__errors.push(String(event.reason)));
    """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    window.contentView = web
    web.navigationDelegate = self
    load {
      Swift.print("macOS", ProcessInfo.processInfo.operatingSystemVersionString)
      self.js("return [...document.querySelectorAll('#template-select-menu [role=option]')].map((o) => o.dataset.value);") { value in
        let templates = value as? [String] ?? []
        if templates.isEmpty { self.fail("no templates found in the gallery") }
        self.cases = templates.flatMap { template in ["a4", "letter"].flatMap { size in resumes.map { Case(template: template, pageSize: size, resume: $0) } } }
        self.next()
      }
    }
    web.load(URLRequest(url: appURL))
  }

  func load(_ then: @escaping () -> Void) { afterLoad = then }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    let then = afterLoad
    afterLoad = nil
    then?()
  }

  func js(_ code: String, _ done: @escaping (Any?) -> Void) {
    web.callAsyncJavaScript(code, arguments: [:], in: nil, in: .page) { result in
      switch result {
      case .success(let value): done(value)
      case .failure(let error): self.fail("JavaScript error: \(error)")
      }
    }
  }

  func fail(_ message: String) {
    Swift.print("error:", message)
    exit(2)
  }

  func next() {
    guard !cases.isEmpty else { return finish() }
    let current = cases.removeFirst()
    // The draft the app restores on reload, filled with this case's resume.
    js("""
      const { createSampleStateBuilders } = await import("/js/sample-state.js");
      const resume = createSampleStateBuilders({ getState: () => ({}), sanitizeResumeState: (state) => state }).buildSampleResumeState();
      const jobs = resume.experience.slice();
      const addJobs = (count) => { for (let i = 0; i < count; i++) resume.experience.push({ ...jobs[i % jobs.length], role: `${jobs[i % jobs.length].role} ${i + 2}` }); };
      const addLongJob = () => {
        const bullets = Array.from({ length: 34 }, (_, n) => `Bullet ${n + 1} of a long job, written out to fill a whole line of the page.`).join("\\n");
        resume.experience.splice(2, 0, { ...jobs[2], role: "Long Job", bullets });
      };
      \(current.resume.script)
      const draft = JSON.parse(localStorage.getItem("free-resume:draft")) || { data: {} };
      draft.data = { ...draft.data, ...resume, nameFontSize: 100, template: "\(current.template)", pageSize: "\(current.pageSize)" };
      localStorage.setItem("free-resume:draft", JSON.stringify(draft));
    """) { _ in
      self.load { self.check(current) }
      self.web.reload()
    }
  }

  func check(_ current: Case) {
    // The words whose center falls inside each preview sheet.
    js("return window.__errors.join(' | ');") { errors in
      if let errors = errors as? String, !errors.isEmpty { self.report(current, "errors in the page: \(errors)") }
    }
    js("""
      await document.fonts.ready;
      await new Promise((done) => setTimeout(done, 500));
      return [...document.querySelectorAll("#resume-preview .paper-sheet")].map((sheet) => {
        const box = sheet.getBoundingClientRect();
        const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        let text = "";
        for (let node; (node = walker.nextNode()); ) {
          for (const match of node.nodeValue.matchAll(/\\S+/g)) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const rect = range.getBoundingClientRect();
            const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
            if (rect.width && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) text += match[0] + " ";
          }
        }
        return text;
      });
    """) { value in
      let sheets = value as? [String] ?? []
      // How the preview laid the resume out, shown when the sheets and pages disagree.
      self.js("""
        const flow = document.querySelector("#resume-preview .paper-sheet-flow");
        const page = flow?.querySelector(".resume-page");
        const style = flow && getComputedStyle(flow);
        const rect = page?.getBoundingClientRect(), box = flow?.getBoundingClientRect();
        return `page ${page?.offsetHeight}px tall in ${page?.getClientRects().length} rects, ${Math.round(rect?.width)}px wide; flow ${style?.height} tall, ${flow?.scrollWidth}/${flow?.offsetWidth}px wide`;
      """) { layout in
        self.layout = layout as? String ?? ""
        self.printPDF(current) { pdf in
          self.compare(current, sheets: sheets, pdf: pdf)
          self.next()
        }
      }
    }
  }

  var layout = ""
  var printed: ((PDFDocument?) -> Void)?

  func printPDF(_ current: Case, then: @escaping (PDFDocument?) -> Void) {
    let info = NSPrintInfo()
    info.paperSize = current.pageSize == "a4" ? NSSize(width: 595.28, height: 841.89) : NSSize(width: 612, height: 792)
    info.topMargin = 0
    info.bottomMargin = 0
    info.leftMargin = 0
    info.rightMargin = 0
    info.horizontalPagination = .fit
    info.verticalPagination = .automatic
    info.jobDisposition = .save
    info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = URL(fileURLWithPath: current.file)
    let operation = web.printOperation(with: info)
    operation.showsPrintPanel = false
    operation.showsProgressPanel = false
    operation.view?.frame = web.bounds
    printed = { _ in then(PDFDocument(url: URL(fileURLWithPath: current.file))) }
    operation.runModal(for: window, delegate: self, didRun: #selector(printDone(_:success:contextInfo:)), contextInfo: nil)
  }

  // WebKit may report the finished print from another thread; the page is driven from the main one.
  @objc func printDone(_ operation: NSPrintOperation, success: Bool, contextInfo: UnsafeMutableRawPointer?) {
    DispatchQueue.main.async {
      let then = self.printed
      self.printed = nil
      then?(nil)
    }
  }

  func compare(_ current: Case, sheets: [String], pdf: PDFDocument?) {
    guard let pdf else { return report(current, "the PDF wasn't written") }
    let pages = (0..<pdf.pageCount).map { pdf.page(at: $0)?.string ?? "" }
    guard sheets.count == pages.count else {
      return report(current, "\(sheets.count) preview sheets, \(pages.count) PDF pages (\(layout))")
    }
    for (index, (sheet, page)) in zip(sheets, pages).enumerated() {
      let off = difference(letters(sheet), letters(page))
      // A line in the wrong place is 40 letters or more; ligatures and repeats leave none.
      if off > 10 { return report(current, "page \(index + 1) differs from its preview sheet by \(off) letters") }
    }
    // A later page starts below the page's top margin, as the first one does.
    for index in 1..<max(1, pdf.pageCount) {
      guard let page = pdf.page(at: index), let selection = page.selection(for: page.bounds(for: .mediaBox)) else { continue }
      let height = page.bounds(for: .mediaBox).height
      let lines = selection.selectionsByLine().filter { !($0.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
      let top = lines.map { height - $0.bounds(for: page).maxY }.min() ?? .infinity
      if top < 12 { return report(current, "page \(index + 1) starts \(Int(top))pt from its top edge") }
    }
    Swift.print("ok    \(current.label): \(pages.count) page\(pages.count == 1 ? "" : "s")")
  }

  func report(_ current: Case, _ problem: String) {
    failures.append("\(current.label): \(problem)")
    Swift.print("FAIL  \(current.label): \(problem)")
  }

  func finish() {
    if failures.isEmpty {
      Swift.print("\nEvery PDF page matches its preview sheet.")
      exit(0)
    }
    Swift.print("\n\(failures.count) case\(failures.count == 1 ? "" : "s") where Safari's PDF differs from the preview:")
    failures.forEach { Swift.print("  \($0)") }
    exit(1)
  }
}

setvbuf(stdout, nil, _IOLBF, 0)
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let checker = Checker()
checker.start()
DispatchQueue.main.asyncAfter(deadline: .now() + 900) {
  print("error: timed out")
  exit(3)
}
app.run()
