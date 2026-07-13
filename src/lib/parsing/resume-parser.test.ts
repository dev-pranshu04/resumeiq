import { describe, expect, it } from "vitest";
import { validateResumeFile, parseResumeFile, ResumeParseError } from "@/lib/parsing/resume-parser";

function makeFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

describe("validateResumeFile", () => {
  it("accepts a reasonably-sized txt file", () => {
    const file = makeFile("hello world", "resume.txt", "text/plain");
    expect(() => validateResumeFile(file)).not.toThrow();
  });

  it("rejects an empty file", () => {
    const file = makeFile("", "resume.txt", "text/plain");
    expect(() => validateResumeFile(file)).toThrow(ResumeParseError);
  });

  it("rejects an unsupported file type", () => {
    const file = makeFile("hello", "resume.exe", "application/octet-stream");
    try {
      validateResumeFile(file);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ResumeParseError);
      expect((error as ResumeParseError).kind).toBe("unsupported-type");
    }
  });

  it("rejects a file over the size limit", () => {
    const big = "a".repeat(9 * 1024 * 1024);
    const file = makeFile(big, "resume.txt", "text/plain");
    try {
      validateResumeFile(file);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ResumeParseError);
      expect((error as ResumeParseError).kind).toBe("too-large");
    }
  });
});

describe("parseResumeFile (txt path)", () => {
  it("extracts text from a plain text resume", async () => {
    const longEnoughText = "Experienced software engineer. ".repeat(5);
    const file = makeFile(longEnoughText, "resume.txt", "text/plain");
    const parsed = await parseResumeFile(file);
    expect(parsed.fileType).toBe("txt");
    expect(parsed.text.length).toBeGreaterThan(50);
    expect(parsed.warnings).toHaveLength(0);
  });

  it("throws no-extractable-text for a txt file that is too short", async () => {
    const file = makeFile("hi", "resume.txt", "text/plain");
    await expect(parseResumeFile(file)).rejects.toMatchObject({
      kind: "no-extractable-text",
    });
  });
});
