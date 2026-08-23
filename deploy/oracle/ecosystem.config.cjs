const path = require('path');

const root = path.join(__dirname, '..', '..');

module.exports = {
  apps: [
    {
      name: 'eniso-api',
      cwd: path.join(root, 'backend'),
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '450M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
