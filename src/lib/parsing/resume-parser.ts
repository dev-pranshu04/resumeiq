export type ParsedResume = {
  text: string;
  fileName: string;
  fileType: "pdf" | "docx" | "txt";
  warnings: string[];
};

export class ResumeParseError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "unsupported-type"
      | "too-large"
      | "empty-file"
      | "corrupt"
      | "no-extractable-text",
  ) {
    super(message);
    this.name = "ResumeParseError";
  }
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const MIN_TEXT_LENGTH = 50;

function detectFileType(file: File): "pdf" | "docx" | "txt" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";
  if (file.type === "text/plain" || name.endsWith(".txt")) return "txt";
  return null;
}

export function validateResumeFile(file: File): void {
  if (file.size === 0) {
    throw new ResumeParseError("This file is empty.", "empty-file");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ResumeParseError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 8MB.`,
      "too-large",
    );
  }
  if (!detectFileType(file)) {
    throw new ResumeParseError(
      "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
      "unsupported-type",
    );
  }
}

async function parsePdf(file: File): Promise<{ text: string; warnings: string[] }> {
  const pdfjs = await import("pdfjs-dist");
  // Vite-friendly worker resolution: bundles the worker as its own asset.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: buffer }).promise;
  } catch {
    throw new ResumeParseError(
      "This PDF could not be read. It may be corrupted or password-protected.",
      "corrupt",
    );
  }

  const warnings: string[] = [];
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  const text = pageTexts.join("\n\n").replace(/\s+\n/g, "\n").trim();
  if (text.length < MIN_TEXT_LENGTH) {
    warnings.push(
      "Very little text could be extracted. This PDF may be a scanned image without a text layer.",
    );
  }
  return { text, warnings };
}

async function parseDocx(file: File): Promise<{ text: string; warnings: string[] }> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buffer = await file.arrayBuffer();
  let result;
  try {
    result = await mammoth.extractRawText({ arrayBuffer: buffer });
  } catch {
    throw new ResumeParseError("This DOCX file could not be read. It may be corrupted.", "corrupt");
  }
  const warnings = result.messages
    .filter((m) => m.type === "warning" || m.type === "error")
    .map((m) => m.message)
    .slice(0, 5);
  return { text: result.value.trim(), warnings };
}

async function parseTxt(file: File): Promise<{ text: string; warnings: string[] }> {
  const text = (await file.text()).trim();
  return { text, warnings: [] };
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  validateResumeFile(file);
  const fileType = detectFileType(file)!;

  const { text, warnings } =
    fileType === "pdf" ? await parsePdf(file) : fileType === "docx" ? await parseDocx(file) : await parseTxt(file);

  if (text.length < MIN_TEXT_LENGTH) {
    throw new ResumeParseError(
      "Couldn't extract enough readable text from this file. Try a different export of your resume, or paste the text directly.",
      "no-extractable-text",
    );
  }

  return { text, fileName: file.name, fileType, warnings };
}
