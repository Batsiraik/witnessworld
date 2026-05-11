import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ww_walkthrough_v1';

export async function isWalkthroughComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setWalkthroughComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Dev / QA: clear the flag so the walkthrough shows again on next cold start (or use Welcome “Show walkthrough” in __DEV__). */
export async function clearWalkthroughProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
