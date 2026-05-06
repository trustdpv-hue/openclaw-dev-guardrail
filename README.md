# Dev Workflow Guardrail for OpenClaw

> OpenClaw without openclaw-dev-guardrail is like a car without brakes. This plugin integrates into your AI the basic rules of any developer: **Plan → Research → Build local → Check → Deploy.**

Created by [TrustDPV.com](https://trustdpv.com)

## Why?

Every developer knows the rules: test locally before deploying, never edit production directly, one change at a time. Yet AI models - including the best coding models - don't have these rules built in. They'll happily push untested changes straight to production because they don't *feel* the consequences.

This plugin enforces those rules at the framework level. Not as suggestions in a prompt, but as actual code that blocks dangerous commands and requires approval for production access.

## What it does

- **Blocks** direct-to-production commands (SCP, rsync, SSH with write intent)
- **Allows** read-only production commands (SSH cat, ls, systemctl status, etc.)
- **Requires approval** for unknown production commands
- **Prevents bypass** via command chaining (`&&`, `||`, `$()`, backticks, semicolons, output redirection)
- **Allows** health checks (curl/wget GET requests to production IPs)

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
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `productionIps` | `string[]` | `[]` (empty) | IP addresses of production servers to protect |
| `productionHosts` | `string[]` | `[]` (empty) | Hostnames of production servers to protect |
| `enabled` | `boolean` | `true` | Enable or disable the guardrail |

**Note:** The plugin does nothing until you configure `productionIps` or `productionHosts`. This is intentional - you must explicitly tell it what to protect.

## How it works

The plugin hooks into OpenClaw's `before_tool_call` event and inspects every `exec` and `system.run` command:

1. **Local commands** → always allowed
2. **Production commands detected** (matches your IPs/hostnames, or SSH/SCP/rsync) → checked against rules
3. **Read-only SSH** (cat, ls, status, grep, etc.) → allowed
4. **Write SSH** (rm, mv, systemctl start/stop, etc.) → **blocked**
5. **SCP/rsync** → **blocked**
6. **Command chaining** (&&, ||, $(), semicolons) → **blocked**
7. **Unknown production commands** → **require approval**

## The dev rules it enforces

1. **Never deploy to production without testing locally first** - #1 rule in software development
2. **Never edit production directly** - always make changes locally, test, then deploy
3. **If it's not tested, it's broken** - assumption is the mother of all failures
4. **Small, incremental changes** - one change at a time, deploy, verify
5. **Always have a rollback plan** - know how to undo before you do
6. **Environment pipeline: Local → Staging → Production** - never skip stages

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
```

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.