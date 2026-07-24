import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, radius } from '../../constants/theme';
import { useAiStore, PlanSuggestion } from '../../stores/aiStore';

interface PlannerSheetProps {
  visible: boolean;
  onClose: () => void;
  onChatPrompt: (prompt: string) => void;
}

type PlanType = 'date' | 'weekend' | 'meal' | 'celebration';

const PLAN_TYPES: { key: PlanType; label: string; icon: keyof typeof Ionicons.glyphMap; subtitle: string }[] = [
  { key: 'date', label: 'Date Night', icon: 'heart-outline', subtitle: 'Ideas for quality time together' },
  { key: 'weekend', label: 'Weekend', icon: 'sunny-outline', subtitle: 'Make the most of your free time' },
  { key: 'meal', label: 'Meals', icon: 'restaurant-outline', subtitle: 'What to cook or order' },
  { key: 'celebration', label: 'Celebration', icon: 'sparkles-outline', subtitle: 'Birthdays, milestones, occasions' },
];

const VIBES: Record<PlanType, string[]> = {
  date: ['Romantic', 'Adventurous', 'Cozy', 'Outdoors', 'Creative', 'Surprise'],
  weekend: ['Active', 'Relaxed', 'Social', 'Solo', 'Creative', 'Nature'],
  meal: ['Quick & Easy', 'Healthy', 'Comfort Food', 'Try Something New', 'Meal Prep'],
  celebration: ['Intimate', 'Lively', 'Surprise', 'Classy', 'Cozy'],
};

const BUDGETS = ['Free', 'Under $30', '$30–$75', '$75+'];

