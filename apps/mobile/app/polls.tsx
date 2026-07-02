import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { currentUser, getUserName } from '../src/data/mock';
import { usePollStore } from '../src/stores/pollStore';

export default function PollsScreen() {
  const router = useRouter();
  const { polls, vote } = usePollStore();

  const activePolls = useMemo(
    () => polls.filter((p) => p.status === 'active'),
    [polls],
  );

  const closedPolls = useMemo(
    () => polls.filter((p) => p.status === 'closed'),
    [polls],
  );

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
            const userHasVoted = option.votes.includes(currentUser.id);
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
                    vote(poll.id, option.id, currentUser.id);
                  }
                }}
                disabled={isClosed}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Polls */}
        {activePolls.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Polls</Text>
            {activePolls.map((poll) => renderPollCard(poll, false))}
          </>
        )}

        {/* Closed Polls */}
        {closedPolls.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
              Closed Polls
            </Text>
            {closedPolls.map((poll) => renderPollCard(poll, true))}
          </>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
