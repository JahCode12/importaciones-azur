import json, sys, urllib.request, urllib.error

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
BASE = "https://jahcode.app.n8n.cloud/webhook/"


def post(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
                                 headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=150) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8") or "{}")


if __name__ == "__main__":
    path = sys.argv[1]
    for body in json.load(open(sys.argv[2], encoding="utf-8")):
        label = body.pop("_label", "")
        status, res = post(path, body)
        res.pop("whatsappUrl", None) if "--short" in sys.argv else None
        print(f"{label}: HTTP {status} {json.dumps(res, ensure_ascii=False)}", flush=True)
