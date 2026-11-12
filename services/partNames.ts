export function formatPartName(id: string): string {
  // Keep NK/NKE material numbers in child labels; only discard export counters.
  const materialCode = id.match(/^(.*[\s_.-]+nke?[\s_.-]*\d+?)(?:_\d+|\.\d{3})*$/i);
  return (materialCode ? materialCode[1] : id.replace(/(?:_\d+|\.\d{3})+$/, ''))
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ').trim()
    .replace(/^./, char => char.toUpperCase());
}

function groupingName(id: string): string {
  // Material codes describe variants of the same part, not separate parent groups.
  // Match before display formatting, which also removes numeric export suffixes.
  const base = id.replace(/[\s_.-]+nke?[\s_.-]*\d+(?:_\d+|\.\d{3})*$/i, '');
  return formatPartName(base);
}

// Infer parent names from model parts and material-code variants. IDs stay
// untouched, and existing manual groups take precedence over automatic groups.
export function mergeAutomaticPartGroups(parts: string[], existing: Record<string, string[]> = {}): Record<string, string[]> {
  const valid = new Set(parts);
  const result: Record<string, string[]> = Object.fromEntries(Object.entries(existing)
    .map(([name, members]) => [name, members.filter(id => valid.has(id))] as const)
    .filter(([, members]) => members.length > 0));
  const assigned = new Set(Object.values(result).flat());
  const available = parts.filter(id => !assigned.has(id)).map(id => ({ id, name: groupingName(id) }));
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
