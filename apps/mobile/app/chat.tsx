import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated as RNAnimated,
  Keyboard,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useChatStore, ChatMessage, PollData, ActivityCardData, DateIdeaData, LocationData, ReplyData } from '../src/stores/chatStore';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore, getResolvedHouseholdId } from '../src/stores/householdStore';
import { useModeStore } from '../src/stores/modeStore';
import { useTaskStore } from '../src/stores/taskStore';
import { useCalendarStore } from '../src/stores/calendarStore';
import { getSocket } from '../src/services/socket';
import { Avatar } from '../src/components/ui/Avatar';
import { haptics } from '../src/hooks/useHaptics';

const MODE_TITLES: Record<string, string> = {
  couple: 'Partner Chat',
  family: 'Family Chat',
  parenting: 'Family Chat',
};

const DATE_IDEAS_BY_MODE: Record<string, string[][]> = {
  couple: [
    ['Sunset picnic in the park', 'Cooking a new recipe together', 'Evening walk + ice cream'],
    ['Board game night at home', 'Visit a local museum', 'Wine tasting at home'],
    ['Drive to somewhere new', 'Stargazing night', 'Movie marathon with homemade popcorn'],
    ['Couples pottery class', 'Bike ride + brunch', 'Try a new restaurant'],
  ],
  family: [
    ['Game night with everyone', 'Backyard barbecue', 'Movie night with snacks'],
    ['Nature hike', 'Cook a meal together', 'Visit a local attraction'],
    ['DIY craft session', 'Camping in the backyard', 'Bowling or mini-golf'],
  ],
  parenting: [
    ['Bake cookies together', 'Build a blanket fort', 'Outdoor scavenger hunt'],
    ['Story time + drawing', 'Kids movie marathon', 'Simple science experiments'],
    ['Visit the playground + picnic', 'Painting session', 'Nature walk + bug spotting'],
  ],
};

function getRandomDateIdeas(mode: string): string[] {
  const sets = DATE_IDEAS_BY_MODE[mode] ?? DATE_IDEAS_BY_MODE.couple;
  return sets[Math.floor(Math.random() * sets.length)];
}

function formatTimestamp(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

function getDayLabel(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d');
  } catch {
    return '';
  }
}

// ─── Message bubble components ────────────────────────────────────────────────

function PollBubble({ poll, messageId, householdId, colors, isMine }: {
  poll: PollData; messageId: string; householdId: string; colors: any; isMine: boolean;
}) {
  const votePoll = useChatStore((s) => s.votePoll);
  const userId = useAuthStore((s) => s.user?.id);
  const myVote = userId ? poll.votes[userId] : undefined;
  const totalVotes = Object.keys(poll.votes).length;

  return (
    <View style={[styles.pollCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.pollQuestion, { color: colors.text }]}>{poll.question}</Text>
      {poll.options.map((opt, idx) => {
        const count = Object.values(poll.votes).filter((v) => v === idx).length;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isChosen = myVote === idx;
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => !poll.closed && householdId && votePoll(householdId, messageId, idx)}
            activeOpacity={0.7}
            style={[styles.pollOption, { borderColor: isChosen ? colors.primary : colors.border }]}
          >
            <View style={[styles.pollBar, { width: `${pct}%` as any, backgroundColor: colors.primary + '20' }]} />
            <View style={styles.pollOptionRow}>
              <Text style={[styles.pollOptText, { color: colors.text, fontWeight: isChosen ? '700' : '400' }]} numberOfLines={1}>{opt}</Text>
              <Text style={[styles.pollPct, { color: colors.textSecondary }]}>{totalVotes > 0 ? `${pct}%` : ''}</Text>
            </View>
            {isChosen && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.pollCheck} />}
          </TouchableOpacity>
        );
      })}
      <Text style={[styles.pollMeta, { color: colors.textTertiary }]}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
    </View>
  );
}

