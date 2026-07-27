import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeviceTimeZone } from './local-day';

describe('getDeviceTimeZone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the resolved Intl timezone', () => {
    expect(getDeviceTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('reflects whatever IANA zone Intl resolves to, not a hardcoded literal', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }),
        }) as unknown as Intl.DateTimeFormat,
    );

    expect(getDeviceTimeZone()).toBe('Asia/Kolkata');
    spy.mockRestore();
  });

  it('falls back to America/Los_Angeles when Intl throws', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl unavailable in this environment');
    });

    expect(getDeviceTimeZone()).toBe('America/Los_Angeles');
    spy.mockRestore();
  });
});
