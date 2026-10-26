# Modular Activity Count Bookmarklet

A modular JavaScript experiment for loading, classifying, and reporting Alexa activity entries from a compatible browser page.

## Modules

- `src/index.js`: reads the page's date filters and starts the workflow.
- `src/autoscroll.js`: loads additional visible activity through scrolling.
- `src/dataProcessor.js` and `src/filter.js`: extract records and classify activity.
- `src/ui.js` and `src/report.js`: render controls and reports.
- `rollup.config.js`: bundles the entry point as an immediately invoked browser script in `dist/bookmarklet.bundle.js`.

## Build

```sh
npm ci
npm run build
```

The package's `npm test` command is an unimplemented placeholder. A successful build does not establish correct activity counts or host-page compatibility.

## Status and hygiene

Experimental; page selectors and timezone handling need fixture-based verification. `node_modules/` is currently tracked. The ignore file prevents new untracked dependency files from being added accidentally, but does not remove files already tracked. Cleanup of tracked dependencies should be reviewed separately while preserving the lockfile and reproducible build.

Related experiments: [single-file counter](https://github.com/TheCasey/count-bookmarklet) and [history review utility](https://github.com/TheCasey/count2). Use synthetic activity in public examples.
