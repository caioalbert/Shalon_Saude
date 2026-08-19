import { spawnSync } from 'node:child_process'

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(process.execPath, [
  'node_modules/typescript/bin/tsc',
  'lib/maisedu-sync.ts',
  'scripts/tests/maisedu-response.test.ts',
  'scripts/tests/maisedu-register.test.ts',
  'scripts/tests/maisedu-sync.test.ts',
  '--outDir',
  '.next/maisedu-tests',
  '--rootDir',
  '.',
  '--module',
  'commonjs',
  '--moduleResolution',
  'node',
  '--target',
  'es2022',
  '--esModuleInterop',
  '--skipLibCheck',
  '--strict',
  '--noEmit',
  'false',
  '--types',
  'node',
  '--lib',
  'es2022,dom',
])

run(process.execPath, ['.next/maisedu-tests/scripts/tests/maisedu-response.test.js'])
run(process.execPath, ['.next/maisedu-tests/scripts/tests/maisedu-register.test.js'])
run(process.execPath, ['.next/maisedu-tests/scripts/tests/maisedu-sync.test.js'])
