# MotoPayee 30-Day Launch Dashboard Specification

Reference date: August 2026

## Purpose

The MotoPayee 30-Day Launch Dashboard is the operating tracker for the launch team.

It should help the team track:

- Weekly targets vs actuals
- Seller, dealer, rental, buyer, renter, MFI, and inspection leads
- Sale listing readiness
- Rental vehicle readiness
- Dealer pilot progress
- Finance partner progress
- Inspection requests
- Launch go/no-go status

## Workbook Sheets

Recommended sheets:

1. Weekly Scorecard
2. Lead Tracker
3. Sale Listings Pipeline
4. Rental Pipeline
5. Dealer Pipeline
6. MFI Pipeline
7. Inspection Tracker
8. Launch Readiness
9. Lists

The Lists sheet should store dropdown values for statuses, lead types, cities, owners, priorities, and trust labels.

## Sheet 1: Weekly Scorecard

Purpose:

Track launch targets and weekly execution.

Columns:

| Column | Description |
| --- | --- |
| Metric | Name of the tracked metric |
| Target | 30-day target |
| Week 1 Actual | Actual value for week 1 |
| Week 2 Actual | Actual value for week 2 |
| Week 3 Actual | Actual value for week 3 |
| Week 4 Actual | Actual value for week 4 |
| Total Actual | Sum of weekly actuals where applicable |
| Status | On Track / Watch / Behind |
| Notes | Explanation or action |

Recommended metrics:

- Seller contacts
- Dealer contacts
- Rental owner contacts
- MFI/credit partner contacts
- Completed sale listing intakes
- Completed rental intakes
- Listings reviewed
- Listings published
- Verified listings
- Inspected listings
- Finance-eligible listings
- Rental vehicles approved
- Buyer inquiries
- Renter inquiries
- Inspection requests
- Financing applications
- Rental bookings

Suggested formulas:

- Total Actual: sum Week 1 to Week 4
- Status: compare Total Actual to Target
- On Track if Total Actual is at least 80% of proportional target by current week
- Watch if 50-79%
- Behind if below 50%

## Sheet 2: Lead Tracker

Purpose:

One row per lead, regardless of type.

Columns:

| Column | Description |
| --- | --- |
| Lead ID | Unique lead identifier |
| Date Created | Date lead was captured |
| Lead Name | Person, dealer, business, or institution name |
| Lead Type | Seller / dealer / rental owner / buyer / renter / MFI / inspection |
| City | Lead city |
| Phone/WhatsApp | Contact number |
| Source | WhatsApp / referral / Facebook / field / dealer visit / other |
| Assigned To | Founder / Staff 1 / Staff 2 |
| Current Status | Lead workflow status |
| Priority | High / medium / low |
| Next Action | Next action required |
| Due Date | Follow-up due date |
| Last Contacted | Last contact date |
| Notes | Free text notes |

Lead workflow status values:

- New
- Contacted
- Waiting for photos
- Waiting for price
- Waiting for documents
- Ready for review
- Approved
- Published
- Rejected
- Follow-up later
- Closed

## Sheet 3: Sale Listings Pipeline

Purpose:

Track sale vehicles from intake to publication and trust upgrades.

Columns:

| Column | Description |
| --- | --- |
| Listing ID | Unique listing identifier |
| Date Received | Date vehicle was submitted |
| Seller Name | Seller or dealer name |
| Seller Type | Individual / dealer |
| City | Vehicle city |
| Make | Vehicle make |
| Model | Vehicle model |
| Year | Vehicle year |
| Price XAF | Asking price |
| Mileage | Mileage where available |
| Photos Status | Missing / partial / complete |
| Documents Status | Missing / received / checked |
| Review Status | Draft / waiting info / reviewed / rejected / published |
| Trust Label | Reviewed / seller verified / documents checked / inspected / finance eligible |
| Inspection Status | Not requested / requested / scheduled / completed |
| Finance Candidate | Yes / no / maybe |
| Published Date | Date listing went public |
| Assigned To | Staff owner |
| Notes | Free text notes |

## Sheet 4: Rental Pipeline

Purpose:

Track rental vehicles from intake to verified rental publication and booking.

Columns:

| Column | Description |
| --- | --- |
| Rental ID | Unique rental vehicle identifier |
| Date Received | Date rental vehicle was submitted |
| Owner Name | Owner or business |
| City | Vehicle city |
| Vehicle Type | Car / SUV / van / bus / truck / chauffeur / event |
| Make | Vehicle make |
| Model | Vehicle model |
| Year | Vehicle year |
| Rental Mode | Self-drive / with driver / both |
| Daily Rate XAF | Daily rental rate |
| Security Deposit XAF | Deposit required |
| Photos Status | Missing / partial / complete |
| Ownership Proof | Missing / received / checked |
| Insurance Status | Active / expired / unknown |
| Rate Confirmed | Yes / no |
| Deposit Confirmed | Yes / no |
| Availability Confirmed | Yes / no |
| Verification Status | Pending / verified / rejected |
| Published Status | Not published / published |
| Booking Status | None / inquiry / booked / completed |
| Assigned To | Staff owner |
| Notes | Free text notes |

## Sheet 5: Dealer Pipeline

Purpose:

Track dealer outreach and pilot onboarding.

Columns:

