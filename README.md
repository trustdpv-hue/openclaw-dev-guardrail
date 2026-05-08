# Dev Workflow Guardrail for OpenClaw

> OpenClaw without openclaw-dev-guardrail is like a car without brakes. This plugin integrates into your AI the basic rules of any developer: **Plan → Research → Build local → Check → Deploy.**

Created by [TrustDPV.com](https://trustdpv.com)

## Why?

Every developer knows the rules: test locally before deploying, never edit production directly, one change at a time. Yet AI models - including the best coding models - don't have these rules built in. They'll happily push untested changes straight to production because they don't *feel* the consequences.

This plugin enforces those rules at the framework level. Not as suggestions in a prompt, but as actual code that blocks dangerous commands and requires approval for production access.

## What it does

The guardrail enforces four security levels for production-targeting commands:

| Level | Name | What happens |
|-------|------|-------------|
| 1 | **Block** | Hard-blocked, no override. SCP, rsync, command chaining, output redirection, semicolons |
| 2 | **Allow** | Passes through automatically. Read-only SSH commands, health check curls |
| 3 | **Allowlist** | User-defined trusted commands pass automatically. Configured via `sshAllowlist` |
| 4 | **Require Approval** | Prompts for human approval. Everything else not matched above |

## Requirements

- OpenClaw >= 2026.5.5
- Node.js >= 22

## Installation

```bash
openclaw plugins install openclaw-dev-guardrail
```

Or install from a local path:

```bash
openclaw plugins install /path/to/openclaw-dev-guardrail
```

## Configuration

After installing, configure your production servers in your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "openclaw-dev-guardrail": {
        "enabled": true,
        "config": {
          "productionIps": ["192.168.1.100", "10.0.0.5"],
          "productionHosts": ["prod.example.com", "api.example.com"],
          "sshAllowlist": [
            "systemctl restart nginx",
            "systemctl restart *",
            "docker ps",
            "docker logs *"
          ],
          "enabled": true
        }
      }
    }
  }
}
```

Or via CLI:

```bash
openclaw config set plugins.entries.openclaw-dev-guardrail.config.productionIps '["192.168.1.100"]'
openclaw config set plugins.entries.openclaw-dev-guardrail.config.productionHosts '["prod.example.com"]'
openclaw config set plugins.entries.openclaw-dev-guardrail.config.sshAllowlist '["systemctl restart nginx", "docker ps"]'
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `productionIps` | `string[]` | `[]` (empty) | IP addresses of production servers to protect |
| `productionHosts` | `string[]` | `[]` (empty) | Hostnames of production servers to protect |
| `sshAllowlist` | `string[]` | `[]` (empty) | SSH command patterns that bypass approval (supports `*` and `?` wildcards) |
| `enabled` | `boolean` | `true` | Enable or disable the guardrail |

**Note:** The plugin does nothing until you configure `productionIps` or `productionHosts`. This is intentional — you must explicitly tell it what to protect.

### SSH Allowlist Patterns

The `sshAllowlist` config uses simple glob-like wildcards:

- `*` matches any sequence of characters
- `?` matches any single character
- All other characters are matched literally
- Matching is case-insensitive

Examples:

| Pattern | Matches |
|---------|---------|
| `systemctl restart nginx` | Exact command only |
| `systemctl restart *` | Any systemctl restart command |
| `docker ps` | Exact command |
| `docker logs *` | Any docker logs command |
| `supervisorctl restart *` | Any supervisorctl restart |

## How it works

The plugin hooks into OpenClaw's `before_tool_call` event and inspects every `exec` and `system.run` command:

1. **Local commands** → always allowed
2. **Production commands detected** (matches your IPs/hostnames, or SSH/SCP/rsync) → checked against rules
3. **Level 1 — Block**: SCP, rsync (without --dry-run), command chaining, output redirection, semicolons
4. **Level 2 — Allow**: Read-only SSH (cat, ls, status, grep, etc.), safe HTTP requests (curl/wget GET)
5. **Level 3 — Allowlist**: SSH commands matching your `sshAllowlist` patterns pass through
6. **Level 4 — Require Approval**: Everything else needs human approval

## The dev rules it enforces

1. **Never deploy to production without testing locally first** — #1 rule in software development
2. **Never edit production directly** — always make changes locally, test, then deploy
3. **If it's not tested, it's broken** — assumption is the mother of all failures
4. **Small, incremental changes** — one change at a time, deploy, verify
5. **Always have a rollback plan** — know how to undo before you do
6. **Environment pipeline: Local → Staging → Production** — never skip stages

## Example blocks

```bash
# BLOCKED: SCP to production
scp file.txt root@192.168.1.100:/var/www/

# BLOCKED: SSH with write intent
ssh root@192.168.1.100 "systemctl restart nginx"

# BLOCKED: Command chaining bypass
ssh root@192.168.1.100 "cat /etc/passwd && rm -rf /"

# ALLOWED: Read-only SSH
ssh root@192.168.1.100 "systemctl status nginx"

# ALLOWED: Health check
curl http://192.168.1.100:3000/health

# ALLOWLIST: Trusted command bypasses approval
# (with sshAllowlist: ["systemctl restart nginx"])
ssh root@192.168.1.100 "systemctl restart nginx"
```

## Changelog

### v1.1.0
- Added `sshAllowlist` config option (Level 3: user-defined trusted commands)
- Added glob-like wildcard pattern matching (`*` and `?`)
- Added clear level comments in source code (Block → Allow → Allowlist → Require Approval)
- Updated plugin config schema with `sshAllowlist`

### v1.0.0
- Initial release
- Block: SCP, rsync, command chaining, output redirection, semicolons
- Allow: read-only SSH, health check curls
- Require Approval: everything else

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.