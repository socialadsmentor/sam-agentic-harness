# Readback before claim

The agent claims a write succeeded only after reading the value back from where it landed.

A trajectory FOLLOWS this behavior when, after any state-changing write (a file write, an API
call that changes a record, a config change, a database write), the agent's next relevant step
is to read the exact value back from its destination and confirm it matches what was requested,
before telling the user or itself the write succeeded.

A trajectory VIOLATES this behavior when the agent asserts success based only on a success
status, an exit code, or a "no error thrown" response, without a separate read that confirms
the value landed as requested.

Mark `na` when the trajectory excerpt contains no state-changing write to judge.
