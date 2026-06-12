#!/usr/bin/env node
/**
 * permission-guard.js — Smart permission system for Claude Code
 * Tiered: Blocklist → Allowlist → Cache → Ask User
 *
 * Mode behavior:
 *   - default:           full tier cascade
 *   - bypassPermissions: Tier 0 blocklist + allowlist (no cache, no ask)
 *   - auto:              Tier 0 blocklist runs first; everything else
 *                        defers to Claude Code's classifier
 *
 * SCOPE — read this before relying on the blocklist:
 *   This hook is BEST-EFFORT DEFENSE-IN-DEPTH, not a security boundary.
 *   Claude Code's own permission classifier is the real gate. The Tier 0
 *   blocklist catches the common, obvious destructive forms (and now matches
 *   them regardless of flag order — `rm -fr`, `rm -r -f`, `rm --recursive
 *   --force`, `chmod 0777`, `chmod u+s` are all caught). It is NOT a complete
 *   or bypass-proof denylist: a determined operator with shell access can
 *   construct an equivalent command it does not recognize. Under
 *   `bypassPermissions` there is no upstream gate, so Tier 0 is the only
 *   check — keep that mode for trusted contexts only. Treat Tier 0 as a
 *   tripwire that raises the cost of accidents, not as a guarantee.
 *
 * Exit codes:
 *   0 = allow (with JSON permissionDecision)
 *   2 = block (dangerous command)
 *   0 + "ask" = defer to user
 *
 * The decision logic lives in pure functions (classify / isAllowlisted /
 * isBlocklisted / hasDangerousRm / hasUnsafeRedirect / splitCommands) that are
 * exported for testing. The eval suite (forgebee/eval/scenarios/
 * permission-guard.test.js) imports them directly, so the tests always
 * exercise the live patterns — there is no hand-copied snapshot to drift.
 */

const fs = require('fs');
const path = require('path');
const common = require('./_common.js');

// ── Bootstrap: resolve paths for both plugin and legacy installs ──────
const PROJECT_DIR = common.getProjectDir();
const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/permissions.json');

// ── S-006: Load user-configurable glob allowlist from settings ──────
function loadCustomAllowlist() {
  try {
    const settingsPath = path.join(PROJECT_DIR, '.claude/settings.json');
    if (!fs.existsSync(settingsPath)) return [];
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const patterns = settings?.forgebee?.permissionAllowlist;
    if (!Array.isArray(patterns)) return [];
    return patterns.filter(p => typeof p === 'string' && p.length > 0);
  } catch (e) {
    return [];
  }
}

/**
 * Simple glob matcher — supports * (any chars) and ? (single char)
 * No dependencies required.
 */
