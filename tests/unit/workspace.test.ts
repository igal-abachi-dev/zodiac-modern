import { describe, expect, it } from 'vitest';
import { Workspace } from '../../src/lib/crypto/workspace';
import type { SelectedRecipient } from '../../src/types/recipient';
const recipient = Object.freeze({
  name: 'Synthetic',
  bits: 3072,
  fingerprint: 'a'.repeat(64),
  source: 'custom',
  pem: 'public test metadata',
  key: {},
}) as SelectedRecipient;
const output = {
  raw: 'AA',
  envelope: new Uint8Array([0]),
  fingerprint: recipient.fingerprint,
  bits: recipient.bits,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe('memory-only operation lifecycle', () => {
  it('rejects missing/empty/invalid/oversized inputs but preserves whitespace exactly', async () => {
    const seen: string[] = [];
    const workspace = new Workspace(
      async (text) => {
        seen.push(text);
        return output;
      },
      async () => 'b'.repeat(64),
    );
    workspace.setDraft('synthetic');
    expect(await workspace.submit()).toBe(false);
    workspace.selectRecipient(recipient);
    for (const value of ['', '\ud800', '🔑'.repeat(16385)]) {
      workspace.setDraft(value);
      expect(await workspace.submit()).toBe(false);
      expect(workspace.state.draft).toBe(value);
    }
    workspace.setDraft(' \r\n');
    expect(await workspace.submit()).toBe(true);
    expect(seen).toEqual([' \r\n']);
    expect(workspace.state.draft).toBe('');
  });
  it('prevents double submit and relabeling; new-message keeps the key and clear releases it', async () => {
    const pending = deferred<typeof output>();
    let calls = 0;
    const workspace = new Workspace(
      async () => {
        calls++;
        return pending.promise;
      },
      async () => 'b'.repeat(64),
    );
    workspace.selectRecipient(recipient);
    workspace.setDraft('synthetic');
    const first = workspace.submit();
    expect(await workspace.submit()).toBe(false);
    workspace.setDraft('changed');
    workspace.selectRecipient(null);
    expect(workspace.state.draft).toBe('synthetic');
    expect(workspace.state.recipient).toBe(recipient);
    pending.resolve(output);
    expect(await first).toBe(true);
    expect(calls).toBe(1);
    workspace.selectRecipient(null);
    expect(workspace.state.result?.recipient.fingerprint).toBe(
      recipient.fingerprint,
    );
    expect(Object.isFrozen(workspace.state.result?.recipient)).toBe(true);
    workspace.anotherMessage();
    expect(workspace.state.result).toBeNull();
    expect(workspace.state.recipient).toBe(recipient);
    workspace.clear();
    expect(workspace.state.recipient).toBeNull();
    expect(workspace.state.draft).toBe('');
  });
  it('ignores stale crypto and checksum completions after clear, without overwriting a new draft', async () => {
    for (const stage of ['crypto', 'digest']) {
      const crypto = deferred<typeof output>();
      const digest = deferred<string>();
      const workspace = new Workspace(
        () => crypto.promise,
        () => digest.promise,
      );
      workspace.selectRecipient(recipient);
      workspace.setDraft('discarded');
      const pending = workspace.submit();
      if (stage === 'digest') {
        crypto.resolve(output);
        await Promise.resolve();
      }
      workspace.clear();
      workspace.selectRecipient(recipient);
      workspace.setDraft('new draft');
      crypto.resolve(output);
      digest.resolve('b'.repeat(64));
      expect(await pending).toBe(false);
      expect(workspace.state.phase).toBe('editing');
      expect(workspace.state.result).toBeNull();
      expect(workspace.state.draft).toBe('new draft');
    }
  });
  it('retains draft/key on failure, suppresses secret diagnostics and permits retry', async () => {
    let fail = true;
    const workspace = new Workspace(
      async () => {
        if (fail) throw new Error('synthetic-secret-marker');
        return output;
      },
      async () => 'b'.repeat(64),
    );
    workspace.selectRecipient(recipient);
    workspace.setDraft('synthetic');
    expect(await workspace.submit()).toBe(false);
    expect(workspace.state.error).not.toContain('synthetic-secret-marker');
    expect(workspace.state.result).toBeNull();
    expect(workspace.state.draft).toBe('synthetic');
    fail = false;
    expect(await workspace.submit()).toBe(true);
  });
});
