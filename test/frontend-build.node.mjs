import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const directory = new URL('../dist/client/assets/', import.meta.url);
test('obfuscated browser imports retain literal paths for Vite CSS preloads', async () => {
  const files = await readdir(directory);
  for (const file of files.filter(file => file.endsWith('.js'))) {
    const code = await readFile(new URL(file, directory), 'utf8');
    assert.doesNotMatch(code, /\bimport\(\s*[^'"`\s]/, file + ': computed imports bypass CSS dependency analysis');
  }
  const management = files.find(file => /^management-.*\.js$/.test(file));
  const code = await readFile(new URL(management, directory), 'utf8');
  for (const page of ['LoginView', 'SettingsView', 'ConversionView', 'DashboardView', 'NetworkView', 'SubscriptionView', 'EchView', 'CdnView', 'LogsView']) {
    assert.match(code, new RegExp('assets/' + page + '-[^"\\s]+\\.css'), page + ': missing CSS preload dependency');
  }
});
