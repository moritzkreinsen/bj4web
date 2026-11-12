"""Loopback-only BJ4Web development server for trusted Java projects."""
import atexit
import base64
import hashlib
import hmac
import io
import json
import os
from pathlib import Path
import re
import secrets
import select
import shutil
import signal
import sqlite3
import subprocess
import tempfile
import threading
import time
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
STORE = Path(os.environ.get("BJ4WEB_STORAGE", Path.home() / ".local/share/bj4web")).resolve()
JAVA = Path(os.environ["JAVA_HOME"]) / "bin"
sessions = {}
lock = threading.RLock()
filename = re.compile(r"(?:[A-Za-z_$][\w$]*/)*[A-Za-z_$][\w$]*\.java", re.ASCII)
build = None
created = []


class Fault(Exception):
    def __init__(self, code, key):
        self.code, self.key = code, key


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(value, salt):
    return hashlib.scrypt(value.encode(), salt=salt, n=2**15, r=8, p=1, maxmem=64 << 20)


def validate(files):
    if not isinstance(files, dict) or len(files) > 100 or any(
        not filename.fullmatch(k) or len(k) > 240 or not isinstance(v, str) for k, v in files.items()
    ) or sum(len(v.encode()) for v in files.values()) > 512000:
        raise Fault(400, "invalid")


def stop(key):
    session = sessions.pop(key, None)
    if session:
        process, folder, _ = session
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
        process.stdin.close()
        process.stdout.close()
        folder.cleanup()


def compile_project(key, files):
    stop(key)
    if not files:
        raise Fault(400, "empty")
    if len(sessions) >= 8:
        raise Fault(429, "capacity")
    folder = tempfile.TemporaryDirectory(prefix="bj4web-project-")
    path = Path(folder.name)
    try:
        for name, source in files.items():
            target = path / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(source, encoding="utf8")
        classes = path / ".classes"
        classes.mkdir()
        result = subprocess.run([JAVA / "javac", "-proc:none", "-encoding", "UTF-8", "-d", classes, *files],
                                cwd=path, capture_output=True, timeout=25)
        if result.returncode:
            folder.cleanup()
            return {"ok": False, "console": result.stderr.decode(errors="replace")}
        process = subprocess.Popen([JAVA / "java", "-Xmx96m", "-Djava.awt.headless=true", "-cp", os.pathsep.join([build.name, str(classes)]),
                                    "Worker"], cwd=path, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.DEVNULL, start_new_session=True)
        sessions[key] = [process, folder, time.monotonic()]
        return {"ok": True}
    except BaseException:
        folder.cleanup()
        raise


def runtime(key, parts):
    if key not in sessions:
        raise Fault(409, "compileFirst")
    if not isinstance(parts, list) or not parts or parts[0] not in (
        "objects", "class", "methods", "bench", "fields", "invoke", "remove", "gui", "click", "close", "relations"
    ) or not all(isinstance(item, str) for item in parts):
        raise Fault(400, "invalid")
    process = sessions[key][0]
    sessions[key][2] = time.monotonic()
    try:
        process.stdin.write(b"\t".join(base64.b64encode(p.encode()) for p in parts) + b"\n")
        process.stdin.flush()
        if not select.select([process.stdout], [], [], 8)[0]:
            raise TimeoutError()
        status, value, console = process.stdout.readline(2 << 20).rstrip(b"\n").split(b"\t")
        return {"ok": status == b"ok", "value": base64.b64decode(value).decode(errors="replace"),
                "console": base64.b64decode(console).decode(errors="replace")}
    except (OSError, ValueError, TimeoutError):
        stop(key)
        raise Fault(409, "stopped")


