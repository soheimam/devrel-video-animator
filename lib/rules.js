import path from 'node:path';
import { EDITORIAL } from './paths.js';
import { readYaml } from './files.js';

export function loadRules(file = path.join(EDITORIAL, 'rules.yaml')) {
  return readYaml(file);
}
