import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const script = fileURLToPath(new URL('./api-cache.mjs', import.meta.url));

test('splits a local Swagger 2 document without exposing its source path', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'yukibloom-api-cache-'));
  context.after(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(directory, { recursive: true, force: true });
  });
  const source = join(directory, 'private-swagger.json');
  const output = join(directory, 'output');
  const swagger = {
    swagger: '2.0',
    schemes: ['https'],
    paths: { '/articles': { get: { summary: 'List articles' }, post: { summary: 'Create article' } } },
  };
  await writeFile(source, JSON.stringify(swagger));
  const options = {
    cwd: directory,
    env: { ...process.env, API_CACHE_SOURCE_FILE: source, API_CACHE_OUTPUT_DIR: output },
  };

  await runFile(process.execPath, [script, 'update'], options);
  await runFile(process.execPath, [script, 'check'], options);

  const manifest = await readFile(join(output, 'manifest.json'), 'utf8');
  const summary = await readFile(join(output, 'summary.md'), 'utf8');
  const operation = await readFile(join(output, 'operations/全部_get_-articles.json'), 'utf8');
  assert.equal(JSON.parse(manifest).operations.length, 2);
  assert.match(operation, /List articles/);
  for (const content of [manifest, summary, operation]) assert.ok(!content.includes(source));

  swagger.paths['/articles'].delete = { summary: 'Delete article' };
  await writeFile(source, JSON.stringify(swagger));
  await assert.rejects(runFile(process.execPath, [script, 'check'], options), /API 缓存已过期/);
});
