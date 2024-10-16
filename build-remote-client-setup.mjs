/**
 * Helper script to create admin/remote-client-setup.js
 */
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';

const files = fs.readdirSync(path.join('build', 'remote'))
  .filter((f) => f.endsWith('.js') && !f.endsWith('setup.js'));

const setup = fs.readFileSync(path.join('build', 'remote', 'setup.js'), 'utf-8')
  .replace(/FILE: ['"]DUMMY['"]/, files.map((f) => `'${f}': '${Buffer.from(fs.readFileSync(path.join('build', 'remote', f), 'utf-8')).toString('base64')}'`).join(',\n'))
  .replace(/^\/\/# sourceMappingURL=.*$/m, '');

fs.writeFileSync(path.join('build', 'remote', 'remote-client-setup.js'), setup, 'utf-8');
