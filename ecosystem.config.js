module.exports = {
  apps: [{
    name: 'bakuct',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    // Logging
    error_file: '/var/log/bakuct/error.log',
    out_file: '/var/log/bakuct/output.log',
    log_file: '/var/log/bakuct/combined.log',
    time: true,
    // Restart settings
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

