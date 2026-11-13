# Local development security

Run only trusted code, on a single-user development machine. Java runs with the developer's OS permissions. A separate JVM and heap flag do not prevent filesystem, process or network access. Password protection restricts the HTTP API. It cannot isolate a malicious Java program from the database, other projects or the host.

The backend binds IPv4 loopback, validates Host and browser Origin, requires JSON for mutations, suppresses access logging and serves a restrictive same-origin CSP. Workspace identifiers are SHA-256 digests of 256-bit random secrets. Passwords use independently salted scrypt. Source and metadata are plaintext on disk. Secrets in fragments stay out of HTTP request URLs but are visible in local browser history. There is no recovery service. The SQLite database is created outside the checkout with a restrictive process umask. Explicit deletion removes active project records; backups and filesystem remnants require operator handling.

Operational bounds include source and archive limits, active runtime and workspace creation limits, idle cleanup, javac and synchronous request timeouts. They do not enforce host CPU, process, disk, outbound network or global storage limits. The synchronous pipes and global request lock are unsuitable for hostile workloads.

## Deployment work outstanding

Keep the prototype off public networks. A Linux deployment needs a separate worker supervisor and a hardened execution sandbox, for example gVisor with a read-only root, temporary writable quota, no host mounts, no network and per-worker cgroups, PID and file-descriptor limits. Compile inside the sandbox too. Strip credentials, block metadata endpoints and rotate ephemeral workers. Validate memory and process exhaustion, infinite loops, filesystem and network escape, credential access and cross-workspace attempts on disposable infrastructure before accepting untrusted projects.

Terminate TLS at a reverse proxy configured for upgraded WebSocket connections and token-free logs. Keep the API and database inaccessible to workers. Back up SQLite using the online backup API and verify restoration. Scale workers separately with measured admission limits. An 8-vCPU, 32-GB host requires load tests before establishing capacity. No production deployment or hardened sandbox is supplied.
