# Repo

Static CDN of JavaScript utility libraries imported by k6 load-testing scripts at runtime.

## Architecture

Libraries are pre-built JS bundles stored in a version-numbered directory tree.
A central JSON registry maps each library to its versions, optional docs URL,
and optional bundle filename override. The homepage generator reads this registry
to produce the site landing page. Deployment syncs the entire bundle tree to S3
and invalidates the CDN cache.

Tests run with k6 itself against local bundle paths. CI has two test suites:
one for base compatibility mode and one for extended mode. Each test imports a
specific library version via a relative path, so adding a version requires adding
a matching test import.

The bundler (webpack) converts source files into distributable bundles, but most
libraries arrive as pre-built bundles copied from upstream repos. Both workflows
coexist.

## Gotchas

The deploy uses `--delete` sync. Any file removed from the bundle tree disappears
from the live CDN on merge. Conversely, any stray file left in the tree ships to
production. Do not place scratch or non-distributable content there.

The registry supports a `published: false` flag that hides a library from the
homepage, but the library still deploys to S3 and is fetchable by URL. Agents
may assume unpublished means undeployed -- it does not.

One library uses a non-default bundle filename configured via a registry field.
If a new library also needs this and the field is omitted, the homepage links to
a file that does not exist while the real bundle is still reachable via direct URL.
The mismatch is silent.

Minified code from external contributors is rejected as policy. Only a maintainer
who reviewed the source may produce and commit the minified bundle. PRs that
violate this look normal but will be blocked.

Test imports use hardcoded version strings in relative paths. When you add a new
library version, tests will still pass (they test the old version). Forgetting to
add test coverage for the new version is undetectable by CI.

Version-bump PRs skip the review requirement. An agent that opens such a PR
should not wait for approval; it can be merged once CI is green.
