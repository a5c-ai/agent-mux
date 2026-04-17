import * as fs from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('generated native protocol files', () => {
  it('commits generated swift and kotlin protocol outputs', async () => {
    const swift = await fs.readFile('packages/ui/build/schema/swift/AmuxProtocol.swift', 'utf8');
    const kotlin = await fs.readFile('packages/ui/build/schema/kotlin/AmuxProtocol.kt', 'utf8');
    expect(swift).toContain('struct AuthFrame');
    expect(swift).toContain('enum ClientFrame');
    expect(kotlin).toContain('data class AuthFrame');
    expect(kotlin).toContain('sealed interface ClientFrame');
  });
});
