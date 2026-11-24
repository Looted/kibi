# Branch lifecycle

Use the exact `KIBI_BRANCH` value or Git symbolic HEAD. Hashed stores carry a
matching `branch.json`; missing stores are compiled from tracked sources by
`kibi sync`. Legacy literal stores require explicit migration. Kibi never
copies stores between branches or resolves Git conflicts. Read the preview,
approval hash, quarantine, restore, and purge details before lifecycle work.
