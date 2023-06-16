/**
 * Helper script to create admin/remote-client-setup.js
 */
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.join('build', 'remote'))
  .filter((f) => f.endsWith('.js') && f !== 'setup.js');

const setup = fs.readFileSync(path.join('build', 'remote', 'setup.js'), 'utf-8')
  .replace(/FILE: ['"]DUMMY['"]/, files.map((f) => `'${f}': '${Buffer.from(fs.readFileSync(path.join('build', 'remote', f), 'utf-8')).toString('base64')}'`).join(',\n'));

fs.writeFileSync(path.join('admin','remote-client-setup.js'), setup, 'utf-8');
