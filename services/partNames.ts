export function formatPartName(id: string): string {
  return id.replace(/(?:_\d+|\.\d{3})+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ').trim()
    .replace(/^./, char => char.toUpperCase());
}

// Infer parent names only from parts actually present in the model. IDs stay
// untouched, and existing manual groups take precedence over automatic groups.
export function mergeAutomaticPartGroups(parts: string[], existing: Record<string, string[]> = {}): Record<string, string[]> {
  const valid = new Set(parts);
  const result: Record<string, string[]> = Object.fromEntries(Object.entries(existing)
    .map(([name, members]) => [name, members.filter(id => valid.has(id))] as const)
    .filter(([, members]) => members.length > 0));
  const assigned = new Set(Object.values(result).flat());
  const available = parts.filter(id => !assigned.has(id)).map(id => ({ id, name: formatPartName(id) }));
  const candidates = [...available].sort((a, b) => a.name.length - b.name.length);
  const groups = new Map<string, { name: string; ids: string[] }>();
  for (const part of available) {
    const lower = part.name.toLowerCase();
    const base = candidates.find(candidate => {
      const name = candidate.name.toLowerCase();
      return name && (lower === name || lower.endsWith(' ' + name));
    });
    if (!base) continue;
    const key = base.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name: base.name, ids: [] });
    groups.get(key)!.ids.push(part.id);
  }
  for (const group of groups.values()) {
    if (group.ids.length > 1 && !Object.keys(result).some(name => name.toLowerCase() === group.name.toLowerCase())) {
      result[group.name] = group.ids;
    }
  }
  return result;
}
