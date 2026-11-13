import base64
import io
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import api, Fault, created


class WorkspaceTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name) / "projects.db"
        with sqlite3.connect(self.path) as db:
            db.execute("CREATE TABLE projects(id TEXT PRIMARY KEY,salt BLOB,pw BLOB,files TEXT,updated REAL,revision INTEGER)")
        created.clear()
        self.token = self.request("create", "", password="secret")["token"]

    def request(self, action, token=None, **body):
        with sqlite3.connect(self.path) as db:
            return api(db, action, {"password": "secret", **body}, self.token if token is None else token)

    def test_permissions_persistence_and_conflict(self):
        self.assertRegex(self.token, r"^[A-Za-z0-9_-]{43}$")
        files = {"students/Person.java": "package students; public class Person {}"}
        self.request("save", files=files, revision=0)
        with self.assertRaises(Fault):
            self.request("save", files={}, revision=0)
        self.assertEqual(self.request("open")["files"], files)
        other = self.request("create", "")["token"]
        self.assertEqual(self.request("open", other)["files"], {})
        for action in ("open","save","compile","runtime","export","delete"):
            with self.subTest(action=action), self.assertRaises(Fault):
                self.request(action, password="wrong")
        self.request("password", newPassword="changed")
        with self.assertRaises(Fault):
            self.request("open")
        self.request("delete", password="changed")
        with self.assertRaises(Fault):
            self.request("open", password="changed")

    def test_archive_round_trip_and_rejection(self):
        files = {"A.java": "class A {}", "school/model/B.java": "package school.model; class B {}"}
        self.request("save", files=files, revision=0)
        archive = self.request("export", layout={"A.java": [97, 83]})["archive"]
        with zipfile.ZipFile(io.BytesIO(base64.b64decode(archive))) as exported:
            root = exported.read("package.bluej").decode()
            self.assertIn("target1.x=97", root)
            self.assertIn("target2.type=PackageTarget", root)
            self.assertIn(b"target1.name=model", exported.read("school/package.bluej"))
            self.assertIn(b"target1.name=B", exported.read("school/model/package.bluej"))
        self.request("import", archive=archive, revision=1)
        for path, size in (("../bad.java", 1), ("/absolute.java", 1), ("Large.java", 1100000)):
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr(path, "x"*size)
            with self.assertRaises(Fault):
                self.request("import", archive=base64.b64encode(stream.getvalue()).decode(),revision=2)
        self.assertEqual(self.request("open")["files"], files)
