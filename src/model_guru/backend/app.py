from .core import create_app
from .router import router

# Import routers to register their routes on the singleton
from .routers import parse, discover, mapping, generate, deploy  # noqa: F401

app = create_app(routers=[router])
