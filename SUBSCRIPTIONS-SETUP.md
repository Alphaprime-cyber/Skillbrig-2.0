# SkillBridge subscriptions setup

## Recurring plans
- Monthly: NGN 1,500, billed every month
- 3 months: NGN 3,500, billed quarterly (Most Popular; saves NGN 1,000 vs three monthly payments)
- Yearly: NGN 10,000, billed annually (saves NGN 8,000 vs twelve monthly payments)
- All plans automatically renew until the provider cancels through Paystack. Registration and plan selection require explicit recurring-payment consent.

## What is included
- Provider registration requires selecting and consenting to a paid recurring plan, then continues to hosted Paystack checkout after account creation. There is no free provider plan; Paystack collects card details directly.
- `subscription.html` plan selection and Paystack-hosted subscription management/cancellation
- `js/subscription.js` requires Firebase sign-in and calls trusted Cloud Functions
- `functions/index.js` initializes checkout with Paystack recurring plan codes, verifies charges server-side, processes renewal/cancellation webhooks, and writes subscription dates
- Firestore rules block browser writes to subscription/payment records
- PWA manifest, icons, offline page, and service worker are included

## Required setup before accepting payments
1. Install a Firebase-supported Node.js version (20 or 22) and Firebase CLI on your computer.
2. In the project folder, run `firebase login`, then confirm the selected project is `skillbridge-app-56faf`.
3. In Paystack **Test Mode**, create three subscription plans with amounts NGN 1,500 monthly, NGN 3,500 quarterly, and NGN 10,000 annually. Leave the invoice limit unlimited. Copy each `PLN_...` plan code; codes are specific to Test or Live mode.
4. Set the Paystack **test secret** key as a Firebase secret; never paste it into HTML/JS or commit it:
   `firebase functions:secrets:set PAYSTACK_SECRET_KEY`
   Paste the test secret when asked. Use live keys only after test payments and deployment review.
5. The Test Mode plan codes are stored locally in `functions/.env.skillbridge-app-56faf`. Git ignores this file. When switching to Live Mode, replace these codes with the Live plan codes; do not put the Paystack secret key in this file.
6. Set the public site base URL if your site is not at the default GitHub Pages URL (include the repository path).
7. Deploy backend and rules:
   `firebase deploy --only functions,firestore:rules`
8. In the same Paystack environment, configure the HTTPS webhook URL for `paystackSubscriptionWebhook`. Firebase prints the function URL after deployment; confirm Paystack delivers transaction success and subscription/invoice events to it.
9. Confirm Firebase Functions billing/Blaze is enabled, then test the complete recurring flow in Paystack Test Mode before switching to Live keys and Live plan codes.
10. Publish the static files using the hosting provider you actually use. If using GitHub Pages, upload/commit the files and keep the repository subpath consistent. Cloud Functions are hosted by Firebase, not GitHub Pages.

## Important notes
- The frontend never activates a subscription itself. The server verifies amount, currency, reference, plan, and metadata before granting access; renewal dates are updated from Paystack's recurring-plan events.
- The subscription system stores the plan in `subscriptions/{providerAuthUid}`. Existing provider features are not automatically restricted based on plan yet; apply premium benefits in provider search/ranking and provider tools only after you decide exactly which features are paid.
- Monthly billing follows Paystack's calendar rules (charges on the same day when possible; dates after the 28th move to the 28th of following months). A failed renewal may require the provider to update their payment method; Paystack documents that subscription charges are not retried.
- Existing Firestore rules include project-specific booking, reviews, and rescheduling behavior. Review the rules and deploy only after testing the current app flows.
- PWA offline behavior deliberately does not cache authenticated content, Firebase responses, payments, bookings, or live provider data.
