# 🐳 dockercompose-validator

> Lints and validates docker-compose.yml files, checking for common misconfigurations and security issues.

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/dockercompose-validator/ci.yml?style=for-the-badge)](https://github.com/yourusername/dockercompose-validator/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Codespace Ready](https://img.shields.io/badge/Codespace-Ready-green?style=for-the-badge&logo=github)](https://codespaces.new/yourusername/dockercompose-validator)

---

## 🚀 What is dockercompose-validator?

`dockercompose-validator` parses your `docker-compose.yml` and checks it against a ruleset of best practices — pinned image tags, resource limits, secret handling, healthchecks, and network isolation.

```bash
dockercompose-validator check docker-compose.yml
dockercompose-validator check . --recursive
dockercompose-validator check docker-compose.yml --format json
dockercompose-validator demo
```

## ✨ Features
- 📌 Detects unpinned image tags (`:latest`)
- 💾 Flags missing resource limits (CPU/memory)
- 🔐 Catches hardcoded secrets in environment vars
- 🏥 Warns on missing healthchecks
- 🌐 Detects unnecessary host network mode
- 🔒 Flags privileged containers
- 📋 Checks for missing restart policies

## 📊 Sample Output
```
🐳 dockercompose-validator — docker-compose.yml
────────────────────────────────────────────────
❌ db       Image "postgres:latest" — pin to a specific version
⚠️  api      No resource limits set (mem_limit, cpus)
⚠️  api      Hardcoded secret in environment: DB_PASSWORD
⚠️  web      No healthcheck defined
ℹ️  redis    restart: "no" — consider "unless-stopped"

1 error  3 warnings  1 info
```

## 🏆 Achievement Scripts
```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```

## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)
