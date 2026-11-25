# Armco Nightly COGS Feed

The deployable Zoho Books function is [Armco_Nightly_COGS_Feed.dg](Armco_Nightly_COGS_Feed.dg).
It reads posted transactions from confirmed COGS account registers, totals
invoices and credit notes as debits minus credits for a rolling 14-day window
(including today), then updates the corresponding daily rows in the Zoho Sheet
`COGS` worksheet. Days without qualifying transactions are written as zero.

## Prepare Zoho Sheet

1. Create a worksheet named `COGS` with `Date` and `COGS` headers in row 1.
2. Format column A as Plain Text, then enter one date per row as text in
   `YYYY-MM-DD` form. The supplied setup range, 2026-11-01 through 2026-12-31,
   covers this initial period; extend it before the job's rolling window reaches
   the end of that range.
3. Keep column B empty for the job to fill, and keep the worksheet hidden if the
   report should be its only presentation surface.
4. In the report's COGS field, use:

   ```excel
   =SUMIFS(COGS!B:B,COGS!A:A,TEXT($A5,"yyyy-mm-dd"))
   ```

   Keep the existing gross-profit formulas unchanged.

## Create connections

In Zoho Books connection settings, create OAuth connections with these link
names and scopes:

- `books_conn`: `ZohoBooks.accountants.READ`
- `sheet_conn`: `ZohoSheet.dataAPI.READ` and `ZohoSheet.dataAPI.UPDATE`

The Sheet connection needs read access because the function checks the date rows
before it writes. The Books request uses Zoho's documented read-only account
register endpoint, `GET /books/v3/registers/{account_id}/transactions`, with
custom `from_date` and `to_date` parameters.

## Fill in the settings

In the settings block near the top of the `.dg` file, replace:

- `PUT_BOOKS_ORG_ID_HERE` with the Books organization ID.
- `PUT_COGS_ACCOUNT_ID_HERE` with each confirmed COGS account ID. Add one
  `cogsAccounts.add("...");` line for every applicable account.
- `PUT_SHEET_RESOURCE_ID_HERE` with the Sheet resource ID from its URL.
- `apiDomain` with the correct Zoho API domain for Armco's data center.

The function stops if any ID placeholder is still present. Confirm the account
mapping against the accounts that Armco's items actually post to; the script
does not infer or change account mappings.

## Install and reconcile in test mode

1. In Zoho Books, open **Settings → Workflow Actions → Functions** (under
   Automation; labels can vary by plan) and create a Deluge function named
   `feedCogs` with a `void` return type. Paste the full contents of the `.dg`
   file and save it.
2. Confirm the function can use `books_conn` and `sheet_conn`.
3. Leave `TEST_ONLY = true` and `TRANSACTION_LABELS_CONFIRMED = false`.
4. Run the function once. It reads Books and the Sheet, but does not change
   the Sheet. The log shows the first register response for each account,
   transaction types seen, daily totals, and any stop reason.
5. Confirm the field names and invoice/credit-note type labels from the log.
   Compare at least two or three daily totals with Books' Account Transactions
   report. Check dates with no qualifying activity too.

The script uses the Books Registers API response fields
`register_transactions.account_transactions`, `page_context.has_more_page`,
`transaction_date`, `transaction_type`, `debit_amount`, and `credit_amount`.
If Zoho returns a different response shape, it stops before any Sheet write.

## Enable live updates and schedule

Only after the test log and sample dates are approved:

1. Set `TRANSACTION_LABELS_CONFIRMED = true`.
2. Set `TEST_ONLY = false`.
3. Run the function once manually, then confirm the matching 14 dates in the
   COGS worksheet and the report.
4. In Zoho Books **Settings → Workflow Actions → Schedules**, add a daily
   schedule after the Books posting cutoff.
5. Check the next morning's report and schedule execution log.

The function prechecks that every date in the current 14-day window has exactly
one matching plain-text row before it starts writing. Each Sheet update is
checked for a successful response affecting exactly one row. Zoho applies the
daily updates one at a time, so a later Sheet API error can leave earlier dates
already updated; fix the cause and rerun to refresh the full window.

## API references

- [Zoho Books account register API](https://www.zoho.com/books/api/v3/registers/)
- [Zoho Sheet `getRecords` Deluge task](https://www.zoho.com/deluge/help/sheet/get-records.html)
- [Zoho Sheet `updateRecords` Deluge task](https://www.zoho.com/deluge/help/sheet/update-records.html)
- [Zoho Books schedules](https://www.zoho.com/us/books/help/settings/automation/schedules.html)

## Dashboard

Run `python -m http.server 8000` from this folder and open
`http://localhost:8000`. The workspace reads the feed configuration, lets you
track setup steps in browser storage, and displays a local CSV with `Date` and
`COGS` headers. Checklist progress stays in the current browser; imported CSV
values are cleared on refresh. You can also choose a feed file manually.

The dashboard does not connect to Zoho, run the feed, write to the Sheet, or
verify the schedule, reconciliation, or execution history. Complete those
steps in Zoho Books and Sheet as described above.
