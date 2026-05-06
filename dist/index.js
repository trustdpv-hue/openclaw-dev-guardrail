import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
const GUARDRAIL_REASON = "🛑 Dev Workflow Guardrail: Blocked direct production command. Follow the workflow: Modify locally → Check → Get approval → Deploy.";
const DEPLOY_SUGGESTION = "If you need to deploy, first make changes locally, test them, then get approval before deploying to production.";
const DANGEROUS_CHAINING = [
    /&&/,
    /\|\|/,
    /\$\(/,
    /`/,
];
export default definePluginEntry({
    id: "openclaw-dev-guardrail",
    name: "Dev Workflow Guardrail",
    description: "OpenClaw without openclaw-dev-guardrail is like a car without brakes. This plugin integrates into your AI the basic rules of any developer: Plan → Research → Build local → Check → Deploy.",
    register(api) {
        const config = (api.pluginConfig ?? {});
        api.on("before_tool_call", async (event) => {
            // Only intercept exec and system.run tool calls
            if (event.toolName !== "exec" && event.toolName !== "system.run") {
                return;
            }
            // Check if guardrail is enabled (default: true)
            if (config.enabled === false) {
                return;
            }
            // Production IPs and hosts MUST be configured - no defaults
            const productionIps = config.productionIps ?? [];
            const productionHosts = config.productionHosts ?? [];
            // If no production targets configured, skip guardrail
            if (productionIps.length === 0 && productionHosts.length === 0) {
                return;
            }
            // Safely get command string
            const command = event.params?.command;
            const rawCommand = event.params?.rawCommand;
            const fullCommand = String((typeof command === "string" && command) ||
                (typeof rawCommand === "string" && rawCommand) ||
                "");
            if (!fullCommand) {
                return;
            }
            // Check if command targets a production server
            const targetsProduction = /\bssh\b/.test(fullCommand) ||
                /\bscp\b/.test(fullCommand) ||
                /\brsync\b/.test(fullCommand) ||
                productionIps.some((ip) => fullCommand.includes(ip)) ||
                productionHosts.some((host) => {
                    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const hostRegex = new RegExp(`(?:@|\\s|/)${escaped}\\b`, "i");
                    return hostRegex.test(fullCommand);
                });
            if (!targetsProduction) {
                return;
            }
            // SCP is always a write operation - block it
            if (/\bscp\b/.test(fullCommand)) {
                return {
                    block: true,
                    blockReason: `${GUARDRAIL_REASON}\n\nCommand: ${fullCommand.substring(0, 200)}\n\n${DEPLOY_SUGGESTION}`,
                };
            }
            // rsync without --dry-run is a write - block it
            if (/\brsync\b/.test(fullCommand) && !/--dry-run/.test(fullCommand)) {
                return {
                    block: true,
                    blockReason: `${GUARDRAIL_REASON}\n\nCommand: ${fullCommand.substring(0, 200)}\n\n${DEPLOY_SUGGESTION}`,
                };
            }
            // For non-SSH commands targeting production IP (e.g. curl health checks)
            const isNonSshCommand = !/\bssh\b/.test(fullCommand);
            if (isNonSshCommand) {
                // Allow curl/wget GET requests (health checks, status pages)
                const isSafeHttpRequest = /\bcurl\b/.test(fullCommand) &&
                    !/\b(-X\s+(POST|PUT|DELETE|PATCH)|--data|--upload|-d\s)/.test(fullCommand);
                const isSafeWgetRequest = /\bwget\b/.test(fullCommand) && /\b(--spider|-q)\b/.test(fullCommand);
                if (isSafeHttpRequest || isSafeWgetRequest) {
                    return;
                }
                // For other non-SSH commands to production IP, require approval
                return {
                    requireApproval: {
                        title: "Production server command",
                        description: `Command targets production server: ${fullCommand.substring(0, 150)}`,
                        severity: "warning",
                        timeoutMs: 120_000,
                        timeoutBehavior: "deny",
                    },
                };
            }
            // SSH commands from here on
            // Block dangerous command chaining (&&, ||, $(), backticks)
            const hasDangerousChaining = DANGEROUS_CHAINING.some((p) => p.test(fullCommand));
            if (hasDangerousChaining) {
                return {
                    block: true,
                    blockReason: `${GUARDRAIL_REASON}\n\nCommand contains chaining (&&, ||, or substitution) which could bypass read-only checks.\n\n${DEPLOY_SUGGESTION}`,
                };
            }
            // Block output redirection (>, >>) - could overwrite remote files
            // Allow 2>> (stderr redirect, which is local-only)
            const hasWriteRedirect = /\b(>>?)\b/.test(fullCommand) && !/\b2>>/.test(fullCommand);
            if (hasWriteRedirect) {
                return {
                    block: true,
                    blockReason: `${GUARDRAIL_REASON}\n\nCommand contains output redirection (>) which could modify files.\n\n${DEPLOY_SUGGESTION}`,
                };
            }
            // Block semicolons in SSH commands (could chain arbitrary commands)
            if (/;/.test(fullCommand)) {
                return {
                    block: true,
                    blockReason: `${GUARDRAIL_REASON}\n\nCommand contains semicolons which could chain additional commands.\n\n${DEPLOY_SUGGESTION}`,
                };
            }
            // Define what counts as read-only for SSH
            const sshReadOnlyCommands = [
                /\bssh\b.*\bcat\b/i,
                /\bssh\b.*\bls\b/i,
                /\bssh\b.*\bstatus\b/i,
                /\bssh\b.*\bhead\b/i,
                /\bssh\b.*\btail\b/i,
                /\bssh\b.*\bgrep\b/i,
                /\bssh\b.*\bfind\b/i,
                /\bssh\b.*\bstat\b/i,
                /\bssh\b.*\bwc\b/i,
                /\bssh\b.*\bdu\b/i,
                /\bssh\b.*\bdf\b/i,
                /\bssh\b.*\bping\b/i,
                /\bssh\b.*\bsystemctl\s+status\b/i,
                /\bssh\b.*\bjournalctl\b/i,
                /\bssh\b.*\bnginx\s+-t\b/i,
                /\bssh\b.*\bnginx\s+-T\b/i,
                /\bssh\b.*\bcurl\b.*\b(localhost|127\.0\.0\.1)\b/i,
            ];
            const isSshReadOnly = sshReadOnlyCommands.some((pattern) => pattern.test(fullCommand));
            // If read-only SSH command, allow
            if (isSshReadOnly) {
                return;
            }
            // Block everything else - require approval
            return {
                requireApproval: {
                    title: "Production SSH command blocked",
                    description: `SSH command to production is not recognized as read-only: ${fullCommand.substring(0, 150)}`,
                    severity: "warning",
                    timeoutMs: 120_000,
                    timeoutBehavior: "deny",
                },
            };
        }, { priority: 90 });
    },
});
//# sourceMappingURL=index.js.map