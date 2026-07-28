const http = require("http");

const server = http.createServer((request, response) => {
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: 8000,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host: "localhost:8000" },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", (error) => {
    response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Upstream server error: ${error.message}`);
  });

  request.pipe(upstream);
});

server.listen(9000, "0.0.0.0");
