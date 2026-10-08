export function isMockPaymentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MOCK_PAYMENTS === 'true' && ['development', 'test'].includes(env.NODE_ENV || '');
}
