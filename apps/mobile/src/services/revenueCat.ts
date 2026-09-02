import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let isConfigured = false;
let configureResolvers: Array<(ok: boolean) => void> = [];

// Notified whenever RevenueCat pushes a CustomerInfo update (critical on Android for pending purchases)
let _customerInfoListener: ((info: CustomerInfo) => void) | null = null;
export function setCustomerInfoListener(fn: ((info: CustomerInfo) => void) | null) {
  _customerInfoListener = fn;
}

function rejectAllWaiters() {
  const resolvers = configureResolvers.splice(0);
  resolvers.forEach((r) => r(false));
}

function waitForConfig(timeoutMs = 5000): Promise<boolean> {
  if (isConfigured) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      configureResolvers = configureResolvers.filter((r) => r !== resolve);
      resolve(false);
    }, timeoutMs);
    configureResolvers.push((ok) => {
      clearTimeout(timer);
      resolve(ok);
    });
  });
}

export async function initRevenueCat(userId: string): Promise<void> {
  if (isConfigured) return;

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for', Platform.OS);
    rejectAllWaiters(); // Don't leave callers hanging for 5s
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey, appUserID: userId });
    isConfigured = true;

    // Real-time subscription updates — needed on Android for pending purchases
    // (e.g., cash/bank payment methods that complete asynchronously)
    Purchases.addCustomerInfoUpdateListener((info) => {
      _customerInfoListener?.(info);
    });

    const resolvers = configureResolvers.splice(0);
    resolvers.forEach((r) => r(true));
  } catch (err) {
    console.warn('[RevenueCat] init failed:', err);
    rejectAllWaiters(); // Fail fast instead of waiting for timeout
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) {
    const ok = await waitForConfig(5000);
    if (!ok) return null;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('[RevenueCat] getCustomerInfo failed:', err);
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isConfigured) {
    const ok = await waitForConfig(5000);
    if (!ok) return null;
  }
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    if (err.userCancelled) {
      return null; // User cancelled, not an error
    }
    throw err;
  }
}

export function isPremiumFromInfo(info: CustomerInfo): boolean {
  return (
    typeof info.entitlements?.active?.pro !== 'undefined' ||
    typeof info.entitlements?.active?.family !== 'undefined'
  );
}

export function getActiveEntitlement(info: CustomerInfo): 'pro' | 'family' | 'free' {
  if (info.entitlements?.active?.family) return 'family';
  if (info.entitlements?.active?.pro) return 'pro';
  return 'free';
}

export function getExpirationDate(info: CustomerInfo): string | null {
  const familyExp = info.entitlements?.active?.family?.expirationDate;
  const proExp = info.entitlements?.active?.pro?.expirationDate;
  return familyExp || proExp || null;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isConfigured) {
    const ok = await waitForConfig(5000);
    if (!ok) return null;
  }
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.warn('[RevenueCat] restorePurchases failed:', err);
    return null;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
    isConfigured = false;
  } catch (err) {
    console.warn('[RevenueCat] logout failed:', err);
  }
}
