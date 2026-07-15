/**
 * MD5 for PayFast signature generation.
 * Server-side only — do not import from client components.
 */
export async function md5(input: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('md5').update(input).digest('hex');
}