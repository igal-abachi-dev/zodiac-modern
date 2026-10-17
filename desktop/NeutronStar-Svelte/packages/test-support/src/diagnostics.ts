// Opt-in diagnostic build only. No storage, network, native bridge or auto-export.
export const entryTypes = ['paint', 'largest-contentful-paint', 'layout-shift', 'longtask', 'event', 'first-input'] as const;
export type EntryType = typeof entryTypes[number];
export interface DiagnosticEntry {
  type: EntryType; startTime: number; duration: number;
  name?: string; targetId?: string | null;
  renderTime?: number; loadTime?: number; size?: number;
  processingStart?: number; processingEnd?: number; interactionId?: number;
  value?: number; hadRecentInput?: boolean;
}
// Structural subset: never call toJSON(), retain DOM nodes, or copy URLs/text.
interface InputEntry {
  entryType: string; name: string; startTime: number; duration: number;
  [key: string]: unknown;
}
const ids = new Set(['encrypt', 'decrypt', 'cancel', 'reset', 'about-trigger', 'about-close', 'workload-query', 'fixture-text', 'status']);
const events = new Set(['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'keydown', 'keyup', 'input', 'beforeinput', 'compositionstart', 'compositionend']);
export function sanitizeEntry(input: InputEntry): DiagnosticEntry | null {
  if (!entryTypes.includes(input.entryType as EntryType) || !Number.isFinite(input.startTime) ||
      !Number.isFinite(input.duration) || input.startTime < 0 || input.duration < 0) return null;
  const result: DiagnosticEntry = { type: input.entryType as EntryType, startTime: input.startTime, duration: input.duration };
  const copy = (...keys: (keyof DiagnosticEntry)[]) => {
    for (const key of keys) {
      const value = input[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        Object.assign(result, { [key]: value });
    }
  };
  if (result.type === 'paint') {
    if (!['first-paint', 'first-contentful-paint'].includes(input.name)) return null;
    result.name = input.name;
  }
  if (result.type === 'largest-contentful-paint') copy('renderTime', 'loadTime', 'size');
  if (result.type === 'layout-shift') {
    copy('value'); result.hadRecentInput = input.hadRecentInput === true;
  }
  if (result.type === 'event' || result.type === 'first-input') {
    result.name = events.has(input.name) ? input.name : 'other';
    copy('processingStart', 'processingEnd', 'interactionId');
  }
  const node = input.target ?? input.element;
  if (node && typeof node === 'object' && 'id' in node) {
    const id = node.id;
    result.targetId = typeof id === 'string' && ids.has(id) ? id : null;
  }
  return result;
}

export function sessionWindowMax(entries: readonly DiagnosticEntry[]) {
  let began = 0, previous = 0, current = 0, largest = 0, active = false;
  const shifts = entries.filter(e => e.type === 'layout-shift' && !e.hadRecentInput && e.value !== undefined)
    .sort((a, b) => a.startTime - b.startTime);
  for (const shift of shifts) {
    if (!active || shift.startTime - previous >= 1000 || shift.startTime - began >= 5000) {
      began = shift.startTime; current = 0; active = true;
    }
    previous = shift.startTime; current += shift.value!; largest = Math.max(largest, current);
  }
  return largest;
}
// Blocking portions of recorded tasks in an explicit window, NOT Lighthouse TBT.
export function intervalBlockingMs(entries: readonly DiagnosticEntry[], from: number, to: number) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) throw new RangeError('Invalid interval');
  return entries.filter(e => e.type === 'longtask').reduce((sum, e) =>
    sum + Math.max(0, Math.min(to, e.startTime + e.duration) - Math.max(from, e.startTime + 50)), 0);
}
export function createEntryBuffer(capacity = 512) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) throw new RangeError('Capacity 1..10000');
  const entries: DiagnosticEntry[] = [];
  let dropped = 0;
  return {
    add(entry: DiagnosticEntry) { if (entries.length === capacity) { dropped++; return; } entries.push({ ...entry }); },
    snapshot: () => ({ entries: entries.map(e => ({ ...e })), dropped }),
  };
}

