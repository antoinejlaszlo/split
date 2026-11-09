from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    # Force correct types: on Windows, Python may read wrong ones from the registry.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
    }

    # Never let the browser reuse an old copy of a file after it was edited.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


print("Serving on http://localhost:8000 (Ctrl+C to stop)")
ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
