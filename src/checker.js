#!/usr/bin/env node
// 🐳 dockercompose-validator — Docker Compose Linter

const fs   = require('fs');
const path = require('path');

const GREEN  = '\x1b[32m'; const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m'; const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';  const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

// Minimal YAML parser for docker-compose structure
function parseYAML(content) {
  const lines   = content.split('\n');
  const result  = { services: {} };
  let   current = null;
  let   inEnv   = false;

  for (const raw of lines) {
    const line    = raw.trimEnd();
    const indent  = line.length - line.trimStart().length;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (indent === 2 && !trimmed.startsWith('-') && trimmed.endsWith(':')) {
      current = trimmed.slice(0, -1);
      result.services[current] = { _raw: [] };
      inEnv = false;
    } else if (current && indent >= 4) {
      result.services[current]._raw.push(trimmed);
      if (trimmed === 'environment:') inEnv = true;
      if (inEnv && trimmed.includes(':') && !trimmed.endsWith(':')) {
        if (!result.services[current].env) result.services[current].env = [];
        result.services[current].env.push(trimmed);
      }
    }
  }
  return result;
}

const SECRET_KEYWORDS = ['password','secret','token','key','api_key','auth','credential'];

const RULES = [
  {
    id: 'DC001', level: 'ERROR',
    check: (name, svc) => {
      const imageLine = svc._raw.find(l => l.startsWith('image:'));
      return imageLine && (imageLine.includes(':latest') || (!imageLine.includes(':') && imageLine.split(' ').length === 2));
    },
    msg: (name, svc) => {
      const img = svc._raw.find(l => l.startsWith('image:'))?.split('image:')[1]?.trim();
      return `Image "${img}" uses :latest — pin to a specific version`;
    },
  },
  {
    id: 'DC002', level: 'WARNING',
    check: (name, svc) => !svc._raw.some(l => l.includes('mem_limit') || l.includes('memory:') || l.includes('cpus:')),
    msg: () => 'No resource limits defined (mem_limit / cpus)',
  },
  {
    id: 'DC003', level: 'WARNING',
    check: (name, svc) => {
      const envLines = svc.env || [];
      return envLines.some(l => SECRET_KEYWORDS.some(kw => l.toLowerCase().includes(kw)) && l.includes('=') && !l.endsWith('='));
    },
    msg: () => 'Hardcoded secret in environment variable',
  },
  {
    id: 'DC004', level: 'WARNING',
    check: (name, svc) => !svc._raw.some(l => l.includes('healthcheck') || l.startsWith('test:')),
    msg: () => 'No healthcheck defined',
  },
  {
    id: 'DC005', level: 'ERROR',
    check: (name, svc) => svc._raw.some(l => l.includes('privileged: true')),
    msg: () => 'Container is running in privileged mode — security risk',
  },
  {
    id: 'DC006', level: 'WARNING',
    check: (name, svc) => svc._raw.some(l => l.includes('network_mode: host')),
    msg: () => 'Host network mode disables container network isolation',
  },
  {
    id: 'DC007', level: 'INFO',
    check: (name, svc) => {
      const restart = svc._raw.find(l => l.startsWith('restart:'));
      return !restart || restart.includes('"no"') || restart.includes("'no'");
    },
    msg: () => 'No restart policy — consider "unless-stopped" or "always"',
  },
];

function validate(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed  = parseYAML(content);
  const issues  = [];

  for (const [name, svc] of Object.entries(parsed.services)) {
    for (const rule of RULES) {
      if (rule.check(name, svc)) {
        issues.push({ service: name, level: rule.level, msg: rule.msg(name, svc), id: rule.id });
      }
    }
  }
  return { issues, services: Object.keys(parsed.services) };
}

function printResults(issues, services, file) {
  const errors = issues.filter(i => i.level === 'ERROR');
  const warns  = issues.filter(i => i.level === 'WARNING');
  const infos  = issues.filter(i => i.level === 'INFO');

  console.log(`\n${CYAN}${BOLD}🐳 dockercompose-validator — ${file}${NC}`);
  console.log(`${DIM}Services: ${services.join(', ')}${NC}`);
  console.log('─'.repeat(65));

  if (!issues.length) {
    console.log(`${GREEN}✅ All checks passed!${NC}\n`);
    return;
  }

  issues.forEach(({ service, level, msg }) => {
    const color = level === 'ERROR' ? RED : level === 'WARNING' ? YELLOW : DIM;
    const icon  = level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️ ' : 'ℹ️ ';
    console.log(`${color}${icon}${NC} ${BOLD}${service.padEnd(12)}${NC} ${msg}`);
  });

  console.log(`\n${RED}${errors.length} errors${NC}  ${YELLOW}${warns.length} warnings${NC}  ${DIM}${infos.length} info${NC}\n`);
  if (errors.length) process.exit(1);
}

function runDemo() {
  const mockIssues = [
    { service: 'db',    level: 'ERROR',   msg: 'Image "postgres:latest" uses :latest — pin to a specific version' },
    { service: 'api',   level: 'WARNING', msg: 'No resource limits defined (mem_limit / cpus)' },
    { service: 'api',   level: 'WARNING', msg: 'Hardcoded secret in environment variable' },
    { service: 'web',   level: 'WARNING', msg: 'No healthcheck defined' },
    { service: 'redis', level: 'INFO',    msg: 'No restart policy — consider "unless-stopped" or "always"' },
  ];
  printResults(mockIssues, ['db','api','web','redis'], 'docker-compose.yml (demo)');
}

const args = process.argv.slice(2);
const cmd  = args[0] || 'demo';
const file = args[1];

console.log(`\n${CYAN}${BOLD}🐳 dockercompose-validator${NC}\n`);

if (cmd === 'demo') {
  runDemo();
} else if (cmd === 'check' && file) {
  if (!fs.existsSync(file)) { console.error(`❌ File not found: ${file}`); process.exit(1); }
  const { issues, services } = validate(file);
  printResults(issues, services, path.basename(file));
} else {
  console.log(`Usage:`);
  console.log(`  node src/checker.js demo`);
  console.log(`  node src/checker.js check docker-compose.yml\n`);
}
