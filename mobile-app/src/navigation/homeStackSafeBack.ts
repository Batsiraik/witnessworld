/** Minimal API used by back handler (avoids route-specific navigation prop variance). */
export type HomeStackBackNavigation = {
  canGoBack(): boolean;
  goBack(): void;
  navigate(name: 'Home'): void;
};

/**
 * Header / programmatic back for the home marketplace stack.
 * If the stack has no history (common when `navigate` reused a screen as "root"),
 * `goBack()` can finish the Android activity — fall back to Home instead.
 */
export function homeStackSafeGoBack(navigation: HomeStackBackNavigation): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Home');
}
