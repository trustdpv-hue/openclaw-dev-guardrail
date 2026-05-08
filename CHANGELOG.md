# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-08

### Added
- `sshAllowlist` config option — user-defined SSH command patterns that bypass approval (Level 3)
- Glob-like wildcard pattern matching (`*` for any chars, `?` for single char)
- Clear level comments in source: Block → Allow → Allowlist → Require Approval

### Changed
- Existing `productionIps` and `productionHosts` settings are preserved — updating does not clear previous config
- `sshAllowlist` is optional and defaults to empty (same behavior as v1.0.0 when not configured)

## [1.0.0] - 2026-05-06

### Added
- Initial release
- Blocks direct-to-production commands (SCP, rsync, SSH with write intent)
- Allows read-only production commands (SSH cat, ls, status, grep, etc.)
- Requires approval for unknown production commands
- Prevents bypass via command chaining (&&, ||, $(), backticks, semicolons)
- Prevents bypass via output redirection (>, >>)
- Allows health checks (curl/wget GET requests)
- Configurable production IPs and hostnames
- Enable/disable toggle