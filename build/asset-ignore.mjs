// Git-style asset ignore rules: basename rules apply at every depth; slash rules
// are rooted; an excluded directory cannot be reopened by a child-file negation.
export function createAssetIgnore(text) {
  const rules = text.split(/\r?\n/).flatMap(line => {
    line = line.replace(/(?<!\\) +$/, '');
    if (!line || line.startsWith('#')) return [];
    const negate = line.startsWith('!');
    if (negate) line = line.slice(1);
    const rooted = line.startsWith('/');
    if (rooted) line = line.slice(1);
    const directory = line.endsWith('/');
    if (directory) line = line.slice(0, -1);
    if (!line) return [];
    const anchor = rooted || line.includes('/') ? '^' : '(?:^|/)';
    let pattern = '';
    const escape = character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (let i = 0; i < line.length; i++) {
      const character = line[i];
      if (character === '\\') { if (++i === line.length) throw new Error('Invalid trailing escape in .assetsignore'); pattern += escape(line[i]); }
      else if (character === '*') {
        if (line[i + 1] === '*' && (i === 0 || line[i - 1] === '/') && (i + 2 === line.length || line[i + 2] === '/')) {
          i++;
          if (line[i + 1] === '/') { pattern += '(?:[^/]+/)*'; i++; } else pattern += '.*';
        } else pattern += '[^/]*';
      } else if (character === '?') pattern += '[^/]';
      else if (character === '[') {
        const end = line.indexOf(']', i + 1);
        if (end === -1) throw new Error('Invalid character class in .assetsignore');
        let body = line.slice(i + 1, end); if (body.startsWith('!')) body = '^' + body.slice(1);
        pattern += '[' + body + ']'; i = end;
      } else pattern += escape(character);
    }
    return [{ negate, directory, regex: new RegExp(anchor + pattern + '$') }];
  });
  return (path, directory = false) => {
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('/');
      const isDirectory = i < parts.length || directory;
      let ignored = false;
      for (const rule of rules) if ((!rule.directory || isDirectory) && rule.regex.test(prefix)) ignored = !rule.negate;
      if (ignored) return true;
    }
    return false;
  };
}