def api(db, action, data, token):
    password = data.get("password", "")
    if not isinstance(password, str) or len(password) > 256:
        raise Fault(400, "invalid")
    if action == "create":
        now = time.monotonic()
        created[:] = [t for t in created if now - t < 60]
        if len(created) >= 20:
            raise Fault(429, "capacity")
        created.append(now)
        token = secrets.token_urlsafe(32)
        salt = secrets.token_bytes(16)
        db.execute("INSERT INTO projects VALUES(?,?,?,?,?,0)", (digest(token), salt,
                   password_hash(password, salt) if password else None, "{}", time.time()))
        return {"token": token}
    key = digest(token)
    row = db.execute("SELECT salt,pw,files,revision FROM projects WHERE id=?", (key,)).fetchone()
    if not row or (row[1] and not hmac.compare_digest(password_hash(password, row[0]), row[1])):
        raise Fault(403, "denied")
    files = json.loads(row[2])
    if action == "open":
        return {"files": files, "revision": row[3], "running": key in sessions}
    if action == "save":
        files = data["files"]
        validate(files)
        if row[3] != data.get("revision"):
            raise Fault(409, "conflict")
        db.execute("UPDATE projects SET files=?,revision=revision+1,updated=? WHERE id=?",
                   (json.dumps(files), time.time(), key))
        return {"revision": row[3]+1}
    if action == "import":
        try:
            raw = base64.b64decode(data["archive"], validate=True)
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                entries = archive.infolist()
                if len(entries) > 200 or sum(item.file_size for item in entries) > 1048576:
                    raise Fault(400, "invalid")
                imported = {}
                for item in entries:
                    path = Path(item.filename)
                    if path.is_absolute() or ".." in path.parts or (item.external_attr >> 16) & 0o170000 == 0o120000:
                        raise Fault(400, "invalid")
                    if item.filename.endswith(".java"):
                        if item.filename in imported:
                            raise Fault(400, "invalid")
                        imported[item.filename] = archive.read(item).decode("utf8")
                # A desktop ZIP often wraps the project in one directory. Keep package subdirectories.
                roots = [Path(entry.filename).parent for entry in entries
                         if Path(entry.filename).name == "package.bluej"]
                if imported and roots:
                    root = min(roots, key=lambda path: len(path.parts))
                    if all(Path(name).is_relative_to(root) for name in imported):
                        imported = {str(Path(name).relative_to(root)): source for name, source in imported.items()}
                validate(imported)
                if not imported:
                    raise Fault(400, "empty")
        except (zipfile.BadZipFile, RuntimeError, NotImplementedError, UnicodeError, OSError):
            raise Fault(400, "invalid")
        return api(db, "save", dict(data, files=imported), token)
    if action == "password":
        new_password = data["newPassword"]
        if not isinstance(new_password, str) or len(new_password) > 256:
            raise Fault(400, "invalid")
        salt = secrets.token_bytes(16)
        db.execute("UPDATE projects SET salt=?,pw=? WHERE id=?", (salt,
                   password_hash(new_password,salt) if new_password else None,key))
        return {}
    if action == "compile":
        return compile_project(key, files)
    if action == "runtime":
        return runtime(key, data["parts"])
    if action == "stop":
        stop(key)
        return {}
    if action == "export":
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, source in files.items():
                archive.writestr(name, source)
        return {"archive": base64.b64encode(buf.getvalue()).decode()}
    if action == "delete":
        stop(key)
        db.execute("DELETE FROM projects WHERE id=?", (key,))
        return {}
    raise Fault(404, "invalid")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, status, mime, payload):
        self.send_response(status)
        for key, value in {"Content-Type": mime, "Content-Length": str(len(payload)),
                           "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
                           "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff",
                           "Content-Security-Policy": "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"}.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def valid_host(self):
        return self.headers.get("Host") in {f"{host}:{self.server.server_port}" for host in ("localhost","127.0.0.1")}

    def do_GET(self):
        assets = {"/": ("index.html","text/html"), "/app.js": ("app.js","text/javascript"),
                  "/style.css": ("style.css","text/css")}
        if not self.valid_host() or self.path not in assets:
            return self.send(404, "text/plain", b"")
        name, mime = assets[self.path]
        self.send(200, mime+"; charset=utf-8", (ROOT/"public"/name).read_bytes())

    def do_POST(self):
        try:
            if not self.valid_host() or self.headers.get("Origin", "http://"+self.headers["Host"]) != "http://"+self.headers["Host"]:
                raise Fault(403, "denied")
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 4 << 20 or self.headers.get("Content-Type") != "application/json":
                raise Fault(400, "invalid")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data,dict) or not self.path.startswith("/api/v1/"):
                raise Fault(400, "invalid")
            with lock, sqlite3.connect(STORE/"projects.db") as db:
                result = api(db, self.path[8:], data, self.headers.get("Authorization","").removeprefix("Bearer "))
            code = 200
        except Fault as exc:
            code, result = exc.code, {"error": exc.key}
        except (KeyError, ValueError, TypeError):
            code, result = 400, {"error": "invalid"}
        except subprocess.TimeoutExpired:
            code, result = 408, {"error": "stopped"}
        self.send(code, "application/json", json.dumps(result).encode())


def reap():
    while True:
        time.sleep(30)
        with lock:
            for key in list(sessions):
                if time.monotonic()-sessions[key][2] > 600:
                    stop(key)


if __name__ == "__main__":
    os.umask(0o077)
    if STORE.is_relative_to(ROOT.parent):
        raise SystemExit("Select storage outside the checkout.")
    STORE.mkdir(parents=True, exist_ok=True)
    build = tempfile.TemporaryDirectory(prefix="bj4web-worker-")
    subprocess.run([JAVA/"javac", "-d", build.name, ROOT/"Worker.java", ROOT/"SwingBridge.java",
                    ROOT.parent/"bluej/src/main/java/bluej/runtime/BJMap.java"], check=True)
    with sqlite3.connect(STORE/"projects.db") as db:
        db.execute("CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,salt BLOB,pw BLOB,files TEXT,updated REAL,revision INTEGER)")
    server = ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("BJ4WEB_PORT","8074"))), Handler)
    atexit.register(lambda: [stop(k) for k in list(sessions)])
    signal.signal(signal.SIGTERM, lambda *_: exit(0))
    threading.Thread(target=reap, daemon=True).start()
    print(f"Trusted local projects only. http://127.0.0.1:{server.server_port}", flush=True)
    server.serve_forever()
