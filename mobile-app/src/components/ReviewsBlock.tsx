import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export type ReviewSummary = {
  average: number | null;
  count: number;
};

export type ReviewRow = {
  id: number;
  rating: number;
  title?: string | null;
  body?: string | null;
  created_at?: string;
  reviewer_label?: string;
  reviewer_username?: string;
};

type Props = {
  summary?: ReviewSummary | null;
  reviews?: ReviewRow[] | null;
  /** Shown when there are no review rows yet (under the header). */
  emptyHint?: string;
};

function stars(n: number): string {
  const rating = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export function ReviewsBlock({ summary, reviews, emptyHint }: Props) {
  const count = summary?.count ?? 0;
  const avg = summary?.average ?? null;
  const list = Array.isArray(reviews) ? reviews : [];
  const hint =
    emptyHint ??
    'Ratings and written feedback from members show here — including work booked outside the app.';
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.score}>{count > 0 && avg != null ? `${avg.toFixed(1)} (${count})` : 'No reviews yet'}</Text>
      </View>
      {count > 0 && avg != null ? <Text style={styles.stars}>{stars(avg)}</Text> : null}
      {list.length === 0 ? <Text style={styles.empty}>{hint}</Text> : null}
      {list.map((r) => (
        <View key={r.id} style={styles.review}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewAuthor}>{r.reviewer_label || r.reviewer_username || 'WWC member'}</Text>
            <Text style={styles.reviewStars}>{stars(r.rating)}</Text>
          </View>
          {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
          {r.body ? <Text style={styles.reviewBody}>{r.body}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  score: { fontSize: 13, fontWeight: '800', color: colors.goldDark },
  stars: { marginTop: 4, color: colors.gold, fontSize: 16, letterSpacing: 1 },
  empty: { marginTop: 8, color: colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  review: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  reviewAuthor: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  reviewStars: { color: colors.gold, fontSize: 12 },
  reviewTitle: { marginTop: 5, color: colors.text, fontSize: 13, fontWeight: '800' },
  reviewBody: { marginTop: 4, color: colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