export function startDiagnostics(capacity = 512) {
  const buffer = createEntryBuffer(capacity), startedAt = performance.now(), initialVisibility = document.visibilityState;
  const supported = typeof PerformanceObserver === 'undefined' ? [] : [...PerformanceObserver.supportedEntryTypes];
  const observers: PerformanceObserver[] = [];
  const status: Record<string, 'observing' | 'unsupported' | 'failed'> = {};
  const reportedBrowserDrops: Record<string, number | null> = {};
  let stoppedAt: number | null = null, stopReason: 'explicit' | 'hidden' | 'pagehide' | null = null;
  const ingest = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      const value = sanitizeEntry(entry as unknown as InputEntry);
      if (value) buffer.add(value);
    }
  };
  for (const type of entryTypes) {
    reportedBrowserDrops[type] = null;
    if (!supported.includes(type)) { status[type] = 'unsupported'; continue; }
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list, _, options?: { droppedEntriesCount?: number }) => {
        ingest(list.getEntries());
        if (Number.isFinite(options?.droppedEntriesCount)) reportedBrowserDrops[type] = options!.droppedEntriesCount!;
      });
      // Event Timing's supported option is absent from this pinned lib.dom.
      const options: PerformanceObserverInit & { durationThreshold?: number } = { type, buffered: true };
      if (type === 'event') options.durationThreshold = 16;
      observer.observe(options);
      status[type] = 'observing'; observers.push(observer);
    } catch { observer?.disconnect(); status[type] = 'failed'; }
  }
  const drain = () => { for (const observer of observers) ingest(observer.takeRecords()); };
  const snapshot = () => {
    drain();
    const data = buffer.snapshot(), sampledAt = performance.now();
    const paints = data.entries.filter(e => e.type === 'paint');
    const lcp = data.entries.filter(e => e.type === 'largest-contentful-paint').sort((a,b) => a.startTime-b.startTime).at(-1);
    return {
      schema: 'neutronstar.browser-diagnostics.v1', diagnosticOnly: true,
      timeOrigin: performance.timeOrigin, startedAt, sampledAt, stoppedAt, stopReason,
      initialVisibility, visibility: document.visibilityState, capacity, eventDurationThresholdMs: 16,
      supportedEntryTypes: supported, observerStatus: { ...status },
      browserDroppedEntriesLatestReport: { ...reportedBrowserDrops },
      ...data,
      provisional: {
        fcpMs: paints.find(e => e.name === 'first-contentful-paint')?.startTime ?? null,
        lcpCandidateMs: lcp?.startTime ?? null,
        clsSessionWindowMax: status['layout-shift'] === 'observing' ? sessionWindowMax(data.entries) : null,
        // Long tasks may have begun before observers were installed (buffered).
        recordedBlockingMsSinceCollectorStart: status.longtask === 'observing' ? intervalBlockingMs(data.entries, startedAt, stoppedAt ?? sampledAt) : null,
        incompleteWhenBufferDrops: data.dropped > 0 || Object.values(reportedBrowserDrops).some(count => count !== null && count > 0),
      },
      interpretation: 'Raw lab diagnostics; no official INP, Lighthouse TBT, field CWV, OS launch or physical scan-out result.',
    };
  };
  const stop = (reason: 'explicit' | 'hidden' | 'pagehide' = 'explicit') => {
    if (stoppedAt === null) {
      drain(); for (const observer of observers) observer.disconnect();
      stoppedAt = performance.now(); stopReason = reason;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    }
    return snapshot();
  };
  const onVisibility = () => { if (document.visibilityState === 'hidden') stop('hidden'); };
  const onPageHide = () => { stop('pagehide'); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  if (document.visibilityState === 'hidden') stop('hidden');
  return { snapshot, stop: () => stop('explicit') };
}
declare global { interface Window { neutronstarDiagnostics?: ReturnType<typeof startDiagnostics> } }
