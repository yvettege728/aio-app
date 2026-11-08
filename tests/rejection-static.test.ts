import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..", "src", "rejection");
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}

test("rejection flow does not import network or agent code", () => {
  const source = files(root).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  expect(source).not.toMatch(/src\/agent|server\/|from ["']openai["']/);
});

test("rejection UI and documentation contain no em dash", () => {
  const targets = [...files(root), path.join(__dirname, "..", "README.md")];
  for (const file of targets) expect(fs.readFileSync(file, "utf8")).not.toContain("\u2014");
});

test("rejection animation calls use centralized duration tokens", () => {
  const source = files(root).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  expect(source).not.toMatch(/duration\s*:\s*\d/);
  expect(source).not.toMatch(/\.duration\(\s*\d/);
});
