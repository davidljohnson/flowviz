# Security Policy

## Reporting a vulnerability

Please report security issues privately, through GitHub's
[private vulnerability reporting](https://github.com/davidljohnson/flowviz/security/advisories/new)
— the **Security** tab, then **Report a vulnerability**. That keeps the report
between us until there is a fix, and needs no email address on either side.

Please don't open a public issue for a security problem.

FlowViz is maintained by one person in their own time. You should get an
acknowledgement within a week. A fix depends on what it is: something reachable
by anyone running the server gets attention immediately, something needing an
unusual configuration may take longer. If you have not heard back in two weeks,
assume the report was missed and ping the same thread.

There is no bounty programme. Credit in the release notes if you would like it,
and not if you would rather stay anonymous.

## What is in scope

FlowViz is self-hosted. You run the server, you supply the AI provider API key,
and the analyses stay in your browser. The interesting boundary is therefore the
server: it accepts URLs from whoever can reach it and fetches them.

In scope:

- Anything that makes the server fetch, read or reveal something it should not —
  in particular requests reaching addresses the URL guard is meant to refuse.
- Anything that gets code or markup executed in the browser from analysed
  content, a saved flow, or an imported file.
- Anything that leaks the AI provider API key to the browser or to a third party.
- Denial of service that a single ordinary request can cause.
- Vulnerable dependencies, where you can show the path is actually reachable
  here.

## What is not

- **Prompt injection from analysed articles.** FlowViz reads attacker-authored
  text by design — that is the product. A report that a crafted article changes
  what the model writes into the graph is expected behaviour, not a
  vulnerability. What *would* be one is that text escaping the graph: causing a
  request, running in the browser, or reaching the filesystem.
- **Anything requiring control of the server or its `.env`.** Whoever runs the
  instance already has the API key and the machine.
- **Hostnames that resolve to private addresses.** The URL guard checks
  addresses, not DNS, and cannot see where a name points. A deployment that
  treats internal reachability as a boundary wants egress rules; this is a known
  and documented limit rather than an oversight.
- **Missing hardening on a deployment you configured** — no TLS, an instance
  exposed to the internet without a proxy, permissive `ALLOWED_ORIGINS`.
- The FlowViz marketing site, which is a separate project.

## Running it safely

The server holds an API key that costs real money to use, and it will fetch URLs
for anyone who can reach it. Treat it as an internal service: bind it where only
the people you intend can reach it, keep it behind TLS if it crosses a network,
and set `ALLOWED_ORIGINS` to the origin actually serving the app. The per-route
rate limits are defaults, not a substitute for that.
