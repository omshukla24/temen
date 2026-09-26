import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { GALAXY_BILLING_MODE } from 'react-native-purchases-store-galaxy';
import RevenueCatUI from 'react-native-purchases-ui';

import { credits, pro, unlocks } from '@/state/entitlements';

export const ENTITLEMENT = 'pro';
export const PRODUCT = { single: 'report_single', monthly: 'pro_monthly', annual: 'pro_annual' } as const;

export type StoreMode = 'test' | 'galaxy' | 'off';
let mode: StoreMode = 'off';

/**
 * Test Store for dev builds and the demo; Galaxy for the Samsung build.
 * The Test Store key must never ship in a store build, so each mode reads only its own key.
 */
export function initPurchases(): StoreMode {
  if (mode !== 'off' || Platform.OS === 'web') return mode;
  const store = process.env.EXPO_PUBLIC_RC_STORE === 'galaxy' ? 'galaxy' : 'test';
  const key = store === 'galaxy' ? process.env.EXPO_PUBLIC_RC_GALAXY_KEY : process.env.EXPO_PUBLIC_RC_TEST_KEY;
  if (!key) return (mode = 'off');
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
    if (store === 'galaxy') {
      Purchases.configure({ apiKey: key, store: 'GALAXY', galaxyBillingMode: GALAXY_BILLING_MODE.PRODUCTION });
    } else {
      Purchases.configure({ apiKey: key });
    }
    mode = store;
    Purchases.addCustomerInfoUpdateListener(apply);
    Purchases.getCustomerInfo().then(apply).catch(() => {});
  } catch {
    mode = 'off';
  }
  return mode;
}

export const storeMode = () => mode;

/** Entitlement state and single-report unlocks from RevenueCat's customer info. */
export function apply(info: CustomerInfo) {
  const e = info.entitlements.active[ENTITLEMENT];
  pro.set({ active: !!e, expires: e?.expirationDate ?? null, product: e?.productIdentifier ?? null });
  // Single reports: transactions this phone assigned stay assigned; the rest become credits.
  const assigned = new Set(Object.values(unlocks.get()));
  const spare = info.nonSubscriptionTransactions
    .filter((t) => t.productIdentifier.startsWith(PRODUCT.single) && !assigned.has(t.transactionIdentifier))
    .map((t) => t.transactionIdentifier);
  credits.set(spare);
}

export interface Offer {
  offering: PurchasesOffering;
  single: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

const byProduct = (o: PurchasesOffering, id: string) =>
  o.availablePackages.find((p) => p.product.identifier === id || p.product.identifier.startsWith(`${id}:`) || p.identifier === id) ?? null;

export async function loadOffer(): Promise<Offer | null> {
  if (mode === 'off') return null;
  const offerings = await Purchases.getOfferings();
  const o = offerings.current ?? offerings.all.default;
  if (!o) return null;
  return {
    offering: o,
    single: byProduct(o, PRODUCT.single),
    monthly: o.monthly ?? byProduct(o, PRODUCT.monthly),
    annual: o.annual ?? byProduct(o, PRODUCT.annual),
  };
}

export type BuyResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

/** Buys a package. A single report is tied to `place` on this phone. */
export async function buy(pkg: PurchasesPackage, place: string | null): Promise<BuyResult> {
  try {
    const r = await Purchases.purchasePackage(pkg);
    if (place && pkg.product.identifier.startsWith(PRODUCT.single)) {
      unlocks.set((m) => ({ ...m, [place]: r.transaction.transactionIdentifier }));
    }
    apply(r.customerInfo);
    return { ok: true };
  } catch (e) {
    const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
    const cancelled = err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || !!err.userCancelled;
    return { ok: false, cancelled, message: cancelled ? '' : (err.message ?? 'The store did not complete the purchase.') };
  }
}

/** Uses a restored, unassigned report on this place. */
export function spendCredit(place: string): boolean {
  const [first, ...rest] = credits.get();
  if (!first) return false;
  unlocks.set((m) => ({ ...m, [place]: first }));
  credits.set(rest);
  return true;
}

export async function restore(): Promise<{ ok: boolean; pro: boolean; credits: number; message?: string }> {
  if (mode === 'off') return { ok: false, pro: false, credits: 0, message: 'The store is not set up in this build.' };
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return { ok: true, pro: pro.get().active, credits: credits.get().length };
  } catch (e) {
    return { ok: false, pro: false, credits: 0, message: (e as Error).message };
  }
}

export function trackPaywall(offering: PurchasesOffering) {
  if (mode === 'off') return;
  Purchases.trackCustomPaywallImpression({ offering, paywallId: 'temen-contextual' }).catch(() => {});
}

export async function openCustomerCenter() {
  if (mode === 'off') return false;
  await RevenueCatUI.presentCustomerCenter();
  return true;
}

/** Fallback only: the stock paywall, if the custom one cannot load packages. */
export async function openStockPaywall() {
  if (mode === 'off') return;
  await RevenueCatUI.presentPaywall({ displayCloseButton: true });
}
