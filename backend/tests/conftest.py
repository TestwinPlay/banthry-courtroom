import os

# Tests exercise endpoints directly; the Firebase check gets its own test in test_api.py.
os.environ.setdefault("REQUIRE_AUTH", "FALSE")
