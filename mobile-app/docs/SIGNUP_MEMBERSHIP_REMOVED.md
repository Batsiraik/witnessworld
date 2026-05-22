# Signup membership & card flow (removed — May 2026)

New accounts no longer choose a membership plan or add a card during registration. Everyone registers on the **free** plan and goes **OTP → Dashboard** (pending admin verification). Cards and paid plans stay in the app under **Profile**.

## What was removed

### `RegisterScreen.tsx`
- Loading `membership-plans-public.php` and plan cards UI
- Trial / paid-plan copy and Stripe test-card hints
- `membershipPlan` state and plan selection
- Registration still sends `membership_plan: 'free'` to `register.php` (backend unchanged)

### `RegisterOtpScreen.tsx`
- After OTP verify: redirect to `AddPaymentCard` when `plan !== 'free'` and no card
- Now always: `navigation.reset` → `Dashboard`

### Signup path no longer uses
- `AddPaymentCard` with `returnTo: 'register_complete'` (screen remains for **Profile → Payment method**)

## What still works (in-app only)

| Feature | Where |
|--------|--------|
| Add / update card | Profile → Payment method → Stripe checkout in browser |
| Change membership plan | Profile / Membership plans screen (`MembershipPlansScreen`) |
| Free plan default | `api/register.php` defaults to `free` if omitted |

## How to restore signup plan + card (if boss wants it back)

1. **RegisterScreen** — Re-add from git history (or this doc’s era):
   - Imports: `MEMBERSHIP_PLANS_FALLBACK`, `PublicPlan`, plan parsers
   - State: `membershipPlan`, `plans`, `trialDays`, `plansLoading`
   - `useEffect` fetching `membership-plans-public.php`
   - “Membership plan” section + plan cards
   - Pass `membership_plan: membershipPlan` in `register.php` POST

2. **RegisterOtpScreen** — Re-add after verify:
   ```ts
   if (plan !== 'free' && pm !== 'attached') {
     navigation.replace('AddPaymentCard', { returnTo: 'register_complete', email });
     return;
   }
   ```

3. **AddPaymentCardScreen** — `register_complete` branch (signup copy, “Skip — use free plan”) is still in the file but unused; no change needed if you restore step 2.

## Backend

No API changes required for this UX. `register.php` already accepts `membership_plan` and defaults to `free`.