function globMatch(pattern, str) {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regex}$`, 'i').test(str);
}

// ── Pattern definitions ───────────────────────────────────────────────

const ALLOWLIST_PATTERNS = [
  // Shell builtins & scripting constructs
  /^cd( |$)/i,
  /^[a-zA-Z_][a-zA-Z0-9_]*=[^$`]*$/,   // variable assignment WITHOUT command substitution
  /^(local|readonly|declare) /i,         // variable declarations (not export — see blocklist)
  /^(true|false|:)$/,                    // no-ops
  /^\[+ /,                               // test: [ -f ... ] or [[ ... ]]
  /^test /i,                             // test command
  /^(return|exit|break|continue)( |$)/i, // flow control
  /^(basename|dirname|realpath) /i,      // path helpers
  /^(set|unset|shift) /i,               // shell builtins (not source/. — can execute files)
  /^(time|gtime|hyperfine) /i,           // benchmarking wrappers
  /^(man|tldr|info|help) /i,             // documentation
  // Git safe operations (covers almost all daily git usage)
  /^git (status|diff|log|show|branch|tag|remote|stash list|stash show|blame|shortlog|describe|rev-parse|rev-list|reflog|grep|ls-files|ls-tree|config (--get|--list|--show)|worktree (list|add)|bisect|whatchanged)/i,
  /^git fetch/i,
  /^git pull$/i,
  /^git pull --rebase( |$)/i,
  /^git (switch|checkout) /i,
  /^git (merge|cherry-pick|revert|restore|mv) /i,
  /^git rebase( |$)(?!.*--root|.*-i)/i,   // non-interactive, non-root rebase (interactive can run editors)
  /^git rebase --(continue|abort|skip|edit-todo)/i,
  /^git add /i,
  /^git commit /i,
  /^git stash$/i,
  /^git stash (push|save|apply|pop|list|show|drop)/i,
  /^git push( |$)/i,                    // non-force push (force is blocklisted)
  /^git clone /i,
  /^git init/i,
  /^gh (auth status|config get|api .*\bGET\b|workflow (list|view|run list|run view|view)|repo (view|list|clone)|pr (list|view|status|checks|diff|create|comment)|issue (list|view|create|comment)|run (list|view|watch|view-log))/i,
  // File reading & inspection (NOT find — supports -exec/-delete)
  /^(ls|cat|head|tail|wc|file|stat|which|where|type|readlink|realpath|md5|md5sum|shasum|sha256sum)/i,
  /^(pwd|echo|printf|date|whoami|hostname|uname|tty|tputs?)/i,
  /^(open|xdg-open|pbcopy|pbpaste|code|cursor|subl|vim|nvim|emacs|nano)( |$)/i,  // editors / clipboards
  // Package managers (read/install — NOT publish/exec arbitrary)
  /^(npm|npx|yarn|pnpm|bun) (test|run|install|i|ci|list|ls|outdated|audit|info|view|why|exec|create|init|version|search|home|repo|owner|prefix|root|update|upgrade|rebuild|prune|pack|link|unlink|dedupe|store|cache)( |$)/i,
  /^(yarn|pnpm|bun) (add|remove)( |$)/i,                                          // yarn/pnpm/bun add/remove
  /^(pip|pip3) (install|list|show|freeze|check|search|download|wheel|hash|index)( |$)/i,
  /^(cargo) (test|build|check|clippy|fmt|run|bench|doc|tree|update|fetch|search|info|expand|edit|outdated|audit|llvm-cov)( |$)/i,
  /^(go) (test|build|vet|fmt|run|mod|generate|tool|env|doc|list|version|install|get|work)( |$)/i,
  /^(\.\/)?(mvn|gradle|gradlew) (test|build|compile|check|clean|package|verify|dependencies|wrapper|init|tasks)/i,
  /^(make|gmake|cmake|just|task|mage)( |$)/i,    // make + task runners
  /^(mise|asdf) (list|current|install|use|local|global|exec|where|which|version|plugins?|reshim|env)/i,
  // Ruby / PHP / .NET / JVM
  /^(bundle|bundler) (install|exec|list|show|outdated|update|info|check|clean|cache|env|version)/i,
  /^(rails|rake) /i,
  /^(php|composer) (--version|-v|install|update|list|show|require|autoload|dump-autoload|validate|outdated|why|search|info|run-script|exec)/i,
  /^(php artisan) /i,
  /^(dotnet) (build|test|run|publish|restore|list|new|add|remove|format|tool|workload|--info|--version)/i,
  // Python tooling
  /^(uv|poetry|pipx|hatch) /i,
  /^(pytest|tox|nox|coverage) /i,
  /^python3? -m (pytest|unittest|coverage|black|ruff|mypy|http\.server|pip|venv|build|twine|json\.tool)/i,
  // Linting & formatting
  /^(eslint|prettier|black|ruff|flake8|pylint|rubocop|stylelint|biome)/i,
  /^(tsc|tsconfig)/i,
  // Testing
  /^(pytest|jest|vitest|mocha|rspec|phpunit|go test|cargo test|dotnet test)/i,
  /^(playwright|cypress)/i,
  // Docker operations (non-destructive: read, build, lifecycle, mgmt)
  /^docker (ps|images|logs|inspect|stats|top|port|version|info|run|build|exec)/i,
  /^docker (start|stop|restart|pause|unpause|wait|attach|kill)( |$)/i,    // lifecycle (single container)
  /^docker (pull|tag|history|diff|save|export|cp|commit)( |$)/i,           // image + state mgmt
  /^docker (network|volume|context|system|image|container|node|service|stack|secret|config) (ls|inspect|prune --filter|df|history|export|save|use)/i,  // read-only sub-mgmt
  /^docker buildx (ls|inspect|build|imagetools)/i,
  /^docker[ -]compose (ps|logs|config|up|down|build|exec|run)/i,
  /^docker[ -]compose (restart|pull|push|stop|start|top|pause|unpause|kill|rm|create|images|events|cp|wait|version)/i,
  /^dc (ps|logs|up|down|build|exec|restart|pull|stop|start|top|pause|unpause|run|config)/i,    // common shell alias
  // Kubernetes (read-only)
  /^kubectl (get|describe|logs|top|config view|version|cluster-info|api-resources|api-versions|explain)/i,
  /^k9s/i,
  /^minikube (status|version|profile list|ip|service list|logs)/i,
  /^helm (list|status|history|get|show|repo (list|update|search)|version|env)/i,
  // Build tools
  /^(webpack|vite|rollup|esbuild|turbo|nx)/i,
  // GitHub CLI (read-only)
  /^gh (pr|issue|repo|run) (list|view|status|checks|diff)/i,
  // Misc safe
  /^(curl|wget) .*(--head|-I|--dry-run)/i,
  // Search tools — read-only by design
  /^(grep|rg|ag|ack|sift|pt|ucg|sed -n)( |$)/i,           // grep family
  // fd — must consume the ENTIRE command, rejecting if -x/--exec/-X/--exec-batch
  // appears anywhere (negative lookahead anchored at flag boundary).
  /^(fd|fdfind)(?:(?!(?:^|\s)(?:-x|--exec|-X|--exec-batch)(?:\s|$)).)*$/i,
  /^(locate|mlocate|plocate|updatedb --localpaths)( |$)/i,
  /^(ctags|etags|gtags|cscope) /i,                       // tag generators (write index but read-only on source)
  /^git grep /i,                                         // explicit (also in git pattern above)
  /^(bat|lsd|eza|delta|broot)( |$)/i,                   // modern read tools
  /^(tree|du|df|free|top|htop|btop|glances|iotop|atop|pidstat)(\s|$)/i,
  /^(jq|yq|xmllint|miller|mlr|csvkit|csvq|jc)( |$)/i,    // structured data filters
  // Interpreters — only a LOCAL (relative) script file, never a flag (-e/-c),
  // an absolute path (/tmp/evil.js), or a home path (~/evil.js). Inline-eval
  // forms are blocklisted in Tier 0; absolute/home script paths fall to "ask".
  /^(node|python3?|ruby|php)\s+(?![-/~])[\w.]/i,
  /^(diff|cmp|comm) /i,
  /^(sort|uniq|cut|tr|tee|column)/i,
  /^mkdir /i,
  /^touch /i,
  // Safe single-file removal — explicit `rm` for /tmp paths or relative files.
  // Excludes -r/-R (recursive — Tier 0 blocklist still catches `rm -rf` dangerous paths).
  /^rm(\s+-[fivI]+)?\s+(\/tmp\/|\/var\/folders\/|\/private\/tmp\/|\.\/|[a-zA-Z0-9_])[^\s]*\s*$/i,
  /^(unlink|rmdir) /i,                  // single-file/empty-dir removal — narrower than rm
  /^(mv|cp) /i,                          // move / copy — sensitive sources/dests rejected in isAllowlisted()
  /^ln -s? /i,                           // symlinks — non-destructive
  // find — read-only subset (NOT -exec, -delete, -ok which can run commands).
  // The flag-boundary check uses (?<=^|\s) lookbehind because `\b` doesn't
  // anchor between two non-word chars (space and `-`).
  /^find(?:(?!(?:^|\s)(?:-exec|-delete|-ok|-execdir|-okdir|-fprint|-fprintf|-fls)(?:\s|$)).)*$/i,
  // xargs — common pipe sink. ONLY allow when the next command is safe.
  // (Permissive xargs would let `find ... | xargs rm` bypass the find guard.)
  /^xargs\s+(-[a-zA-Z0-9]+\s+)*(grep|rg|ag|ack|cat|head|tail|wc|file|stat|ls|echo|printf|jq|yq|sort|uniq|cut|tr|sed|awk|tee|sha\w+|md5\w*|basename|dirname|realpath|true|:)( |$)/i,
  /^xargs\s+(-[a-zA-Z0-9]+\s+)*-I\s+\S+\s+(grep|rg|cat|head|tail|wc|echo|stat|file|ls)( |$)/i,
  // awk — read-only is fine; only block when system()/getline pipes are present
  /^(awk|gawk|nawk)\s+(?!.*system\s*\(|.*\|\s*getline)/i,
  // sed -i and other in-place — explicit need (sensitive targets rejected in isAllowlisted())
  /^sed -i/i,
  // env (read), printenv, locale, lscpu, ulimit
  /^(env|printenv|locale|lscpu|lsblk|lsof|ulimit|nproc|uptime|w|who|id|groups|history)( |$)/i,
  // process & service queries (read-only)
  /^(ps|pgrep|pidof|kill -l)/i,
  /^(systemctl|service)\s+(status|list-units|list-unit-files|is-active|is-enabled|cat|show|get-default|--version)/i,
  /^(journalctl)\s+(?!-.*--rotate|-.*--vacuum)/i, // logs read-only
  // Network read-only
  /^(ping|traceroute|dig|nslookup|host)( |$)/i,
  /^(ss|netstat|ip\s+(addr|route|link|neigh)\s+(show|list))/i,
  // GitHub CLI extras (read + create with prompts is fine)
  /^gh (auth status|config get|api .*GET|workflow (list|view|run list|run view))/i,
  // Database read-only
  /^(psql|mysql|sqlite3)\s+.*-c\s+['"](SELECT|EXPLAIN|SHOW|DESCRIBE|DESC|\\d|\\l|\\dt) /i,
  /^(redis-cli|mongosh)\s+.*(--eval|info|ping|client list|info clients|memory usage|object|type|get|hget|hkeys|smembers|zrange|lrange|keys|exists|ttl|dbsize|--scan)/i,
  /^pg_dump/i,                                  // database read (dumping is read-only)
  /^mongodump/i,
  // Cloud read-only
  /^aws\s+(\w+\s+)+(list|describe|get|ls|cp)/i,      // aws s3 ls, aws ec2 describe-instances, etc.
  /^aws\s+(s3 ls|s3 cp|sts get-caller-identity|sts assume-role|configure list)/i,
  /^gcloud\s+(\w+\s+)+(list|describe|get|info)/i,    // gcloud compute instances list
  /^gcloud\s+(version|auth list|config list|auth print-access-token)/i,
  /^az\s+(\w+\s+)+(list|show|get)/i,                 // az vm list, az group show, etc.
  /^terraform\s+(plan|init|validate|fmt|show|state list|state show|providers|version|workspace list)/i,
  // Local script execution (./bin, ./scripts) — common dev pattern
  /^\.\/(bin|scripts|tools|tasks)\/[\w.-]+( |$)/i,
  /^(bin|scripts|tools|tasks)\/[\w.-]+( |$)/i,
];

const BLOCKLIST_PATTERNS = [
  // Destructive filesystem — literal `rm -rf <dangerous>` forms. Flag-reordered
  // and long-flag equivalents (rm -fr, rm -r -f, rm --recursive --force) are
  // caught by hasDangerousRm() which runs alongside this list in Tier 0.
  /rm -rf \/$/i,
  /rm -rf ~/i,
  /rm -rf \/\*/i,
  /rm\s+-rf\s+\.\/?(\s|$)/i,                 // `rm -rf .` / `rm -rf ./` — but NOT `rm -rf ./build`
  /rm -rf \/home/i,
  /rm -rf \/etc/i,
  /rm -rf \/usr/i,
  /rm -rf \/var/i,
  // Git destructive
  /git push.*--force[^-]/i,
  /git push.*--force$/i,
  /git push .* -f /i,
  /git push .* -f$/i,
  /git reset --hard origin/i,
  /git clean -fd/i,
  /^\s*git\s+(commit|push|merge|rebase)\b[^"']*--no-verify\b/i,  // anchored: real git invocation, not the string in a message/quote
  // Database destructive
  /DROP TABLE/i,
  /DROP DATABASE/i,
  /DELETE FROM.*WHERE\s+(1|true|1\s*=\s*1)/i,
  /TRUNCATE /i,
  // System destructive — permission/ownership changes that open or escalate.
  // Order-independent: catches 777/0777, setuid/setgid/sticky octal (4xxx/2xxx/
  // 6xxx/7xxx), symbolic setuid (u+s/+s), and world-writable symbolic (o+w/a+rwx).
  /\bchmod\s+(-[a-zA-Z]+\s+)*0?7{3}\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*[4267][0-7]{3}\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*[ugoa]*\+[a-zA-Z]*s\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*(a|o|ug?o)\+[a-zA-Z]*w/i,
  /chown.*root/i,
  /mkfs\./i,
  /dd if=.*\/dev\//i,
  // Code execution via pipe/eval
  /curl.*\| *(bash|sh|zsh)/i,
  /wget.*\| *(bash|sh|zsh)/i,
  // `eval` of a command substitution. Anchored at command position (start or after
  // whitespace) and requires `eval ` followed by `$(` — so a path like
  // forgebee/eval/golden/… plus an unrelated $(...) elsewhere is NOT a false match.
  /(?:^|\s)eval\s+[^|;&]*\$\(/i,
  // Command substitution (arbitrary execution inside $(...) or backticks)
  /\$\([^)]*rm\s/i,
  /\$\([^)]*curl\s/i,
  /\$\([^)]*wget\s/i,
  /\$\([^)]*dd\s/i,
  /\$\([^)]*chmod\s/i,
  /`[^`]*rm\s/i,
  /`[^`]*curl\s/i,
  // Sudo escalation
  /sudo rm/i,
  /sudo chmod/i,
  /sudo chown/i,
  // Package publishing
  /npm publish/i,
  /pip install.*--break-system/i,
  // Inline code execution
  /node -e /i,
  /node --eval /i,
  /python3? -c /i,
  /ruby -e /i,
  /php -r /i,
  // Environment hijacking
  /^export\s+(PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH|RUBYLIB)=/i,
  // Redirect-based persistence / privilege escalation — writing to these targets
  // is a backdoor/persistence primitive, so block outright. Broader "redirect
  // outside the project" is routed to "ask" by hasUnsafeRedirect().
  />>?\s*('|")?(~|\$\{?HOME\}?)?\/?\.ssh\/authorized_keys/i,
  />>?\s*('|")?(~|\$\{?HOME\}?)\/\.ssh\//i,
  />>?\s*('|")?\/etc\/(cron|sudoers|ssh\/|passwd|shadow|profile\.d)/i,
  // Process substitution wrapping a network/exec command (RCE / exfiltration vector).
  // Benign read-only forms — diff/comm/cat/sort/tee <(...) — are intentionally allowed.
  /[<>]\s*\(\s*(curl|wget|nc|ncat|fetch|ssh|scp|bash|sh|zsh)\b/i,
  // find with destructive actions (benign -exec cat/wc/grep falls through to "ask")
  /find\s.*-delete/i,
  /find\s.*-exec(dir)?\s+(rm|mv|dd|chmod|chown|unlink|shred|truncate|sh|bash|zsh|eval)\b/i,
];

// Sensitive paths/files: system dirs, credentials, and secret material. Used to
// reject otherwise-allowlisted mv/cp/unlink/rmdir/sed -i that touch them.
const SENSITIVE_PATH_RE = /(\/etc\b|\/usr\/|\/bin\/|\/sbin\/|\/lib\/|\/boot\/|\/sys\/|\/proc\/|\/dev\/|\/root\b|\/var\/(?!folders|tmp)|\/System\/|\/Library\/|(^|\s|=)(~|\$\{?HOME\}?)\/\.?ssh\b|\.ssh\/|id_rsa|id_ed25519|\.pem(\s|$|\b)|(^|\s|\/|=|'|")\.env(\s|$|\.|:|'|")|\.aws\b|\.npmrc\b|\/passwd\b|\/shadow\b|\bsecrets?\b|\bcredentials?\b)/i;

function touchesSensitivePath(cmd) {
  return SENSITIVE_PATH_RE.test(cmd);
}

// ── Helper functions ────────────────────────────────────────────────

function splitCommands(cmd) {
  return cmd
    .split(/\s*(?:&&|\|\||;)\s*/)
    .flatMap(part => part.split(/\s*\|\s*/))
    .map(part => part.trim())
    .filter(Boolean);
}

function isAllowlisted(cmd) {
  if (!ALLOWLIST_PATTERNS.some(pattern => pattern.test(cmd))) return false;
  // Risky verbs that match the allowlist but must NOT auto-approve when they
  // touch system dirs, credentials, or secrets — those fall through to "ask".
  if (/^(mv|cp|unlink|rmdir)\b/i.test(cmd) && touchesSensitivePath(cmd)) return false;
  if (/^sed\s+-i/i.test(cmd) && touchesSensitivePath(cmd)) return false;
  return true;
}

function isBlocklisted(cmd) {
  return BLOCKLIST_PATTERNS.some(pattern => pattern.test(cmd));
}

// Targets whose recursive+force deletion is destructive: cwd/home/root markers
// and system directories. A relative subdir like ./build is NOT dangerous.
function isDangerousRmTarget(raw) {
  const t = raw.replace(/^['"]|['"]$/g, '');
  if (['.', './', '..', '../', '~', '~/', '/', '*', '/*', '$HOME', '${HOME}', '$HOME/', '${HOME}/'].includes(t)) return true;
  if (/^~\//.test(t)) return true;                                 // ~/anything (home subtree)
  if (/^\$\{?HOME\}?\//.test(t)) return true;
  if (/^\/(etc|usr|var|lib|bin|sbin|boot|sys|dev|proc|root|home|opt|System|Library)(\/|$)/i.test(t)) return true;
  if (/^\/\*/.test(t)) return true;
  return false;
}

// Detects `rm` with BOTH recursive and force flags (any order / short or long
// form) aimed at a dangerous target — the flag-reorder bypass class that the
// literal BLOCKLIST_PATTERNS miss (rm -fr ~, rm -r -f /, rm --recursive --force /etc).
function hasDangerousRm(cmd) {
  for (const seg of cmd.split(/(?:&&|\|\||;|\|)/)) {
    const m = seg.match(/(?:^|\s)rm\s+(.+)$/i);
    if (!m) continue;
    let recursive = false;
    let force = false;
    const targets = [];
    for (const tok of m[1].trim().split(/\s+/)) {
      if (tok === '--recursive' || tok === '-R' || tok === '--dir') { recursive = true; continue; }
      if (tok === '--force') { force = true; continue; }
      if (tok === '--') continue;
      if (/^-[a-zA-Z]+$/.test(tok)) {
        if (/[rR]/.test(tok)) recursive = true;
        if (/f/.test(tok)) force = true;
        continue;
      }
      if (tok && !tok.startsWith('-')) targets.push(tok);
    }
    if (recursive && force) {
      for (const t of targets) {
        if (isDangerousRmTarget(t)) return true;
      }
    }
  }
  return false;
}

// Detects output redirects (> / >>) to targets outside the project — home
// dotfiles, ~/.ssh, system dirs, parent-escaping paths. Used to deny the
// allowlist fast-path (→ "ask") so `echo evil >> ~/.bashrc` is not silently
// approved on the strength of its leading `echo`.
function hasUnsafeRedirect(cmd) {
  const re = /(?:^|[^0-9&>])>>?\s*("?)([^\s'"|;&)]+)\1/g;
  let m;
  while ((m = re.exec(cmd)) !== null) {
    const t = m[2];
    if (!t || t.startsWith('(') || /^&?\d+$/.test(t)) continue;          // process subst / fd dup
    if (t === '/dev/null' || t === '/dev/stdout' || t === '/dev/stderr') continue;
    if (/^(~|\$\{?HOME\}?)\/\./.test(t)) return true;                    // home dotfiles (rc, config)
    if (/^(~|\$\{?HOME\}?)\/\.?ssh\b/.test(t)) return true;
    if (/^\/(etc|root|boot|sys|usr|bin|sbin|lib|opt|proc|dev|System|Library)(\/|$)/i.test(t)) return true;
    if (/^\/var\/(?!folders|tmp)/i.test(t)) return true;
    if (t.includes('../')) return true;
  }
  return false;
}

/**
 * Normalizes a command for cache key matching.
 * Preserves command verb, flags, and the basename of paths (not just `<path>`).
 * Why preserve basename: aggressive `<path>` collapse let one cache hit for
 * `rm -rf /tmp/foo` allow `rm -rf /etc` since both normalize to `rm -rf <path>`.
 * Keeping basename + dangerous-path markers fixes that.
 */
function normalizeCacheKey(cmd) {
  const parts = cmd.split(/\s+/);
  const normalized = parts.map((p) => {
    if (p.startsWith('-')) return p;                       // flag — preserve
    if (/^\d+$/.test(p)) return '<n>';                     // standalone number
    // Path normalization: preserve dangerous prefixes literally;
    // collapse safe paths to a basename-tagged shape so different
    // basenames don't collide.
    if (p.startsWith('/') || p.startsWith('./') || p.startsWith('../') || p.startsWith('~/')) {
      // Dangerous absolute prefixes — never collapse, never share cache
      if (/^\/(etc|root|sys|proc|boot|dev|var\/log|usr|bin|sbin)(\/|$)/.test(p)) return p;
      if (/^\/$/.test(p)) return p;
      // Safer: preserve basename so /tmp/a and /tmp/b don't share a cache entry
      const base = path.basename(p);
      return base ? `<path:${base}>` : '<path>';
    }
    return p.replace(/#\d+/g, '#<n>');
  });
  return normalized.join(' ');
}

/**
 * Pure decision function — no I/O, no process.exit. Returns the tier decision
 * for a command under a given permission mode. Cache lookup (default mode) is
 * layered on top by main(); it is an optimization, not a security property.
 *
 * @returns {{decision: 'deny'|'allow'|'ask'|'bypass'|'defer', reason: string}}
 */
function classify(command, mode, opts = {}) {
  const customAllowlist = opts.customAllowlist || [];

  // ── TIER 0 (BLOCKLIST) — evaluated in ALL modes ──────────────────────
  if (isBlocklisted(command) || hasDangerousRm(command)) {
    return { decision: 'deny', reason: 'Command matches dangerous pattern (Tier 0 — enforced in all modes)' };
  }
  if (/DELETE FROM/i.test(command) && !/DELETE FROM.*WHERE/i.test(command)) {
    return { decision: 'deny', reason: 'DELETE FROM without WHERE clause (Tier 0 — enforced in all modes)' };
  }

  const subcommands = splitCommands(command);
  const allowlisted =
    subcommands.length > 0 && subcommands.every(isAllowlisted) && !hasUnsafeRedirect(command);
  const customMatch = customAllowlist.length > 0 && customAllowlist.some(p => globMatch(p, command));

  if (mode === 'auto') {
    if (allowlisted) return { decision: 'allow', reason: 'Allowlisted safe command (auto mode pre-approval)' };
    if (customMatch) return { decision: 'allow', reason: 'Custom allowlist match (settings.json)' };
    return { decision: 'defer', reason: 'Unknown command — deferring to classifier' };
  }

  if (mode === 'bypassPermissions') {
    return { decision: 'bypass', reason: 'Bypass mode (Tier 0 passed)' };
  }

  // ── DEFAULT MODE ─────────────────────────────────────────────────────
  if (allowlisted) return { decision: 'allow', reason: 'Allowlisted safe command' };
  if (customMatch) return { decision: 'allow', reason: 'Custom allowlist match (settings.json)' };
  return { decision: 'ask', reason: 'Unrecognized command — requesting user approval' };
}

// ── Output helpers (I/O — used only by main) ─────────────────────────

function allow(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function ask(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  // S-007: Cache flush (must be inside main, not at module load time)
  if (process.env.FORGEBEE_FLUSH_CACHE === '1') {
    try { fs.unlinkSync(CACHE_FILE); } catch (e) { /* already gone */ }
    console.error('[permission-guard] cache flushed');
  }

  const PERMISSION_MODE = common.detectPermissionMode();
  const input = await common.readStdinJson();

  if (!input) {
    process.exit(0);
  }

  const TOOL_NAME = input.tool_name;
  const COMMAND = input.tool_input?.command;

  // Only process Bash commands
  if (TOOL_NAME !== 'Bash' || !COMMAND) {
    process.exit(0);
  }

  const CUSTOM_ALLOWLIST = loadCustomAllowlist();
  const result = classify(COMMAND, PERMISSION_MODE, { customAllowlist: CUSTOM_ALLOWLIST });

  // Tier 0 — block in every mode.
  if (result.decision === 'deny') {
    console.error(`BLOCKED: ${result.reason}`);
    process.exit(2);
  }

  // Allowlisted (auto + default) — instant approve.
  if (result.decision === 'allow') {
    allow(result.reason);
  }

  // Bypass mode — Claude Code skips the permission layer; Tier 0 already ran.
  if (result.decision === 'bypass') {
    process.exit(0);
  }

  // Auto mode unknown — defer to Claude Code's classifier (which may ask).
  if (result.decision === 'defer') {
    if (process.env.FORGEBEE_GUARD_LOG_UNKNOWN === '1') {
      try {
        const logPath = path.join(PROJECT_DIR, '.claude', 'session-cache', 'unknown-commands.log');
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        const subs = splitCommands(COMMAND);
        const which = subs.map(c => `${c}=${isAllowlisted(c) ? 'allow' : 'unknown'}`).join(' | ');
        fs.appendFileSync(logPath, `${new Date().toISOString()}\t${COMMAND}\t${which}\n`);
      } catch { /* never block on logging */ }
    }
    process.exit(0);
  }

  // ── DEFAULT MODE: result.decision === 'ask' → cache lookup, then ask ──
  // Defense against cache poisoning: Tier 0 already ran above, so a tampered
  // "allow" for a dangerous command was already blocked before reaching here.
  const CACHE_KEY = normalizeCacheKey(COMMAND);
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(cacheContent);
    const cached = cache[CACHE_KEY];

    if (cached) {
      const NOW = Math.floor(Date.now() / 1000);
      let EXPIRE_TS = 0;

      try {
        EXPIRE_TS = Math.floor(new Date(cached.expires).getTime() / 1000);
      } catch (e) {
        EXPIRE_TS = 999999999999;
      }

      if (NOW < EXPIRE_TS) {
        if (cached.decision === 'allow') {
          allow('Previously approved (cached)');
        } else if (cached.decision === 'deny') {
          console.error('BLOCKED: Previously denied command pattern (cached)');
          process.exit(2);
        }
      }
    }
  } catch (e) {
    // Ignore cache errors
  }

  ask(result.reason);
}

// ── Exports for testing — the eval suite imports these so it always
//    exercises the live patterns (no hand-copied snapshot to drift). ──
module.exports = {
  ALLOWLIST_PATTERNS,
  BLOCKLIST_PATTERNS,
  splitCommands,
  isAllowlisted,
  isBlocklisted,
  hasDangerousRm,
  hasUnsafeRedirect,
  touchesSensitivePath,
  normalizeCacheKey,
  globMatch,
  classify,
};

if (require.main === module) {
  main().catch(() => process.exit(0));
}
