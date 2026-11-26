# Armco COGS feed

The current production candidate is [COGS_Production_Ready.dg](COGS_Production_Ready.dg). Its configuration is already present in the file; verify it in Zoho before use. This is a live-write script, not a preview. The dashboard is local and cannot establish whether the feed or schedule is working.

## What the production candidate does

It reads the configured Books account register for the current day and previous 13 days, totals matching invoice and credit-note debits minus credits, and writes daily amounts to column G of the `COGS` worksheet. It reads `Date` records under header row 14, matches dates in `yyyy-MM-dd` or `MM/dd/yyyy` format, and creates missing dates in column A. Confirm that these transaction types and the single configured account cover the intended cost of sales.

The script uses connections `cogs_books_read` and `cogs_sheet_conn`. It overwrites `COGS_Guard!A1:A14` with scratch formulas to check destination cells for formulas. Reserve that range for the feed. The script stops on detected duplicates, formula or API errors, and an incomplete or 1,000-record Sheet fetch. Updates are individual writes: if a later step fails, earlier rows may already have changed. Resolve the error and reconcile before rerunning. Do not run overlapping instances: the script has no concurrency lock.

## Before enabling the feed

1. Verify the Books organization, account, Sheet resource, API data center, connections and their access. Confirm that the COGS worksheet has `Date` in column A, the intended COGS destination in column G, and headers on row 14. Confirm the guard scratch range is available.
2. Run [COGS_Verified_Read_Only.dg](COGS_Verified_Read_Only.dg) and inspect the Books and Sheet responses. It makes no Sheet writes. Reconcile several daily totals against Books, including a zero-activity day and a credit note; verify the transaction labels and account mapping.
3. Verify the formula guard on a disposable test sheet with both a formula and a non-formula cell. The guarded test files write to `COGS_Test` and `COGS_Guard`; inspect their configuration before running. A successful helper response alone does not prove protection in every case.
4. Once the checks pass, manually run the production candidate and inspect its execution log, each affected date and amount, and the report. Investigate any stop message and partial writes before retrying.
5. Configure or activate the daily Zoho Books schedule after the posting cutoff. Confirm its timezone and function, then check the next execution log and report.

Zoho access, execution results, reconciliation and schedule state cannot be verified from this repository. Keep a record of those results in Zoho or your operational runbook.

## Dashboard

Run `python -m http.server 8000` in this folder and open `http://localhost:8000`. The dashboard reads basic configuration from the local production file, keeps checklist progress in browser storage, and displays an optional local CSV containing `Date` and `COGS` headers. CSV values are cleared on refresh. Its checks do not validate the script, connect to Zoho, or verify execution, reconciliation or scheduling.

## Other scripts

[Armco_Nightly_COGS_Feed.dg](Armco_Nightly_COGS_Feed.dg) is an older, separately configured implementation with a different Sheet layout and connection names. Preview and test files are experiments; review their comments and targets before using them.
