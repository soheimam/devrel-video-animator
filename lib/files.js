import fs from 'node:fs';
import YAML from 'yaml';

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function readYaml(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing file: ${file}`);
  }
  return YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
}
