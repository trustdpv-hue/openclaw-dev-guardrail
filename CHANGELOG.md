# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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