function ActivityCardBubble({ card, colors }: { card: ActivityCardData; colors: any }) {
  const iconMap = { task: 'checkmark-circle-outline', event: 'calendar-outline', expense: 'card-outline' } as const;
  const colorMap = { task: '#F59E0B', event: '#3B82F6', expense: '#10B981' };
  const icon = iconMap[card.activityType] ?? 'link-outline';
  const color = card.activityColor ?? colorMap[card.activityType] ?? colors.primary;

  return (
    <View style={[styles.activityCard, { backgroundColor: colors.surface, borderLeftColor: color, borderColor: colors.border }]}>
      <View style={[styles.activityIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.activityType, { color }]}>{card.activityType.charAt(0).toUpperCase() + card.activityType.slice(1)}</Text>
        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={2}>{card.activityTitle}</Text>
        {card.activityMeta ? <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>{card.activityMeta}</Text> : null}
      </View>
      {card.activityType === 'task' && (
        <View style={[styles.activityStatus, { backgroundColor: card.completed ? '#10B981' + '20' : colors.border }]}>
          <Ionicons name={card.completed ? 'checkmark' : 'time-outline'} size={12} color={card.completed ? '#10B981' : colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

function DateIdeaBubble({ idea, messageId, householdId, colors }: {
  idea: DateIdeaData; messageId: string; householdId: string; colors: any;
}) {
  const likeDateIdea = useChatStore((s) => s.likeDateIdea);
  const userId = useAuthStore((s) => s.user?.id);
  const myLike = userId ? idea.likes[userId] : undefined;
  const matched = idea.matched;

  return (
    <View style={[styles.ideaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.ideaHeader}>
        <Text style={{ fontSize: 16 }}>💡</Text>
        <Text style={[styles.ideaTitle, { color: colors.text }]}>Date Ideas</Text>
        {matched !== undefined && (
          <View style={[styles.ideaMatchBadge, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.ideaMatchText}>Match! 🎉</Text>
          </View>
        )}
      </View>
      {matched !== undefined ? (
        <View style={[styles.ideaMatchResult, { backgroundColor: '#EF444415' }]}>
          <Text style={[styles.ideaMatchResultText, { color: colors.text }]}>
            You both picked: {idea.ideas[matched]}
          </Text>
        </View>
      ) : (
        idea.ideas.map((text, idx) => {
          const isLiked = myLike === idx;
          const likeCount = Object.values(idea.likes).filter((v) => v === idx).length;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => likeDateIdea(householdId, messageId, idx)}
              activeOpacity={0.7}
              style={[styles.ideaOption, { borderColor: isLiked ? '#EF4444' : colors.border, backgroundColor: isLiked ? '#EF444410' : 'transparent' }]}
            >
              <Text style={[styles.ideaOptionText, { color: colors.text, flex: 1 }]} numberOfLines={2}>{text}</Text>
              <View style={styles.ideaLikeWrap}>
                {likeCount > 0 && <Text style={styles.ideaLikeCount}>{likeCount}</Text>}
                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#EF4444' : colors.textTertiary} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

function LocationBubble({ location, senderName, colors }: { location: LocationData; senderName: string; colors: any }) {
  const openMaps = useCallback(() => {
    Linking.openURL(location.mapsUrl).catch(() => {});
  }, [location.mapsUrl]);

  return (
    <TouchableOpacity
      onPress={openMaps}
      activeOpacity={0.8}
      style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.locationIconWrap, { backgroundColor: '#10B981' + '18' }]}>
        <Ionicons name="location" size={20} color="#10B981" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.locationTitle, { color: colors.text }]}>
          {senderName}'s location
        </Text>
        <Text style={[styles.locationAddress, { color: colors.textSecondary }]} numberOfLines={2}>
          {location.address}
        </Text>
        <Text style={[styles.locationTap, { color: '#10B981' }]}>Tap to open in Maps</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function getReplyPreview(msg: ChatMessage): string {
  if (msg.type === 'poll') return `📊 ${msg.poll?.question ?? 'Poll'}`;
  if (msg.type === 'date_idea') return '💡 Date ideas';
  if (msg.type === 'activity_card') return `📎 ${msg.activityCard?.activityTitle ?? 'Activity'}`;
  if (msg.type === 'location') return '📍 Location';
  return msg.content;
}

function ReplyQuote({ replyTo, isMine, colors }: { replyTo: ReplyData; isMine: boolean; colors: any }) {
  return (
    <View style={[
      styles.replyQuote,
      { backgroundColor: isMine ? 'rgba(255,255,255,0.18)' : colors.background, borderLeftColor: isMine ? '#fff' : colors.primary },
    ]}>
      <Text style={[styles.replyQuoteName, { color: isMine ? 'rgba(255,255,255,0.9)' : colors.primary }]} numberOfLines={1}>
        {replyTo.senderName}
      </Text>
      <Text style={[styles.replyQuoteText, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]} numberOfLines={2}>
        {replyTo.content}
      </Text>
    </View>
  );
}

// ─── Pure bubble (no gesture handling) ───────────────────────────────────────

function MessageBubble({ message, isMine, showAvatar, householdId, colors, onRetry, onDelete, isStarred }: {
  message: ChatMessage; isMine: boolean; showAvatar: boolean; householdId: string; colors: any;
  onRetry?: (msg: ChatMessage) => void;
  onDelete?: (msg: ChatMessage) => void;
  isStarred?: boolean;
}) {
  const time = formatTimestamp(message.createdAt);

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            <Avatar name={message.senderName} imageUrl={message.senderAvatar} size={28} />
          ) : null}
        </View>
      )}
      <View style={[styles.bubbleCol, isMine ? styles.bubbleColMine : styles.bubbleColTheirs]}>
        {!isMine && showAvatar && (
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>{message.senderName}</Text>
        )}
        {message.replyTo && (
          <ReplyQuote replyTo={message.replyTo} isMine={isMine} colors={colors} />
        )}
        {message.type === 'text' && (
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            { backgroundColor: isMine ? colors.primary : colors.surface },
            message._failed && { opacity: 0.55 },
          ]}>
            <Text style={[styles.bubbleText, { color: isMine ? '#fff' : colors.text }]}>{message.content}</Text>
          </View>
        )}
        {message.type === 'location' && message.location && (
          <LocationBubble location={message.location} senderName={message.senderName} colors={colors} />
        )}
        {message.type === 'nudge' && (
          <LocationBubble
            location={{ latitude: 0, longitude: 0, address: message.content, mapsUrl: '' }}
            senderName={message.senderName}
            colors={colors}
          />
        )}
        {message.type === 'poll' && message.poll && (
          <PollBubble poll={message.poll} messageId={message.id} householdId={householdId} colors={colors} isMine={isMine} />
        )}
        {message.type === 'activity_card' && message.activityCard && (
          <ActivityCardBubble card={message.activityCard} colors={colors} />
        )}
        {message.type === 'date_idea' && message.dateIdea && (
          <DateIdeaBubble idea={message.dateIdea} messageId={message.id} householdId={householdId} colors={colors} />
        )}
        {!message._failed && (
          <View style={[styles.bubbleMeta, isMine ? styles.bubbleMetaMine : styles.bubbleMetaTheirs]}>
            {isStarred && <Ionicons name="star" size={10} color="#F59E0B" />}
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{time}</Text>
            {message._pending && <Ionicons name="time-outline" size={10} color={colors.textTertiary} />}
            {isMine && !message._pending && (
              message.readBy.some((id) => id !== message.senderId)
                ? <Ionicons name="checkmark-done" size={11} color={colors.primary} />
                : <Ionicons name="checkmark" size={11} color={colors.primary + '77'} />
            )}
          </View>
        )}
        {message._failed && (
          <View style={[styles.failedRow, isMine ? styles.failedRowMine : styles.failedRowTheirs]}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
            <Text style={[styles.failedLabel, { color: colors.error }]}>Failed to send</Text>
            <TouchableOpacity onPress={() => onRetry?.(message)} style={styles.failedBtn} activeOpacity={0.7}>
              <Text style={[styles.failedBtnText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
            <Text style={[styles.failedDot, { color: colors.textTertiary }]}>·</Text>
            <TouchableOpacity onPress={() => onDelete?.(message)} style={styles.failedBtn} activeOpacity={0.7}>
              <Text style={[styles.failedBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Swipeable wrapper (swipe right → reply) ──────────────────────────────────

const SWIPE_THRESHOLD = 72;

function SwipeableMessage({
  children,
  onReply,
  onLongPress,
  colors,
}: {
  children: React.ReactNode;
  onReply?: () => void;
  onLongPress?: () => void;
  colors: any;
}) {
  const translateX = useSharedValue(0);
  const hasTriggered = useRef(false);

  const fireHaptic = useCallback(() => { haptics.selection(); }, []);
  const fireReply = useCallback(() => { onReply?.(); }, [onReply]);
  const fireLongPress = useCallback(() => {
    haptics.selection();
    onLongPress?.();
  }, [onLongPress]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([15, 10000])   // only activates on rightward swipe (raised threshold)
    .failOffsetY([-10, 10])        // fail fast on vertical motion so FlatList scroll wins
    .onUpdate((e) => {
      if (e.translationX <= 0) {
        translateX.value = 0;
        return;
      }
      // Rubber-band resistance past threshold
      const tx = e.translationX > SWIPE_THRESHOLD
        ? SWIPE_THRESHOLD + (e.translationX - SWIPE_THRESHOLD) * 0.25
        : e.translationX;
      translateX.value = tx;

      if (e.translationX >= SWIPE_THRESHOLD && !hasTriggered.current) {
        hasTriggered.current = true;
        runOnJS(fireHaptic)();
      } else if (e.translationX < SWIPE_THRESHOLD) {
        hasTriggered.current = false;
      }
    })
    .onEnd((e) => {
      if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(fireReply)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      hasTriggered.current = false;
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .maxDistance(10)
    .onStart(() => { runOnJS(fireLongPress)(); });

  const composed = Gesture.Simultaneous(panGesture, longPressGesture);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    zIndex: 1,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    transform: [{
      scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0.3, 0.75, 1], 'clamp'),
    }],
  }));

  return (
    <View style={styles.swipeContainer}>
      {/* Reply icon revealed as bubble slides right */}
      <Animated.View style={[styles.swipeBg, iconStyle]}>
        <View style={[styles.swipeReplyCircle, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
        </View>
      </Animated.View>
      <GestureDetector gesture={composed}>
        <Animated.View style={rowStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Long-press context menu ──────────────────────────────────────────────────

function MessageContextMenu({
  visible,
  message,
  isStarred,
  onClose,
  onReply,
  onStar,
  onDelete,
  colors,
  insets,
}: {
  visible: boolean;
  message: ChatMessage | null;
  isStarred: boolean;
  onClose: () => void;
  onReply: () => void;
  onStar: () => void;
  onDelete: () => void;
  colors: any;
  insets: any;
}) {
  if (!message) return null;

  const options: { label: string; icon: string; action: () => void; color: string; destructive?: boolean }[] = [
    { label: 'Reply', icon: 'arrow-undo-outline', action: onReply, color: colors.text },
    {
      label: isStarred ? 'Unstar' : 'Star',
      icon: isStarred ? 'star' : 'star-outline',
      action: onStar,
      color: '#F59E0B',
    },
    { label: 'Delete', icon: 'trash-outline', action: onDelete, color: colors.error, destructive: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.ctxBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.ctxSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.modalHandle} />
        {/* Message preview */}
        <View style={[styles.ctxPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.ctxPreviewSender, { color: colors.primary }]} numberOfLines={1}>
            {message.senderName}
          </Text>
          <Text style={[styles.ctxPreviewText, { color: colors.textSecondary }]} numberOfLines={2}>
            {getReplyPreview(message)}
          </Text>
        </View>
        {/* Action options */}
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              styles.ctxOption,
              { borderTopColor: colors.border },
              idx === 0 && { borderTopWidth: 0 },
            ]}
            onPress={() => { opt.action(); onClose(); }}
            activeOpacity={0.7}
          >
            <Ionicons name={opt.icon as any} size={20} color={opt.color} />
            <Text style={[styles.ctxOptionText, { color: opt.color }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

// ─── Poll creator modal ───────────────────────────────────────────────────────

function PollCreatorModal({ visible, onClose, onCreate, colors, insets }: {
  visible: boolean; onClose: () => void;
  onCreate: (question: string, options: string[]) => void;
  colors: any; insets: any;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const reset = () => { setQuestion(''); setOptions(['', '']); };

  const handleCreate = () => {
    const filtered = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || filtered.length < 2) return;
    onCreate(question.trim(), filtered);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHandle} />
        <Text style={[styles.modalTitle, { color: colors.text }]}>Create Poll</Text>
        <TextInput
          style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="Ask a question..."
          placeholderTextColor={colors.textTertiary}
          value={question}
          onChangeText={setQuestion}
        />
        {options.map((opt, idx) => (
          <View key={idx} style={styles.optionRow}>
            <TextInput
              style={[styles.modalInput, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder={`Option ${idx + 1}`}
              placeholderTextColor={colors.textTertiary}
              value={opt}
              onChangeText={(v) => {
                const next = [...options];
                next[idx] = v;
                setOptions(next);
              }}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => setOptions(options.filter((_, i) => i !== idx))} style={{ marginLeft: 8 }}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {options.length < 4 && (
          <TouchableOpacity onPress={() => setOptions([...options, ''])} style={styles.addOptionBtn}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addOptionText, { color: colors.primary }]}>Add option</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleCreate}
          style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, opacity: (!question.trim() || options.filter((o) => o.trim()).length < 2) ? 0.5 : 1 }]}
          activeOpacity={0.8}
        >
          <Text style={styles.modalPrimaryBtnText}>Create Poll</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Share activity modal ─────────────────────────────────────────────────────

function ShareActivityModal({ visible, onClose, onShare, colors, insets }: {
  visible: boolean; onClose: () => void;
  onShare: (card: ActivityCardData) => void;
  colors: any; insets: any;
}) {
  const tasks = useTaskStore((s) => s.tasks);
  const events = useCalendarStore((s) => s.events);
  const [tab, setTab] = useState<'task' | 'event'>('task');

  const pendingTasks = tasks.filter((t) => !t.completed).slice(0, 10);
  const upcomingEvents = events.filter((e) => new Date(e.startDate) >= new Date()).slice(0, 10);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHandle} />
        <Text style={[styles.modalTitle, { color: colors.text }]}>Share Activity</Text>
        <View style={[styles.tabRow, { borderColor: colors.border }]}>
          {(['task', 'event'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textSecondary }]}>{t === 'task' ? 'Tasks' : 'Events'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'task' ? (
          pendingTasks.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>No pending tasks</Text>
          ) : (
            pendingTasks.map((t) => (
              <TouchableOpacity key={t.id} style={[styles.shareItem, { borderColor: colors.border }]} onPress={() => {
                onShare({ activityType: 'task', activityId: t.id, activityTitle: t.title, activityMeta: t.dueDate ? `Due ${format(parseISO(t.dueDate), 'MMM d')}` : undefined, activityColor: '#F59E0B', completed: t.completed });
                onClose();
              }}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#F59E0B" />
                <Text style={[styles.shareItemText, { color: colors.text }]} numberOfLines={1}>{t.title}</Text>
              </TouchableOpacity>
            ))
          )
        ) : (
          upcomingEvents.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>No upcoming events</Text>
          ) : (
            upcomingEvents.map((e) => (
              <TouchableOpacity key={e.id} style={[styles.shareItem, { borderColor: colors.border }]} onPress={() => {
                onShare({ activityType: 'event', activityId: e.id, activityTitle: e.title, activityMeta: format(parseISO(e.startDate), 'MMM d, h:mm a'), activityColor: e.color });
                onClose();
              }}>
                <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                <Text style={[styles.shareItemText, { color: colors.text }]} numberOfLines={1}>{e.title}</Text>
              </TouchableOpacity>
            ))
          )
        )}
      </View>
    </Modal>
  );
}

// ─── Action toolbar ───────────────────────────────────────────────────────────

function ActionBar({ mode, onAction, colors }: {
  mode: string;
  onAction: (type: 'poll' | 'activity' | 'date_idea' | 'location') => void;
  colors: any;
}) {
  const actions = [
    { type: 'poll' as const, icon: 'bar-chart-outline', label: 'Poll', color: '#8B5CF6' },
    { type: 'activity' as const, icon: 'link-outline', label: 'Activity', color: '#3B82F6' },
    ...(mode === 'couple' ? [{ type: 'date_idea' as const, icon: 'heart-outline', label: 'Date ideas', color: '#EF4444' }] : []),
    { type: 'location' as const, icon: 'navigate-outline', label: 'Location', color: '#10B981' },
  ];

  return (
    <View style={[styles.actionBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      {actions.map((a) => (
        <TouchableOpacity key={a.type} onPress={() => onAction(a.type)} style={styles.actionBtn} activeOpacity={0.7}>
          <View style={[styles.actionIconWrap, { backgroundColor: a.color + '18' }]}>
            <Ionicons name={a.icon as any} size={18} color={a.color} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ names, colors }: { names: string[]; colors: any }) {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: RNAnimated.Value, delay: number) =>
      RNAnimated.loop(RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.timing(dot, { toValue: -4, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(dot, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]));
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  if (names.length === 0) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`;

  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingBubble, { backgroundColor: colors.surface }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <RNAnimated.View key={i} style={[styles.typingDot, { backgroundColor: colors.textTertiary, transform: [{ translateY: dot }] }]} />
        ))}
      </View>
      <Text style={[styles.typingLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ─── Chat wallpaper (subtle dot pattern) ─────────────────────────────────────

function ChatWallpaper({ colors }: { colors: any }) {
  return (
    <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <Circle cx="12" cy="12" r="1.4" fill={colors.primary + '18'} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

// ─── Main chat screen ─────────────────────────────────────────────────────────

const EMPTY_MESSAGES: ChatMessage[] = [];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const mode = useModeStore((s) => s.mode);
  const storeHid = useHouseholdStore((s) => s.householdId);
  // Fall back to user.householdId when mode isolation returns null (e.g. couple mode
  // with no dedicated household yet). The user explicitly opened chat so using their
  // primary household is correct; mode isolation still applies to all other screens.
  const householdId = storeHid ?? getResolvedHouseholdId() ?? user?.householdId ?? '';

  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const messages = useChatStore((s) => s.messagesByHousehold[householdId] ?? EMPTY_MESSAGES);
  const typingByHousehold = useChatStore((s) => s.typingByHousehold);
  const isLoading = useChatStore((s) => s.isLoading);
  const starredMessages = useChatStore((s) => s.starredMessages);
  const starMessage = useChatStore((s) => s.starMessage);
  const unstarMessage = useChatStore((s) => s.unstarMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const typingUsers = useMemo(
    () => (typingByHousehold[householdId] ?? []).filter((t) => t.userId !== user?.id && t.expiresAt > Date.now()),
    [typingByHousehold, householdId, user?.id]
  );

  const fetchHousehold = useHouseholdStore((s) => s.fetchHousehold);
  const members = useHouseholdStore((s) => s.members);
  const clearHousehold = useChatStore((s) => s.clearHousehold);
  const hasPartner = mode !== 'couple' || members.length > 0;

  const [text, setText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [isResolvingHousehold, setIsResolvingHousehold] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyData | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);

  const title = MODE_TITLES[mode] ?? 'Chat';

  // Resolve household on mount. When storeHid is null (mode isolation cleared it),
  // seed the store with user.householdId so fetchHousehold() can bypass the early-return
  // guard and actually load the household data.
  useEffect(() => {
    const resolve = async () => {
      if (storeHid) return;
      const userHid = useAuthStore.getState().user?.householdId;
      if (userHid) {
        // Seed directly so fetchHousehold reads a valid hid
        useHouseholdStore.setState({ householdId: userHid });
      }
      setIsResolvingHousehold(true);
      try { await fetchHousehold(); } catch {}
      setIsResolvingHousehold(false);
    };
    resolve();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (householdId) {
      fetchMessages(householdId);
      markRead(householdId);
    }
  }, [householdId]);

  // Re-mark messages as read when new ones arrive while the screen is open
  useEffect(() => {
    if (!householdId || messages.length === 0) return;
    const timer = setTimeout(() => markRead(householdId), 500);
    return () => clearTimeout(timer);
  }, [messages.length, householdId]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    isNearBottomRef.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 150;
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  // Auto-scroll when new messages arrive: always if near bottom, always for own messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg?.senderId === useAuthStore.getState().user?.id;
    if (!isNearBottomRef.current && !isOwnMessage) return;
    const timer = setTimeout(() => scrollToBottom(true), 120);
    return () => clearTimeout(timer);
  }, [messages.length, scrollToBottom]);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // Periodically remove expired typing users
  useEffect(() => {
    if (!householdId) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const current = useChatStore.getState().typingByHousehold[householdId] ?? [];
      const filtered = current.filter((t) => t.expiresAt > now);
      if (filtered.length !== current.length) {
        useChatStore.setState((s) => ({
          typingByHousehold: { ...s.typingByHousehold, [householdId]: filtered },
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [householdId]);

  const emitTyping = useCallback(() => {
    if (!typingTimer.current) {
      const socket = getSocket();
      if (socket?.connected && householdId) {
        socket.emit('chat:typing', { householdId, name: user?.name });
      }
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { typingTimer.current = null; }, 3000);
  }, [householdId, user?.name]);

  const handleTextChange = useCallback((v: string) => {
    setText(v);
    if (v.trim()) emitTyping();
  }, [emitTyping]);

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo({
      messageId: msg.id,
      senderName: msg.senderName,
      content: getReplyPreview(msg),
      type: msg.type,
    });
    setShowActions(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    if (!householdId) {
      Alert.alert('Not ready', 'Setting up your chat space… please try again in a moment.');
      fetchHousehold();
      return;
    }
    const currentReply = replyTo;
    setText('');
    setReplyTo(null);
    setShowActions(false);
    await sendMessage(householdId, {
      senderId: user?.id ?? '',
      senderName: user?.name ?? '',
      senderAvatar: user?.avatarUrl,
      type: 'text',
      content,
      replyTo: currentReply ?? undefined,
    });
  }, [text, householdId, user, sendMessage, fetchHousehold, replyTo]);

  const handleDeleteMessage = useCallback((msg: ChatMessage) => {
    if (!householdId) return;
    deleteMessage(householdId, msg.id);
  }, [householdId, deleteMessage]);

  const handleRetry = useCallback(async (msg: ChatMessage) => {
    if (!householdId) return;
    useChatStore.setState((s) => {
      const existing = s.messagesByHousehold[householdId] ?? [];
      return {
        messagesByHousehold: {
          ...s.messagesByHousehold,
          [householdId]: existing.filter((m) => m.id !== msg.id),
        },
      };
    });
    await sendMessage(householdId, {
      senderId: user?.id ?? '',
      senderName: user?.name ?? '',
      senderAvatar: user?.avatarUrl,
      type: msg.type,
      content: msg.content,
      poll: msg.poll,
      activityCard: msg.activityCard,
      dateIdea: msg.dateIdea,
      location: msg.location,
    });
  }, [householdId, user, sendMessage]);

  const handleAction = useCallback(async (type: 'poll' | 'activity' | 'date_idea' | 'location') => {
    if (!householdId) {
      Alert.alert('Not ready', 'Setting up your chat space… please try again in a moment.');
      fetchHousehold();
      return;
    }
    setShowActions(false);
    if (type === 'poll') { setShowPollModal(true); return; }
    if (type === 'activity') { setShowActivityModal(true); return; }
    if (type === 'date_idea') {
      const ideas = getRandomDateIdeas(mode);
      sendMessage(householdId, {
        senderId: user?.id ?? '',
        senderName: user?.name ?? '',
        senderAvatar: user?.avatarUrl,
        type: 'date_idea',
        content: 'Pick a date idea 💑',
        dateIdea: { ideas, likes: {} },
      });
      return;
    }
    if (type === 'location') {
      setIsSendingLocation(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ExpoLocation = require('expo-location');
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsSendingLocation(false);
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;

        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const [geo] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            const parts = [geo.name, geo.street, geo.city, geo.region].filter(Boolean);
            address = parts.join(', ');
          }
        } catch { /* use coordinates as fallback */ }

        const mapsUrl = Platform.OS === 'ios'
          ? `maps://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(address)}`
          : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        await sendMessage(householdId, {
          senderId: user?.id ?? '',
          senderName: user?.name ?? '',
          senderAvatar: user?.avatarUrl,
          type: 'location',
          content: `${user?.name ?? 'Someone'} shared their location`,
          location: { latitude, longitude, address, mapsUrl },
        });
      } catch (err) {
        console.warn('[chat] location share failed:', err);
      } finally {
        setIsSendingLocation(false);
      }
    }
  }, [mode, householdId, user, sendMessage, fetchHousehold]);

  const handlePollCreate = useCallback((question: string, options: string[]) => {
    if (!householdId) return;
    sendMessage(householdId, {
      senderId: user?.id ?? '',
      senderName: user?.name ?? '',
      senderAvatar: user?.avatarUrl,
      type: 'poll',
      content: question,
      poll: { question, options, votes: {} },
    });
  }, [householdId, user, sendMessage]);

  const handleShareActivity = useCallback((card: ActivityCardData) => {
    if (!householdId) return;
    sendMessage(householdId, {
      senderId: user?.id ?? '',
      senderName: user?.name ?? '',
      senderAvatar: user?.avatarUrl,
      type: 'activity_card',
      content: `Shared a ${card.activityType}: ${card.activityTitle}`,
      activityCard: card,
    });
  }, [householdId, user, sendMessage]);

  // ─── Context menu handlers ────────────────────────────────────────────────

  const handleContextMenuReply = useCallback(() => {
    if (!selectedMessage) return;
    handleReply(selectedMessage);
  }, [selectedMessage, handleReply]);

  const handleContextMenuStar = useCallback(() => {
    if (!selectedMessage) return;
    if (starredMessages.includes(selectedMessage.id)) {
      unstarMessage(selectedMessage.id);
    } else {
      starMessage(selectedMessage.id);
    }
  }, [selectedMessage, starredMessages, starMessage, unstarMessage]);

  const handleContextMenuDelete = useCallback(() => {
    if (!selectedMessage || !householdId) return;
    deleteMessage(householdId, selectedMessage.id);
  }, [selectedMessage, householdId, deleteMessage]);

  // ─── Message list ─────────────────────────────────────────────────────────

  const messageData = useMemo(() => {
    const result: Array<ChatMessage | { type: 'date_sep'; label: string; key: string }> = [];
    let lastDay = '';
    messages.forEach((m) => {
      const day = getDayLabel(m.createdAt);
      if (day !== lastDay) {
        result.push({ type: 'date_sep', label: day, key: `sep-${m.id}` });
        lastDay = day;
      }
      result.push(m);
    });
    return result;
  }, [messages]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'date_sep') {
      return (
        <View style={styles.dateSepRow}>
          <View style={[styles.dateSepLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dateSepText, { color: colors.textTertiary }]}>{item.label}</Text>
          <View style={[styles.dateSepLine, { backgroundColor: colors.border }]} />
        </View>
      );
    }
    const msg = item as ChatMessage;
    const isMine = msg.senderId === user?.id;
    const prev = messageData[index - 1];
    const showAvatar = !isMine && (
      !prev || (prev as any).type === 'date_sep' || (prev as ChatMessage).senderId !== msg.senderId
    );
    const isStarred = starredMessages.includes(msg.id);
    return (
      <SwipeableMessage
        onReply={() => handleReply(msg)}
        onLongPress={() => setSelectedMessage(msg)}
        colors={colors}
      >
        <MessageBubble
          message={msg}
          isMine={isMine}
          showAvatar={showAvatar}
          householdId={householdId}
          colors={colors}
          onRetry={handleRetry}
          onDelete={handleDeleteMessage}
          isStarred={isStarred}
        />
      </SwipeableMessage>
    );
  }, [user?.id, householdId, colors, messageData, handleRetry, handleDeleteMessage, handleReply, starredMessages]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/people')} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          {typingUsers.length > 0 && (
            <Text style={[styles.headerTyping, { color: colors.primary }]} numberOfLines={1}>
              {typingUsers.map((t) => t.name).join(', ')} typing...
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerAction} activeOpacity={0.7} onPress={() => setShowInfoSheet(true)}>
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Soft dot-pattern wallpaper */}
        <ChatWallpaper colors={colors} />

        {/* Location sending overlay */}
        {isSendingLocation && (
          <View style={styles.locationOverlay}>
            <View style={[styles.locationOverlayCard, { backgroundColor: colors.surface }]}>
              <ActivityIndicator color="#10B981" size="small" />
              <Text style={[styles.locationOverlayText, { color: colors.text }]}>Getting your location…</Text>
            </View>
          </View>
        )}

        {/* Message list */}
        {(isLoading || isResolvingHousehold) && messages.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasPartner ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: spacing.md }}>💑</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No partner yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Invite your partner to start chatting together
            </Text>
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
              onPress={() => router.push('/invite')}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text style={[styles.inviteBtnText, { color: '#fff' }]}>Send invite</Text>
            </TouchableOpacity>
          </View>
        ) : !householdId ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: spacing.md }}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Chat not available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Invite your partner to start chatting together
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: spacing.md }}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start the conversation</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Send a message, start a poll, or share an activity
            </Text>
          </View>
        ) : (
          <FlatList
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ref={listRef}
            data={messageData}
            keyExtractor={(item) => (item as any).id ?? (item as any).key}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            windowSize={21}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={25}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onContentSizeChange={() => {
              if (isNearBottomRef.current) scrollToBottom(false);
            }}
          />
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator names={typingUsers.map((t) => t.name)} colors={colors} />
        )}

        {/* Action bar (expandable) */}
        {showActions && (
          <ActionBar mode={mode} onAction={handleAction} colors={colors} />
        )}

        {/* Reply preview bar */}
        {replyTo && (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border, borderLeftColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyBarName, { color: colors.primary }]} numberOfLines={1}>
                Replying to {replyTo.senderName}
              </Text>
              <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.warning} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        {hasPartner && <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom + 4 }]}>
          <TouchableOpacity
            onPress={() => { setShowActions((v) => !v); Keyboard.dismiss(); }}
            style={[styles.inputAction, { backgroundColor: showActions ? colors.primary + '20' : colors.background }]}
            activeOpacity={0.7}
          >
            <Ionicons name={showActions ? 'close' : 'add'} size={20} color={showActions ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            onFocus={() => setShowActions(false)}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
            activeOpacity={0.7}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={16} color={text.trim() ? '#fff' : colors.textTertiary} />
          </TouchableOpacity>
        </View>}
      </KeyboardAvoidingView>

      <PollCreatorModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreate={handlePollCreate}
        colors={colors}
        insets={insets}
      />
      <ShareActivityModal
        visible={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onShare={handleShareActivity}
        colors={colors}
        insets={insets}
      />
      <MessageContextMenu
        visible={selectedMessage !== null}
        message={selectedMessage}
        isStarred={selectedMessage ? starredMessages.includes(selectedMessage.id) : false}
        onClose={() => setSelectedMessage(null)}
        onReply={handleContextMenuReply}
        onStar={handleContextMenuStar}
        onDelete={handleContextMenuDelete}
        colors={colors}
        insets={insets}
      />

      {/* ── Chat Info Sheet ── */}
      <Modal visible={showInfoSheet} transparent animationType="slide" onRequestClose={() => setShowInfoSheet(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowInfoSheet(false)} />
        <View style={[styles.infoSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>

          {/* Members */}
          {members.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={[styles.infoSectionLabel, { color: colors.textTertiary }]}>MEMBERS</Text>
              {members.map((m) => (
                <View key={m.id} style={styles.infoMemberRow}>
                  <View style={[styles.infoAvatar, { backgroundColor: colors.primary + '22' }]}>
                    <Text style={[styles.infoAvatarText, { color: colors.primary }]}>
                      {(m.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.infoMemberName, { color: colors.text }]}>{m.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={[styles.infoSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <TouchableOpacity
              style={styles.infoActionRow}
              activeOpacity={0.7}
              onPress={() => {
                setShowInfoSheet(false);
                Alert.alert(
                  'Clear conversation',
                  'This will remove all messages from this chat on your device. Your partner\'s messages are not affected.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => clearHousehold(householdId),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.infoActionText, { color: '#EF4444' }]}>Clear conversation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.headline },
  headerTyping: { ...typography.caption2, marginTop: 1 },
  headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { ...typography.title3, textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, textAlign: 'center', lineHeight: 22 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  inviteBtnText: { ...typography.subhead, fontWeight: '600' },

  messageList: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },

  dateSepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, gap: spacing.sm },
  dateSepLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateSepText: { ...typography.caption2, paddingHorizontal: spacing.xs },

  // Swipeable message wrapper
  swipeContainer: { position: 'relative', overflow: 'hidden' },
  swipeBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  swipeReplyCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  bubbleRow: { flexDirection: 'row', marginBottom: spacing.xs, alignItems: 'flex-end' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32, marginRight: spacing.xs, alignItems: 'center' },
  bubbleCol: { maxWidth: '78%' },
  bubbleColMine: { alignItems: 'flex-end' },
  bubbleColTheirs: { alignItems: 'flex-start' },
  senderName: { ...typography.caption2, marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  bubbleText: { ...typography.callout, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, paddingHorizontal: 4, flexWrap: 'wrap' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  retryText: { fontSize: 10, fontWeight: '600' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 2, flexWrap: 'wrap' },
  failedRowMine: { justifyContent: 'flex-end' },
  failedRowTheirs: { justifyContent: 'flex-start' },
  failedLabel: { fontSize: 11, fontWeight: '500' },
  failedDot: { fontSize: 11 },
  failedBtn: { paddingVertical: 1 },
  failedBtnText: { fontSize: 11, fontWeight: '700' },

  // Reply quote inside bubble
  replyQuote: {
    borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5,
    marginBottom: 4, maxWidth: '100%',
  },
  replyQuoteName: { fontSize: 11, fontWeight: '700', marginBottom: 1 },
  replyQuoteText: { fontSize: 12, lineHeight: 16 },

  // Reply preview bar above input
  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  replyBarName: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  replyBarText: { fontSize: 12, lineHeight: 16 },
  bubbleMetaMine: { justifyContent: 'flex-end' },
  bubbleMetaTheirs: { justifyContent: 'flex-start' },
  bubbleTime: { ...typography.caption2 },

  // Poll
  pollCard: {
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md, minWidth: 220, maxWidth: 280,
  },
  pollQuestion: { ...typography.subhead, marginBottom: spacing.sm },
  pollOption: {
    borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.xs,
    paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden', position: 'relative',
  },
  pollBar: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: radius.md },
  pollOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pollOptText: { ...typography.callout, flex: 1 },
  pollPct: { ...typography.caption2, marginLeft: 8 },
  pollCheck: { position: 'absolute', right: 8, top: 10 },
  pollMeta: { ...typography.caption2, marginTop: spacing.xs },

  // Activity card
  activityCard: {
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3, flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.sm, minWidth: 220, maxWidth: 280,
  },
  activityIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityType: { ...typography.caption2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  activityTitle: { ...typography.subhead, marginTop: 2 },
  activityMeta: { ...typography.caption2, marginTop: 2 },
  activityStatus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Date ideas
  ideaCard: {
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md, minWidth: 240, maxWidth: 300,
  },
  ideaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  ideaTitle: { ...typography.subhead, flex: 1 },
  ideaMatchBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  ideaMatchText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ideaMatchResult: { borderRadius: radius.md, padding: spacing.md },
  ideaMatchResultText: { ...typography.callout, textAlign: 'center', fontWeight: '600' },
  ideaOption: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.md,
    borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 12, marginBottom: spacing.xs,
  },
  ideaOptionText: { ...typography.callout },
  ideaLikeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  ideaLikeCount: { ...typography.caption2, color: '#EF4444', fontWeight: '700' },

  // Location
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md, minWidth: 220, maxWidth: 280,
  },
  locationIconWrap: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  locationTitle: { ...typography.subhead, fontWeight: '600' },
  locationAddress: { ...typography.caption1, marginTop: 2, lineHeight: 16 },
  locationTap: { ...typography.caption2, marginTop: 4, fontWeight: '600' },
  locationOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 10,
  },
  locationOverlayCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  locationOverlayText: { ...typography.callout, fontWeight: '600' },

  // Typing indicator
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xs, gap: spacing.sm },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  typingLabel: { ...typography.caption2 },

  // Action bar
  actionBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', gap: 4 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...typography.caption2 },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: 8, gap: spacing.sm },
  inputAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, maxHeight: 120, ...typography.callout },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

  // Context menu (long press)
  ctxBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  ctxSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 0,
  },
  ctxPreview: {
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  ctxPreviewSender: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  ctxPreviewText: { ...typography.callout, lineHeight: 18 },
  ctxOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctxOptionText: { ...typography.callout, fontWeight: '600' },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20, maxHeight: '80%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.headline, marginBottom: spacing.md },
  modalInput: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: spacing.sm, ...typography.callout },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  addOptionText: { ...typography.callout },
  modalPrimaryBtn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  modalPrimaryBtnText: { color: '#fff', ...typography.callout, fontWeight: '700' },

  // Info sheet
  infoSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg, paddingTop: 12,
  },
  infoTitle: { ...typography.headline, textAlign: 'center', marginBottom: spacing.lg },
  infoSection: { marginBottom: spacing.md },
  infoSectionLabel: { ...typography.caption1, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm },
  infoMemberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  infoAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  infoAvatarText: { fontSize: 15, fontWeight: '700' },
  infoMemberName: { ...typography.callout, fontWeight: '500' },
  infoActionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoActionText: { ...typography.callout, fontWeight: '600' },

  // Share activity modal
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabLabel: { ...typography.callout, fontWeight: '600' },
  shareItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  shareItemText: { ...typography.callout, flex: 1 },
  emptyHint: { ...typography.callout, textAlign: 'center', paddingVertical: spacing.xl },
});
