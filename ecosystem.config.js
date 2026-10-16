module.exports = {
  apps: [
    {
      name: "1bpx-api",
      namespace: "1bpx",
      cwd: "/opt/1billionpixel/apps/api",
      script: "npm",
      args: "start",
      node_args: "--env-file=/opt/1billionpixel/apps/api/.env",
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "1bpx-web",
      namespace: "1bpx",
      cwd: "/opt/1billionpixel/apps/web",
      script: "npm",
      args: "start",
      autorestart: true,
    },
  ],
};