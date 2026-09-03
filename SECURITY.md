# Security policy

This repository has no production secrets, accounts, live market connections,
or server runtime. Keep it that way unless a separately reviewed architecture
change requires otherwise.

Report a vulnerability privately to the repository owner rather than including
credentials, exploit details, or sensitive data in a public issue. The owner
should add a project-specific contact before public launch.

Do not compile untrusted MDX, evaluate formula strings, add remote scripts, run
pull-request code with secrets, or give workflows write permissions without a
documented need. Review dependencies and GitHub Actions as executable code.
