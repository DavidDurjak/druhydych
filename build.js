// Vercel build: dekóduje PNG ikony z base64 (GitHub connector prenáša len text)
const fs = require('fs');
for (const f of ['icon-192.png', 'icon-512.png']) {
  if (fs.existsSync(f + '.b64')) { fs.writeFileSync(f, Buffer.from(fs.readFileSync(f + '.b64', 'utf8').trim(), 'base64')); console.log('wrote', f); }
}
