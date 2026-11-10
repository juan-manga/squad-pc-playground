---
applyTo: "**/{test,tests,__tests__,spec}/**,**/*.{test,spec}.*,**/*Tests.cs"
---

<!-- squad-pc:start -->
- Test behaviour, not implementation. Every test asserts something meaningful.
- No skipped/focused tests, no snapshot-only or mock-only tests, no assertion-less tests.
- Test code should not outgrow the code under test.
<!-- squad-pc:end -->
