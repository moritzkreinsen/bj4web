# Development status

Baseline c05b2fff2. Local prototype verified on 2026-11-12 with Homebrew OpenJDK 21 and headless Microsoft Edge through Playwright. The browser suite created a password-protected workspace, compiled a class, created an object, invoked methods, observed changed private state and stdout, passed an object reference, reopened saved code after refresh and in another browser context, switched language and downloaded a ZIP. The Swing example received a button click on the EDT, updated a label and closed. Two storage tests exercised revision conflicts, password changes and deletion, independent projects, ZIP round-trip and invalid archives.

The public security boundary, JavaFX and JDI debugger remain outstanding. See FEATURE_PARITY.md and SECURITY.md. Known limitations include synchronous invocation, incomplete diagram semantics, manual rename refactoring and lack of support for arbitrary GUI programs. The next steps are sandboxed compilation/execution, asynchronous transport and JDI extraction. Upstream desktop tests and hostile-code isolation tests were not run for this milestone.

The revised project window follows the upstream package manager palette and proportions. Browser tests verify both relationship arrows in the sample, drag persistence after reload, double-click editing and constructor selection from a class context menu.

Classroom ZIP import was verified with the test-only Shapes project. The browser created three distinct Circle objects, selected one by its bench name, and checked rendered pixels after visibility, movement and color changes. The normal start screen opens user-provided ZIPs.

Compared the open desktop Shapes project with the web interaction on 2026-11-12. Constructors lead the class menu. The construction dialog selects a proposed bench name and accepts Enter. Instance menus expose typed Java signatures and inherited members. Zero-argument void calls run directly. Parameterized calls expose individual fields. Double-clicking an instance inspects it. Stride conversion and test-class generation remain unavailable in the browser.
