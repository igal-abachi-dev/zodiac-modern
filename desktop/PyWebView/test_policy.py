import tempfile
from pathlib import Path
import unittest
from asset_app import AssetApp, CSP

class AssetPolicyTests(unittest.TestCase):
    def test_allowlist_and_headers(self):
        with tempfile.TemporaryDirectory() as folder:
            Path(folder,"index.html").write_bytes(b"test")
            app=AssetApp(folder,{"files":[{"path":"index.html"}]})
            for method,path,host,want in [("GET","/","127.0.0.1:1234",200),
                ("GET","/missing.js","localhost:1234",404),("GET","/not.exe","localhost",403),
                ("POST","/index.html","localhost",403),("GET","/../index.html","localhost",403),
                ("GET","/index.html","evil.invalid",403)]:
                got=[]
                app({"PATH_INFO":path,"HTTP_HOST":host,"REQUEST_METHOD":method},lambda status,headers:got.extend([status,dict(headers)]))
                self.assertTrue(got[0].startswith(str(want)))
                self.assertEqual(got[1]["Content-Security-Policy"],CSP)

if __name__=="__main__": unittest.main()
