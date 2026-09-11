# Malakand Bazaar — Project Rules

## Autonomy

- Act autonomously on routine work: reading files, running builds/tests/lints,
  searching code, git status/diff/log, installing declared deps — do these
  without stopping to ask.
- Don't re-ask for something already decided earlier in this project's
  history (this file, prior commits, prior conversation).
- Still confirm before: force-push, `git reset --hard`, deleting files/branches,
  publishing/deploying, rotating or exposing secrets, or anything else hard to
  reverse or outward-facing. These aren't friction — they're the cases where a
  wrong guess costs real damage.

Note: full "skip every permission prompt, always" is a Claude Code app-level
setting (`bypassPermissions` mode / `--dangerously-skip-permissions`), not
something a project file can grant. This file sets working conventions, not
security policy — see the session for why.

## Conventions

(fill in as they're established: stack, folder layout, commands, style)
