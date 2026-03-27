import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Surfaces JS crashes instead of leaving Expo Go stuck on the loading / splash layer. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>Something broke in JavaScript</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.msg} selectable>
              {this.state.error.message}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.danger, marginBottom: 12 },
  scroll: { flexGrow: 0, maxHeight: '70%' },
  msg: { fontSize: 14, color: colors.text },
});
