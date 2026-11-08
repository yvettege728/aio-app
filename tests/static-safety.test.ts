import fs from 'fs';
import path from 'path';

const srcRoot = path.join(__dirname, '..', 'src');
function sourceFiles(dir: string): string[] { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? sourceFiles(path.join(dir, entry.name)) : entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [path.join(dir, entry.name)] : []); }

test('source contains no em dash', () => {
  const files = [path.join(__dirname, '..', 'README.md'), ...sourceFiles(srcRoot)];
  expect(files.some((file) => fs.readFileSync(file, 'utf8').includes('\u2014'))).toBe(false);
});

test('animation durations are centralized in tokens', () => {
  const files = sourceFiles(srcRoot).filter((file) => !file.endsWith('tokens.ts') && !file.endsWith('palettes.ts'));
  const bad = files.filter((file) => /duration\s*:\s*\d/.test(fs.readFileSync(file, 'utf8')));
  expect(bad).toEqual([]);
});

test('phone writing uses explicit agent submission and voice only in the main box', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'LegacyApp.tsx'), 'utf8');
  expect(app).toContain('VoiceInputBar');
  expect(app).toContain('createAgentClient');
  expect(app).not.toContain('onBlur={blurWriting}');
  expect(app).toContain('with paper and pen');
});