| Column | Description |
| --- | --- |
| Dealer ID | Unique dealer identifier |
| Date Contacted | First contact date |
| Dealer Name | Business name |
| City | Dealer city |
| Contact Person | Owner, manager, or inventory contact |
| Phone/WhatsApp | Contact number |
| Status | Target / contacted / interested / pilot agreed / first batch received / active / paused / rejected |
| Vehicles Available | Estimated inventory count |
| Vehicles Submitted | Count submitted to MotoPayee |
| Vehicles Published | Count published |
| Finance Candidates | Count likely finance eligible |
| Pilot Terms Accepted | Yes / no |
| Next Action | Next step |
| Due Date | Follow-up date |
| Notes | Free text notes |

## Sheet 6: MFI Pipeline

Purpose:

Track finance partner outreach.

Columns:

| Column | Description |
| --- | --- |
| Partner ID | Unique partner identifier |
| Date Contacted | First contact date |
| Institution Name | MFI, credit union, or dealer finance partner |
| Institution Type | MFI / credit union / dealer finance |
| City/Branch | Location |
| Contact Person | Partner contact |
| Phone/Email | Contact details |
| Status | Target / contacted / meeting booked / rules collected / pilot interested / pilot agreed / inactive |
| Required Down Payment | Partner requirement |
| Tenor Range | Repayment period |
| Required Documents | Summary |
| Collateral Requirements | Summary |
| Surety Requirements | Summary |
| Response Timeline | Expected partner response |
| Open To Success Commission | Yes / no / maybe |
| Next Action | Next step |
| Due Date | Follow-up date |
| Notes | Free text notes |

## Sheet 7: Inspection Tracker

Purpose:

Track buyer-requested, seller-requested, finance, and rental inspections.

Columns:

| Column | Description |
| --- | --- |
| Inspection ID | Unique inspection identifier |
| Date Requested | Request date |
| Requested By | Buyer / seller / dealer / MotoPayee |
| Requester Name | Person requesting |
| Phone/WhatsApp | Contact |
| Vehicle/Listing ID | Related vehicle/listing |
| City | Vehicle city |
| Inspection Type | Buyer-requested / seller package / finance check / rental verification |
| Fee XAF | Inspection fee |
| Payment Status | Pending / paid / waived |
| Scheduled Date | Inspection date |
| Assigned Inspector | Staff owner |
| Status | Requested / paid / scheduled / completed / cancelled |
| Condition Summary | Short summary |
| Badge Approved | Yes / no |
| Notes | Free text notes |

## Sheet 8: Launch Readiness

Purpose:

Track whether MotoPayee is ready for buyer/renter public push.

Columns:

| Area | Requirement | Target | Actual | Status | Owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |

Readiness areas:

- WhatsApp Business ready
- 25+ sale listings presentable
- 20+ rental vehicles presentable or nearly ready
- 3-5 dealer pilots in progress
- 2-3 finance partner conversations active
- Trust labels defined
- Inquiry handling process ready
- Inspection offer defined
- Rental payment/deposit rules defined
- Public messaging ready
- Staff roles assigned
- Weekly scorecard active

Status values:

- Ready
- In progress
- Blocked
- Not started

Go/no-go rule:

Buyer and renter campaign should start only when the core launch readiness items are Ready or In progress with clear ownership.

## Sheet 9: Lists

Purpose:

Store dropdown values.

Recommended lists:

### Lead Types

- Seller
- Dealer
- Rental owner
- Buyer
- Renter
- MFI
- Inspection

### Owners

- Founder
- Staff 1
- Staff 2

### Priorities

- High
- Medium
- Low

### Lead Statuses

- New
- Contacted
- Waiting for photos
- Waiting for price
- Waiting for documents
- Ready for review
- Approved
- Published
- Rejected
- Follow-up later
- Closed

### Trust Labels

- Reviewed
- Seller verified
- Documents checked
- Inspected
- Finance eligible
- Verified rental
- Trusted dealer

### Readiness Statuses

- Ready
- In progress
- Blocked
- Not started

## Suggested Dashboard KPIs

Top KPI cards:

- Sale listings published
- Rental vehicles approved
- Dealer pilots active
- Finance partners active
- Buyer inquiries
- Renter inquiries
- Inspection requests
- Rental bookings

Recommended formulas:

- Count published sale listings from Sale Listings Pipeline
- Count verified rental vehicles from Rental Pipeline
- Count active dealer pilots from Dealer Pipeline
- Count MFI partners with pilot interested or pilot agreed
- Count buyer leads from Lead Tracker
- Count renter leads from Lead Tracker
- Count completed inspections from Inspection Tracker
- Count booked rentals from Rental Pipeline

## Weekly Review Process

Every Monday:

1. Update all lead statuses.
2. Review last week's targets vs actuals.
3. Identify stuck leads.
4. Confirm listings ready to publish.
5. Confirm rental vehicles ready.
6. Review dealer and MFI progress.
7. Review inspections and payment status.
8. Update launch readiness.
9. Assign this week's targets.

## Workbook Design Notes

Recommended formatting:

- Use green for Ready, Approved, Published, Verified
- Use amber for In progress, Waiting, Watch
- Use red for Blocked, Rejected, Behind
- Freeze header rows on every sheet
- Use filters on all pipeline sheets
- Use date formats for date columns
- Use XAF number format for price, fee, deposit, and rate columns
- Keep Notes columns wide and wrapped
- Use dropdowns for status, owner, priority, type, and trust labels

## Future Workbook Build Notes

When spreadsheet generation is available, build this as an `.xlsx` workbook with:

- Data validation dropdowns
- Conditional formatting for status fields
- Formula-driven KPI cards
- A compact dashboard summary
- Frozen headers
- Filterable tables
- Protected formula cells where appropriate
