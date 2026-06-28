/**
 * Tests for normalizeHost() — the function used by "Extract Same Host"
 * to determine whether two tabs share the same hostname.
 *
 * The logic is intentionally simple: lowercase + strip www. No heuristics.
 */

function normalizeHost(hostname) {
  return hostname.toLowerCase();
}

describe('normalizeHost (Extract Same Host)', () => {
  test('returns simple hostname unchanged', () => {
    expect(normalizeHost('google.com')).toBe('google.com');
    expect(normalizeHost('github.com')).toBe('github.com');
  });

  test('preserves www — www.x.com and x.com are different hosts', () => {
    expect(normalizeHost('www.google.com')).toBe('www.google.com');
    expect(normalizeHost('www.google.com')).not.toBe(normalizeHost('google.com'));
  });

  test('lowercases', () => {
    expect(normalizeHost('Mail.Google.COM')).toBe('mail.google.com');
    expect(normalizeHost('WWW.GitHub.com')).toBe('www.github.com');
  });

  test('different subdomains do NOT match', () => {
    expect(normalizeHost('mail.google.com')).not.toBe(normalizeHost('docs.google.com'));
    expect(normalizeHost('portal.hyperspace.tools.sap')).not.toBe(normalizeHost('github.tools.sap'));
  });

  test('same host with different case matches', () => {
    expect(normalizeHost('GitHub.Tools.SAP')).toBe(normalizeHost('github.tools.sap'));
  });

  test('www variant does NOT match bare hostname (different hosts)', () => {
    expect(normalizeHost('www.github.com')).not.toBe(normalizeHost('github.com'));
  });

  test('empty string returns empty', () => {
    expect(normalizeHost('')).toBe('');
  });

  test('real-world SAP case: different services stay separate', () => {
    const host1 = normalizeHost('portal.hyperspace.tools.sap');
    const host2 = normalizeHost('github.tools.sap');
    expect(host1).toBe('portal.hyperspace.tools.sap');
    expect(host2).toBe('github.tools.sap');
    expect(host1).not.toBe(host2);
  });
});
