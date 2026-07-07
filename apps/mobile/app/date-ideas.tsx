import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useDateIdeaStore, DateCategory } from '../src/stores/dateIdeaStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAlert } from '../src/components/AlertProvider';

const categoryAccents: Record<DateCategory, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  romantic: { color: '#EC4899', bg: '#FCE7F3', label: 'Romantic', icon: 'heart-outline' },
  adventure: { color: '#10B981', bg: '#D1FAE5', label: 'Adventure', icon: 'compass-outline' },
  chill: { color: '#3B82F6', bg: '#DBEAFE', label: 'Chill', icon: 'cafe-outline' },
  foodie: { color: '#F59E0B', bg: '#FEF3C7', label: 'Foodie', icon: 'restaurant-outline' },
};

const CATEGORIES: DateCategory[] = ['romantic', 'adventure', 'chill', 'foodie'];

export default function DateIdeasScreen() {
  const router = useRouter();
  const { ideas, addIdea, removeIdea, toggleTried, getRandomUntried } = useDateIdeaStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { showAlert } = useAlert();
  const [showAdd, setShowAdd] = useState(false);
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date Ideas</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
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
                        <View style={[styles.badge, { backgroundColor: accent.bg }]}>
                          <Ionicons name={accent.icon} size={12} color={accent.color} />
                          <Text style={[styles.badgeText, { color: accent.color }]}>{accent.label}</Text>
                        </View>
                        {idea.estimatedCost !== undefined && (
                          <View style={[styles.badge, { backgroundColor: '#F0F2F5' }]}>
                            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>~{cs}{idea.estimatedCost}</Text>
                          </View>
                        )}
                        {idea.tried && (
                          <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
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
                        <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
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
    </SafeAreaView>
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
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
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

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
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
      </SafeAreaView>
    </Modal>
  );
}

// ─── STYLES ────────────────────────────────────────────────

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
});
