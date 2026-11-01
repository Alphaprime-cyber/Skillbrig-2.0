# SkillBridge subscriptions setup

## Plans implemented
- Monthly: NGN 1,500 / 30 days
- 3 months: NGN 3,500 / 90 days (Most Popular; saves NGN 1,000 vs three monthly payments)
- Yearly: NGN 10,000 / 365 days (saves NGN 8,000 vs twelve monthly payments)

## What is included
- `subscription.html` plan selection page
- `js/subscription.js` requires Firebase sign-in and calls trusted Cloud Functions
- `functions/index.js` initializes Paystack checkout, verifies transactions server-side, handles Paystack `charge.success` webhooks, and writes active subscription dates
- Firestore rules block browser writes to subscription/payment records
- PWA manifest, icons, offline page, and service worker are included

## Required setup before accepting real payments
1. Install Node.js 20 and Firebase CLI on your computer.
2. In the project folder, run `firebase login`, then `firebase use skillbridge-app-56faf` (confirm this is the correct Firebase project first).
3. Set the Paystack **secret** key as a Firebase secret; never paste it into HTML/JS or commit it:
   `firebase functions:secrets:set PAYSTACK_SECRET_KEY`
   Paste your Paystack test secret key first. Use live keys only after test payments and deployment review.
4. Set the public site base URL if your site is not at the default GitHub Pages URL by editing the `SITE_BASE_URL` default in `functions/index.js` (use the full base URL, including the repository path if hosted on GitHub Pages).
5. Deploy backend and rules:
   `firebase deploy --only functions,firestore:rules`
6. In Paystack Dashboard, configure the webhook URL to the deployed `paystackSubscriptionWebhook` function URL. It should be HTTPS. The exact URL is shown by Firebase after deployment.
7. Confirm Firebase Functions billing/Blaze plan is enabled if required for deployment, and test in Paystack test mode.
8. Publish the static files using the hosting provider you actually use. If using GitHub Pages, upload/commit the files and keep the repository subpath consistent. Cloud Functions are hosted by Firebase, not GitHub Pages.

## Important notes
- The frontend never activates a subscription itself. The server verifies amount, currency, reference, plan, and metadata with Paystack before granting access.
- The subscription system stores the plan in `subscriptions/{providerAuthUid}`. Existing provider features are not automatically restricted based on plan yet; apply premium benefits in provider search/ranking and provider tools only after you decide exactly which features are paid.
- Current plans grant 30/90/365 days. For calendar-month billing (e.g. same date next month), update the server duration logic before launch if preferred.
- Existing Firestore rules may already have other project-specific changes. Review the generated rules and deploy only after testing the current app flows.
- PWA offline behavior deliberately does not cache authenticated content, Firebase responses, payments, bookings, or live provider data.
