# Desktop and web feature parity

| Capability | Status | Scope |
|---|---|---|
| Anonymous projects and passwords | Implemented | Browser creation, reopening and server checks. Password changes and workspace deletion supported. |
| Persistent source editing | Implemented | Multiple package-relative Java files, revision checks, autosave, manual save. |
| Rename and delete | Partially implemented | File operations only. Symbol references and package declarations require manual changes. |
| ZIP exchange | Partially implemented | Java sources only. Other BlueJ resources and diagram positions do not round-trip. |
| Compilation | Implemented | Real javac, text diagnostics, synchronous output. |
| Class diagram | Partially implemented | Selectable class tiles and reflected relationships for the selected compiled type. No draggable graph or complete source dependency analysis. |
| Object bench | Implemented | Named live instances, exact public overloads, static and instance invocation, object-reference arguments. |
| Object inspection | Partially implemented | Accessible inherited and declared fields, primitive/string parameters, null and existing references. No recursive array or collection explorer. |
| Console | Partially implemented | Synchronous stdout/stderr and exception traces. Interactive stdin and asynchronous output pending. |
| Swing | Experimental | JInternalFrame, JLabel and JButton, EDT listeners, close and refresh. |
| JavaFX, arbitrary native windows, painting | Unsupported | No scene graph adapter or graphics recorder. |
| Debugger | Unsupported | JDI breakpoints, stepping, stack frames and local inspection pending. |
| Stride and Kotlin | Unsupported | Desktop modules remain available in the fork. |
| German and English | Partially implemented | Browser catalog, manual language selection, localized controls. Raw compiler and runtime messages pass through. |
| Public multi-tenant execution | Blocked | Requires OS isolation, abuse controls and adversarial validation. |
