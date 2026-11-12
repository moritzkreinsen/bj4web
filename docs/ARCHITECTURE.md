# Local prototype architecture

The browser loads same-origin HTML, CSS and JavaScript. The workspace secret stays in the URL fragment and travels to the loopback server in the Authorization header. The frontend serializes actions and debounces saves. An optimistic revision check detects concurrent edits. Selecting a compiled source shows public call signatures, superclass, interfaces and reference field types.

Python's standard HTTP and SQLite libraries keep the prototype runnable without downloading a frontend or backend framework. SQLite stores one transactionally updated source tree per workspace. Only source files persist. A compilation creates a temporary package tree, invokes javac with annotation processing disabled, then starts a Java worker. Each runtime has its own classpath, heap and unmodified BlueJ BJMap. The worker resolves constructors and methods by exact reflected signature. Named arguments resolve in that worker's registry.

The HTTP interface uses POST /api/v1/{action} with JSON. Worker requests use newline-delimited base64 fields over private pipes. Output is captured for each synchronous invocation. The backend currently serializes operations across workspaces. Recompiling replaces the runtime and clears its bench. Inactivity closes a runtime after approximately ten minutes. A browser reopening a workspace can reconnect to the current bench.

SwingBridge walks a returned JInternalFrame on the Swing event dispatch thread. Labels and buttons become structured type/id/text records. Browser button events invoke JButton.doClick on the EDT, followed by a new snapshot. Closing the browser panel closes the internal frame. The example is webide/examples/CounterWindow.java. Compile it, invoke create(), name the return value, and select it on the bench. Only this lightweight window model and explicit refreshes are implemented.

Next transport work includes versioned WebSocket events, correlated asynchronous output, independent per-workspace queues, runtime generation checks and a worker supervisor outside the application host. See the repository audit for extraction points in the desktop runtime.
