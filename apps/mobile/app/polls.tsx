import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuthStore } from '../src/stores/authStore';
import { getUserName } from '../src/utils/userHelpers';
import { usePollStore } from '../src/stores/pollStore';

export default function PollsScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const currentUser = useAuthStore((s) => s.user);
  const { polls, vote, fetchPolls, isLoading } = usePollStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchPolls(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPolls();
    setRefreshing(false);
  }, [fetchPolls]);

  const activePolls = useMemo(
    () => polls.filter((p) => p.status === 'active'),
    [polls],
  );

  const closedPolls = useMemo(
    () => polls.filter((p) => p.status === 'closed'),
    [polls],
  );

  // Build a flat list of items: section headers + polls
  const listData = useMemo(() => {
    const items: Array<{ type: 'section'; title: string; id: string } | { type: 'poll'; poll: (typeof polls)[0]; isClosed: boolean; id: string }> = [];
    if (activePolls.length > 0) {
      items.push({ type: 'section', title: 'Active Polls', id: 'section-active' });
      activePolls.forEach((poll) => items.push({ type: 'poll', poll, isClosed: false, id: poll.id }));
    }
    if (closedPolls.length > 0) {
      items.push({ type: 'section', title: 'Closed Polls', id: 'section-closed' });
      closedPolls.forEach((poll) => items.push({ type: 'poll', poll, isClosed: true, id: poll.id }));
    }
    return items;
  }, [activePolls, closedPolls]);

  const handleCreatePoll = () => {
    router.push('/create-poll');
  };

  const getWinnerOptionId = (poll: (typeof polls)[0]): string | null => {
    let maxVotes = 0;
    let winnerId: string | null = null;
    for (const opt of poll.options) {
      if (opt.votes.length > maxVotes) {
        maxVotes = opt.votes.length;
        winnerId = opt.id;
      }
    }
    return maxVotes > 0 ? winnerId : null;
  };

  const renderPollCard = (
    poll: (typeof polls)[0],
    isClosed: boolean,
  ) => {
    const totalVotes = poll.options.reduce(
      (sum, opt) => sum + opt.votes.length,
      0,
    );
    const winnerId = isClosed ? getWinnerOptionId(poll) : null;

    return (
      <View
        key={poll.id}
        style={[styles.pollCard, isClosed && styles.pollCardClosed]}
      >
        {isClosed && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>Closed</Text>
          </View>
        )}

        <Text style={styles.pollQuestion}>{poll.question}</Text>
        <Text style={styles.pollCreator}>
          Asked by {getUserName(poll.createdBy)}
        </Text>

        <View style={styles.optionsList}>
          {poll.options.map((option) => {
            const userHasVoted = option.votes.includes(currentUser?.id ?? '');
            const isWinner = isClosed && option.id === winnerId;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionRow,
                  userHasVoted && styles.optionRowVoted,
                  isWinner && styles.optionRowWinner,
                ]}
                activeOpacity={isClosed ? 1 : 0.7}
                onPress={() => {
                  if (!isClosed) {
                    vote(poll.id, option.id, currentUser?.id ?? '');
                  }
                }}
                disabled={isClosed}
              >
                {option.emoji ? <Text style={styles.optionEmoji}>{option.emoji}</Text> : null}
                <Text
                  style={[
                    styles.optionLabel,
                    userHasVoted && styles.optionLabelVoted,
                    isWinner && styles.optionLabelWinner,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.voteCountPill,
                    userHasVoted && styles.voteCountPillVoted,
                    isWinner && styles.voteCountPillWinner,
                  ]}
                >
                  <Text
                    style={[
                      styles.voteCountText,
                      userHasVoted && styles.voteCountTextVoted,
                      isWinner && styles.voteCountTextWinner,
                    ]}
                  >
                    {option.votes.length}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.totalVotes}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} total
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Decisions</Text>
        <TouchableOpacity
          onPress={handleCreatePoll}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return (
              <Text style={[styles.sectionTitle, item.id === 'section-closed' && { marginTop: spacing.xl }]}>
                {item.title}
              </Text>
            );
          }
          return renderPollCard(item.poll, item.isClosed);
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          isLoading && polls.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: spacing['3xl'] }} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={styles.sectionTitle}>No polls yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Section
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Poll card
  pollCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  pollCardClosed: {
    opacity: 0.85,
  },
  closedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.textTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  closedBadgeText: {
    ...typography.caption1,
    color: colors.textInverse,
  },
  pollQuestion: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pollCreator: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },

  // Options
  optionsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  optionRowVoted: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionRowWinner: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  optionEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  optionLabelVoted: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  optionLabelWinner: {
    color: colors.success,
    fontWeight: '600',
  },
  voteCountPill: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  voteCountPillVoted: {
    backgroundColor: colors.primary,
  },
  voteCountPillWinner: {
    backgroundColor: colors.success,
  },
  voteCountText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  voteCountTextVoted: {
    color: colors.textInverse,
  },
  voteCountTextWinner: {
    color: colors.textInverse,
  },
  totalVotes: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});
