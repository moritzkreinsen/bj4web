# Repository audit

Baseline c05b2fff2, 2026-11-12. The Gradle root includes BlueJ, Greenfoot, boot, Stride and two thread-checking modules. Desktop packaging lives under bluej/package and greenfoot. Existing installer and build/test workflows exercise desktop deliverables. BlueJ includes JavaFX 23.0.2, bundled libraries, examples, icons, translations and platform packaging. Preserve desktop builds separately.

| Area | Headless boundary |
| --- | --- |
| bluej.compiler.CompilerAPICompiler | Uses javax.tools with BlueJ configuration and diagnostic types. A worker can use the same JDK compiler independently. |
| bluej.pkgmgr.Package and targets | Own project targets and dependency edges, but also dispatch to the FX platform. Export a diagram data model before sharing the view. |
| bluej.debugger.jdi.JdiDebugger | Controls a separate VM using JDI. Depends on Project, Invoker and FX scheduling. Extract transport and pause-state handling before browser debugging. |
| bluej.debugmgr.Invoker and testmgr.record | Generate invocation shells and preserve invocation records. Desktop dialogs, compiler observers and class loaders couple execution to desktop lifecycle. |
| bluej.runtime.Shell and ExecServer | Generated shells refer to named bench scopes. Reuse the unmodified runtime BJMap inside a persistent workspace JVM. Reflection can dispatch explicitly selected public signatures there. |
| ObjectBench and DebuggerObject | The bench uses FX TilePane and PkgMgrFrame. DebuggerObject models debugger-side fields and types. Browser inspection needs bounded values and handles. |
| bluej.parser and bluej.views | Parser contexts and type representations are candidates for dependency analysis. View also imports Project. |
| Localization and assets | Desktop resources are separate from browser labels. Retain upstream notices and avoid bundling desktop art or JARs into the web UI. |

Dataflow reference checkout a5ac3d9 creates base64url links from 24 random bytes, validates tokens before filesystem access and supports configurable external storage. Its browser app selects languages from browser preferences and encrypts project payloads using PBKDF2 and AES-GCM. Adopt high-entropy share links and external storage. Use a fragment for the browser secret, a digest as the database key and server-side password checks for every execution request. Java compilation requires plaintext.

Implement the loopback shell, transactional workspace storage, compilation and live invocation first. Then exercise browser persistence and access checks, add GUI synchronization and extend JDI. Public execution requires an independently hardened worker boundary. Kernel isolation, cross-workspace access, arbitrary code resource use, reflection compatibility and license provenance of bundled assets are principal risks.
