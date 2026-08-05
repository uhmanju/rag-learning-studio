"""Minimal stand-in for fastapi, for offline verification only."""


class HTTPException(Exception):
    def __init__(self, status_code=500, detail=""):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"{status_code}: {detail}")


class status:
    HTTP_201_CREATED = 201


class UploadFile:
    def __init__(self, filename, content: bytes):
        self.filename = filename
        self._content = content

    async def read(self):
        return self._content


def File(default=...):
    return default


class _Route:
    def __init__(self, path):
        self.path = path

    def __call__(self, fn):
        fn._route_path = self.path
        return fn


class FastAPI:
    def __init__(self, title=""):
        self.title = title
        self.routes = {}

    def add_middleware(self, *args, **kwargs):
        pass

    def post(self, path, status_code=None):
        return _Route(path)

    def get(self, path):
        return _Route(path)
