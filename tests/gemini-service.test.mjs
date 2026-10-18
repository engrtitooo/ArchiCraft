import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const transportUrl = moduleUrl(transpile('../services/geminiTransport.ts'));
const serviceSource = transpile('../services/geminiService.ts')
  .replace(/from ['"]\.\/geminiTransport['"]/, `from ${JSON.stringify(transportUrl)}`)
  .replace(/from ['"]@google\/genai['"]/, `from ${JSON.stringify(import.meta.resolve('@google/genai'))}`);
const service = await import(moduleUrl(serviceSource));
const transport = await import(transportUrl);

const providerResponse = parts => new Response(JSON.stringify({ candidates: [{ content: { parts } }] }), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

test('floor-plan analysis preserves its schema, units and result contract', async t => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/gemini/generate');
    assert.equal(options.credentials, 'same-origin');
    request = JSON.parse(options.body);
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
    return providerResponse([{ text: JSON.stringify({ project_name: 'Fixture', rooms: [] }) }]);
  });
  const result = await service.analyzeFloorPlan('synthetic-image', 'Modern', 'ft');
  assert.equal(result.mode, 'A_INTERIOR_FROM_PLAN');
  assert.equal(request.model, 'gemini-2.5-flash');
  assert.match(request.contents.parts[1].text, /FEET/);
  assert.equal(request.config.responseSchema.type, 'OBJECT');
  assert.equal('apiKey' in request, false);
});

test('concept generation normalizes shorthand contents and keeps layout repairs', async t => {
  let request;
  const concept = { project_name: 'Fixture', rooms: [{ position_on_plot: { x_start_m: 5, x_end_m: 1, y_start_m: 4, y_end_m: 2 }, features: { doors: [], windows: [] } }] };
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    request = JSON.parse(options.body);
    return providerResponse([{ text: JSON.stringify(concept) }]);
  });
  const result = await service.generateArchitecturalConcept({ plotWidth: 15, plotDepth: 20, bedrooms: 3, bathrooms: 2, livingRooms: 1, kitchenType: 'Closed', preferences: '' }, 'm');
  assert.equal(request.contents.parts.length, 1);
  assert.match(request.contents.parts[0].text, /METERS/);
  assert.equal(result.unit_system, 'm');
  assert.equal(result.rooms[0].position_on_plot.x_start_m, 1);
  assert.equal(result.rooms[0].position_on_plot.y_start_m, 2);
  assert.equal(result.rooms[0].features.doors[0].type, 'opening');
});

test('CAD and interior operations preserve bare-base64 input and output', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return providerResponse([{ inlineData: { mimeType: 'image/png', data: 'synthetic-generated-image' } }]);
  });
  assert.equal(await service.generateCadDrawing('synthetic-source-image'), 'synthetic-generated-image');
  assert.equal(await service.generateInteriorPreview('synthetic-source-image', 'Minimalist'), 'synthetic-generated-image');
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.model, 'gemini-3-pro-image-preview');
    assert.equal(request.contents.parts[0].inlineData.data, 'synthetic-source-image');
  }
  assert.match(requests[1].contents.parts[1].text, /Minimalist/);
});

test('text adapter excludes thoughts and joins text parts', async t => {
  t.mock.method(globalThis, 'fetch', async () => providerResponse([{ text: 'private-thought', thought: true }, { text: 'one' }, { text: 'two' }]));
  assert.equal((await transport.generateContent({ model: 'gemini-2.5-flash', contents: { text: 'prompt' } })).text, 'onetwo');
});

test('401 asks the active authentication gate to reset', async t => {
  const events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  t.after(() => { delete globalThis.window; });
  t.mock.method(globalThis, 'fetch', async () => new Response('private upstream response', { status: 401 }));
  await assert.rejects(transport.generateContent({ model: 'gemini-2.5-flash', contents: { text: 'prompt' } }), /sign in again/);
  assert.deepEqual(events, ['archicraft:session-expired']);
});

test('provider error bodies never become client errors', async t => {
  for (const status of [429, 503, 502]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('private upstream response', { status }));
    await assert.rejects(transport.generateContent({ model: 'gemini-2.5-flash', contents: { text: 'prompt' } }), error => !error.message.includes('private upstream'));
  }
});
