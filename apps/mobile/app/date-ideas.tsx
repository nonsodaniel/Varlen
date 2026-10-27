import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Keyboard, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { adaptTintColor } from '../src/utils/tintColors';
import { Input } from '../src/components/ui/Input';
import { useDateIdeaStore, DateCategory } from '../src/stores/dateIdeaStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAlert } from '../src/components/AlertProvider';
import { useAiStore, PlanSuggestion } from '../src/stores/aiStore';

const categoryAccents: Record<DateCategory, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  romantic: { color: '#EC4899', bg: '#FCE7F3', label: 'Romantic', icon: 'heart-outline' },
  adventure: { color: '#10B981', bg: '#D1FAE5', label: 'Adventure', icon: 'compass-outline' },
  chill: { color: '#3B82F6', bg: '#DBEAFE', label: 'Chill', icon: 'cafe-outline' },
  foodie: { color: '#F59E0B', bg: '#FEF3C7', label: 'Foodie', icon: 'restaurant-outline' },
};

const CATEGORIES: DateCategory[] = ['romantic', 'adventure', 'chill', 'foodie'];

export default function DateIdeasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { ideas, addIdea, removeIdea, toggleTried, getRandomUntried } = useDateIdeaStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { showAlert } = useAlert();
  const { requestPlan, planSuggestions, planLoading, clearPlanSuggestions } = useAiStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'untried' | 'tried'>('all');

  const filtered = ideas.filter((idea) => {
    if (filter === 'untried') return !idea.tried;
    if (filter === 'tried') return idea.tried;
    return true;
  });

  const handleSurpriseMe = () => {
    const pick = getRandomUntried();
    if (!pick) {
      showAlert('No untried ideas', 'Add new date ideas or reset some tried ones!');
      return;
    }
    const details = [
      categoryAccents[pick.category].label,
      pick.estimatedCost !== undefined ? `~${cs}${pick.estimatedCost}` : undefined,
      pick.location || undefined,
      pick.notes || undefined,
    ].filter(Boolean).join(' · ');
    showAlert(pick.title, details || 'Go for it!', [
      { text: 'Mark as tried', onPress: () => toggleTried(pick.id) },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const handleDelete = (id: string, title: string) => {
    showAlert('Remove idea?', `Delete "${title}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeIdea(id) },
    ]);
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date Ideas</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => { clearPlanSuggestions(); setShowAiModal(true); }}
            style={styles.aiBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={18} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Smart Assistant nudge */}
        <TouchableOpacity
          style={[styles.assistantBanner, { backgroundColor: adaptTintColor('#EDE9FE', isDark), borderColor: adaptTintColor('#DDD6FE', isDark) }]}
          activeOpacity={0.75}
          onPress={() => router.push('/ai-chat?prompt=Suggest some fun date ideas for us' as any)}
        >
          <Ionicons name="sparkles" size={15} color="#8B5CF6" />
          <Text style={[styles.assistantBannerText, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>
            Smart Assistant can suggest date ideas for you
          </Text>
          <Ionicons name="chevron-forward" size={14} color={isDark ? '#A78BFA' : '#8B5CF6'} />
        </TouchableOpacity>

        {ideas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="heart-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Plan something fun together</Text>
            <Text style={styles.emptyDesc}>
              Save date ideas like romantic dinners, outdoor adventures, or cozy movie nights. Tap + to add your first idea!
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add your first idea</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Surprise Me */}
            <TouchableOpacity style={styles.surpriseBtn} onPress={handleSurpriseMe} activeOpacity={0.8}>
              <Ionicons name="shuffle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.surpriseBtnText}>Surprise me!</Text>
              <Text style={styles.surpriseHint}>Pick a random untried idea</Text>
            </TouchableOpacity>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
              {(['all', 'untried', 'tried'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'all' ? `All (${ideas.length})` : f === 'untried' ? `To try (${ideas.filter(i => !i.tried).length})` : `Done (${ideas.filter(i => i.tried).length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ideas List */}
            {filtered.length === 0 ? (
              <View style={styles.noResultsCard}>
                <Text style={styles.noResultsText}>
                  {filter === 'tried' ? 'No tried ideas yet — go on a date!' : 'All caught up! Add more ideas.'}
                </Text>
              </View>
            ) : (
              filtered.map((idea) => {
                const accent = categoryAccents[idea.category];
                return (
                  <View key={idea.id} style={[styles.card, idea.tried && styles.cardTried]}>
                    <View style={[styles.cardAccent, { backgroundColor: accent.color }]} />
                    <View style={styles.cardContent}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardTitle, idea.tried && styles.cardTitleTried]}>{idea.title}</Text>
                        <TouchableOpacity
                          onPress={() => toggleTried(idea.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.6}
                        >
                          <Ionicons
                            name={idea.tried ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={24}
                            color={idea.tried ? colors.success : colors.border}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: adaptTintColor(accent.bg, isDark) }]}>
                          <Ionicons name={accent.icon} size={12} color={accent.color} />
                          <Text style={[styles.badgeText, { color: accent.color }]}>{accent.label}</Text>
                        </View>
                        {idea.estimatedCost !== undefined && (
                          <View style={[styles.badge, { backgroundColor: colors.borderLight }]}>
                            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>~{cs}{idea.estimatedCost}</Text>
                          </View>
                        )}
                        {idea.tried && (
                          <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                            <Text style={[styles.badgeText, { color: colors.success }]}>Done!</Text>
                          </View>
                        )}
                      </View>
                      {idea.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                          <Text style={styles.cardLocation}>{idea.location}</Text>
                        </View>
                      )}
                      {idea.notes && (
                        <Text style={styles.cardNotes} numberOfLines={2}>{idea.notes}</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(idea.id, idea.title)}
                        style={styles.deleteBtn}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Add Modal */}
      <AddIdeaModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={addIdea} />

      {/* AI Suggest Modal */}
      <AiSuggestModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
        onRequestPlan={requestPlan}
        suggestions={planSuggestions}
        loading={planLoading}
        cs={cs}
        onSaveIdea={(suggestion) => {
          const categoryTag = (suggestion.tags ?? []).find((t) =>
            ['romantic', 'adventure', 'chill', 'foodie'].includes(t.toLowerCase()),
          );
          addIdea({
            title: suggestion.title,
            category: (categoryTag?.toLowerCase() as DateCategory) ?? 'romantic',
            notes: suggestion.description,
            tried: false,
          });
          setShowAiModal(false);
        }}
      />
    </View>
  );
}

// ─── ADD MODAL ─────────────────────────────────────────────

function AddIdeaModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (idea: { title: string; category: DateCategory; estimatedCost?: number; location?: string; notes?: string; tried: boolean }) => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DateCategory>('romantic');
  const [cost, setCost] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    onSave({
      title: title.trim(),
      category,
      estimatedCost: cost ? parseFloat(cost) : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      tried: false,
    });
    setTitle('');
    setCost('');
    setLocation('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Date Idea</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!title.trim()}
            style={[styles.modalSaveBtn, !title.trim() && { opacity: 0.4 }]}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Input
            label="What's the idea?"
            placeholder="e.g. Sunset picnic at the park"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((cat) => {
              const accent = categoryAccents[cat];
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, active && { backgroundColor: accent.color, borderColor: accent.color }]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={accent.icon} size={14} color={active ? '#fff' : accent.color} />
                  <Text style={[styles.catChipText, active && { color: '#fff' }]}>{accent.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Estimated cost (optional)"
            placeholder="e.g. 50"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
          />

          <Input
            label="Location (optional)"
            placeholder="e.g. The rooftop bar downtown"
            value={location}
            onChangeText={setLocation}
          />

          <Input
            label="Notes (optional)"
            placeholder="Any extra details or reminders..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top', paddingTop: spacing.md }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── AI SUGGEST MODAL ──────────────────────────────────────

function AiSuggestModal({
  visible,
  onClose,
  onRequestPlan,
  suggestions,
  loading,
  cs,
  onSaveIdea,
}: {
  visible: boolean;
  onClose: () => void;
  onRequestPlan: (type: string, preferences: { vibes?: string[]; budget?: string; freeText?: string }) => Promise<void>;
  suggestions: PlanSuggestion[];
  loading: boolean;
  cs: string;
  onSaveIdea: (suggestion: PlanSuggestion) => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [freeText, setFreeText] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [hasRequested, setHasRequested] = useState(false);

  const vibeOptions = ['Romantic', 'Outdoor', 'Cozy', 'Adventure', 'Foodie', 'Creative', 'Budget-friendly'];

  const handleGetSuggestions = async () => {
    Keyboard.dismiss();
    setHasRequested(true);
    try {
      await onRequestPlan('date', {
        vibes: selectedVibes.length > 0 ? selectedVibes : undefined,
        freeText: freeText.trim() || undefined,
      });
    } catch {
      // error handled in store
    }
  };

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Date Ideas Generator</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Prompt banner */}
          <View style={styles.aiPromptBanner}>
            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            <Text style={styles.aiPromptText}>Tell me what you're in the mood for and I'll suggest personalised date ideas</Text>
          </View>

          {/* Vibes */}
          <Text style={styles.fieldLabel}>What's the vibe?</Text>
          <View style={styles.vibeRow}>
            {vibeOptions.map((vibe) => {
              const active = selectedVibes.includes(vibe);
              return (
                <TouchableOpacity
                  key={vibe}
                  style={[styles.vibeChip, active && styles.vibeChipActive]}
                  onPress={() => toggleVibe(vibe)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.vibeChipText, active && styles.vibeChipTextActive]}>{vibe}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Free text */}
          <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
          <Input
            placeholder="e.g. something outdoors, we love food..."
            value={freeText}
            onChangeText={setFreeText}
            multiline
            numberOfLines={2}
            style={{ height: 70, textAlignVertical: 'top', paddingTop: spacing.sm }}
          />

          <TouchableOpacity
            style={[styles.aiGetBtn, loading && { opacity: 0.7 }]}
            onPress={handleGetSuggestions}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.aiGetBtnText}>{hasRequested ? 'Try again' : 'Find ideas'}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <>
              <Text style={styles.aiSuggestionsLabel}>Here are some ideas for you</Text>
              {suggestions.map((s) => (
                <View key={s.id} style={styles.aiSuggestionCard}>
                  <View style={styles.aiSuggestionTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiSuggestionTitle}>{s.title}</Text>
                      <Text style={styles.aiSuggestionDesc} numberOfLines={3}>{s.description}</Text>
                    </View>
                  </View>
                  <View style={styles.aiSuggestionMeta}>
                    {s.duration ? (
                      <View style={styles.aiMetaBadge}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.aiMetaText}>{s.duration}</Text>
                      </View>
                    ) : null}
                    {s.tags.slice(0, 2).map((tag) => (
                      <View key={tag} style={[styles.aiMetaBadge, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={[styles.aiMetaText, { color: '#8B5CF6' }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.aiSaveBtn}
                    onPress={() => onSaveIdea(s)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.aiSaveBtnText}>Save to my ideas</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── STYLES ────────────────────────────────────────────────

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
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  assistantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  assistantBannerText: {
    ...typography.footnote,
    fontWeight: '600',
    flex: 1,
  },

  // Surprise button
  surpriseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  surpriseBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  surpriseHint: {
    ...typography.caption2,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: spacing.xs,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardTried: {
    opacity: 0.7,
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitleTried: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption1,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardLocation: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  cardNotes: {
    ...typography.caption1,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  deleteBtn: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
  },

  // No results
  noResultsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.callout,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    ...shadows.md,
  },
  emptyAddBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
  },

  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.headline,
    color: colors.text,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modalSaveBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  fieldLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  catChipText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },

  // AI Suggest Modal styles
  aiPromptBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aiPromptText: {
    ...typography.callout,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  vibeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  vibeChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  vibeChipText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  vibeChipTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  budgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  budgetChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  budgetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  budgetChipText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  budgetChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  aiGetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  aiGetBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  aiSuggestionsLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  aiSuggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  aiSuggestionTop: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  aiSuggestionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aiSuggestionDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiSuggestionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aiMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
  },
  aiMetaText: {
    ...typography.caption1,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  aiSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  aiSaveBtnText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
  },
});