export default function PlannerSheet({ visible, onClose, onChatPrompt }: PlannerSheetProps) {
  const { colors, isDark } = useTheme();
  const { requestPlan, planSuggestions, planLoading, clearPlanSuggestions } = useAiStore();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedType, setSelectedType] = useState<PlanType | null>(null);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep(0);
    setSelectedType(null);
    setSelectedVibes([]);
    setSelectedBudget(null);
    setFreeText('');
    setExpandedSteps(null);
    setError(null);
    clearPlanSuggestions();
  }, [clearPlanSuggestions]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleTypeSelect = (type: PlanType) => {
    setSelectedType(type);
    setSelectedVibes([]);
    setStep(1);
  };

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  };

  const handleGetSuggestions = async () => {
    if (!selectedType) return;
    setError(null);
    try {
      await requestPlan(selectedType, {
        vibes: selectedVibes,
        budget: selectedBudget ?? undefined,
        freeText: freeText.trim() || undefined,
      });
      setStep(2);
    } catch {
      setError('Could not generate suggestions. Please try again.');
    }
  };

  const handleChatPrompt = (prompt: string) => {
    handleClose();
    onChatPrompt(prompt);
  };

  const typeConfig = selectedType ? PLAN_TYPES.find((t) => t.key === selectedType) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => { setStep((step - 1) as 0 | 1); setError(null); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <View style={styles.headerCenter}>
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {step === 0 ? 'Plan with Smart Assistant' : step === 1 ? typeConfig?.label ?? 'Preferences' : 'Suggestions'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 0: Type picker */}
          {step === 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What would you like to plan?</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Tell us the type and we'll ask for your preferences
              </Text>
              <View style={styles.typeGrid}>
                {PLAN_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleTypeSelect(t.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' }]}>
                      <Ionicons name={t.icon} size={24} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                    <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                      {t.subtitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Step 1: Preferences */}
          {step === 1 && selectedType && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What's your vibe?</Text>
              <View style={styles.chipRow}>
                {VIBES[selectedType].map((vibe) => {
                  const active = selectedVibes.includes(vibe);
                  return (
                    <TouchableOpacity
                      key={vibe}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? '#8B5CF6' : isDark ? colors.elevated : colors.card,
                          borderColor: active ? '#8B5CF6' : colors.border,
                        },
                      ]}
                      onPress={() => toggleVibe(vibe)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{vibe}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.prefLabel, { color: colors.text }]}>Budget</Text>
              <View style={styles.chipRow}>
                {BUDGETS.map((b) => {
                  const active = selectedBudget === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? '#8B5CF6' : isDark ? colors.elevated : colors.card,
                          borderColor: active ? '#8B5CF6' : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedBudget(active ? null : b)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{b}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.prefLabel, { color: colors.text }]}>Anything specific in mind? <Text style={{ color: colors.textTertiary }}>(optional)</Text></Text>
              <View style={[styles.textInputWrap, { backgroundColor: isDark ? colors.elevated : colors.card, borderColor: colors.border }]}>
                <TextInput
                  value={freeText}
                  onChangeText={setFreeText}
                  placeholder="e.g. we love hiking, seafood, surprise elements..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={200}
                  style={[styles.textInputField, { color: colors.text }]}
                />
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#8B5CF6', opacity: planLoading ? 0.7 : 1 }]}
                onPress={handleGetSuggestions}
                disabled={planLoading}
                activeOpacity={0.8}
              >
                {planLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Get Suggestions</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Suggestions */}
          {step === 2 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {planSuggestions.length} {typeConfig?.label} Ideas
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Based on your preferences — tap any to explore further
              </Text>

              {planSuggestions.map((sug) => (
                <SuggestionCard
                  key={sug.id}
                  suggestion={sug}
                  expanded={expandedSteps === sug.id}
                  onToggleExpand={() => setExpandedSteps(expandedSteps === sug.id ? null : sug.id)}
                  onChatPrompt={handleChatPrompt}
                  colors={colors}
                  isDark={isDark}
                />
              ))}

              {planSuggestions.length === 0 && !planLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle-outline" size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Couldn't generate suggestions. Try adjusting your preferences.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => { setStep(1); clearPlanSuggestions(); }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Adjust Preferences</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface SuggestionCardProps {
  suggestion: PlanSuggestion;
  expanded: boolean;
  onToggleExpand: () => void;
  onChatPrompt: (prompt: string) => void;
  colors: any;
  isDark: boolean;
}

function SuggestionCard({ suggestion, expanded, onToggleExpand, onChatPrompt, colors, isDark }: SuggestionCardProps) {
  return (
    <View style={[styles.suggCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Tags */}
      <View style={styles.tagRow}>
        {suggestion.tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' }]}>
            <Text style={[styles.tagText, { color: '#8B5CF6' }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Title + Description */}
      <Text style={[styles.suggTitle, { color: colors.text }]}>{suggestion.title}</Text>
      <Text style={[styles.suggDesc, { color: colors.textSecondary }]}>{suggestion.description}</Text>

      {/* Cost + Duration */}
      <View style={styles.metaRow}>
        {suggestion.estimatedCost ? (
          <View style={[styles.metaBadge, { backgroundColor: isDark ? colors.elevated : colors.background }]}>
            <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{suggestion.estimatedCost}</Text>
          </View>
        ) : null}
        {suggestion.duration ? (
          <View style={[styles.metaBadge, { backgroundColor: isDark ? colors.elevated : colors.background }]}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{suggestion.duration}</Text>
          </View>
        ) : null}
      </View>

      {/* Steps (expandable) */}
      {suggestion.steps?.length > 0 && (
        <TouchableOpacity style={styles.stepsToggle} onPress={onToggleExpand} activeOpacity={0.7}>
          <Text style={[styles.stepsToggleText, { color: '#8B5CF6' }]}>
            {expanded ? 'Hide steps' : `Show ${suggestion.steps.length} steps`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#8B5CF6" />
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={[styles.stepsList, { borderTopColor: colors.border }]}>
          {suggestion.steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={() => onChatPrompt(suggestion.prompt || `Help me plan: ${suggestion.title}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={15} color="#FFFFFF" />
          <Text style={styles.chatBtnText}>Explore in Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.headline },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl ?? 40 },
  sectionTitle: { ...typography.title2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.callout, marginBottom: spacing.xl, lineHeight: 20 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  typeCard: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  typeLabel: { ...typography.subhead, fontWeight: '600' },
  typeSubtitle: { ...typography.footnote, lineHeight: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { ...typography.callout, fontWeight: '500' },
  prefLabel: { ...typography.subhead, fontWeight: '600', marginBottom: spacing.sm },
  textInputWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
    minHeight: 80,
  },
  textInputField: {
    ...typography.body,
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  primaryBtnText: { ...typography.subhead, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  secondaryBtnText: { ...typography.callout, fontWeight: '600' },
  errorText: { color: '#EF4444', ...typography.callout, marginBottom: spacing.md },
  suggCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full },
  tagText: { ...typography.caption1, fontWeight: '600', textTransform: 'capitalize' },
  suggTitle: { ...typography.headline, fontWeight: '700' },
  suggDesc: { ...typography.callout, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  metaText: { ...typography.caption1, fontWeight: '500' },
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  stepsToggleText: { ...typography.callout, fontWeight: '600' },
  stepsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNum: { ...typography.caption2, color: '#FFFFFF', fontWeight: '700' },
  stepText: { ...typography.callout, flex: 1, lineHeight: 20 },
  cardActions: { marginTop: spacing.sm },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  chatBtnText: { ...typography.callout, fontWeight: '700', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl ?? 40 },
  emptyText: { ...typography.body, textAlign: 'center', maxWidth: 260, lineHeight: 22 },
});
