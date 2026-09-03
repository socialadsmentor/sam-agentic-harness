# Behavior specs

Each subdirectory here is one behavior, named by its directory, with a `BEHAVIOR.md` file
holding the spec text. `self-harness/behavior-judge.py` reads every `<name>/BEHAVIOR.md` under
this directory, samples recent trajectories (session transcripts and job/gate/deploy trace
logs), and judges each spec true, false, or na against each sampled trajectory.

A `BEHAVIOR.md` is plain prose, no required frontmatter: state the one behavior being checked,
plainly enough that a judge model can score a trajectory excerpt against it without more
context. Keep each spec to one behavior. Write it so "false" is unambiguous, since a false
verdict becomes a Stage-1 self-harness incident with a trace pointer (see
`rules/self-harness.rules.md`).

This build ships one neutral example, `readback-before-claim/BEHAVIOR.md`. Add your own
directory per behavior as you find recurring failure patterns worth watching for.
