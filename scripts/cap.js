const os = require('node:os');
const path = require('node:path');

// Work around Node's userInfo lookup failing in some Windows-managed environments.
os.userInfo = () => ({
  username: process.env.USERNAME || 'user',
  homedir: process.env.USERPROFILE || '',
  shell: process.env.ComSpec || '',
  uid: -1,
  gid: -1
});

process.argv = [process.execPath, 'cap', ...process.argv.slice(2)];
require(path.join(__dirname, '..', 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'));
