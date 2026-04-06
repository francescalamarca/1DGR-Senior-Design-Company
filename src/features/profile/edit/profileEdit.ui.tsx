// src/features/profile/edit/profileEdit.ui.tsx
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";

import type { OpenRole } from "@/src/features/profile/profile.types";
import { hasProfileChanged, type DraftProfile } from "./profileEdit.compare";
import { BtnText, LLightText } from "./profileEdit.components";
import { BACKGROUND_COLOR_OPTIONS, 
  CORE_VALUES, 
  SKILLS,
  SALARY_OPTIONS,
  WORK_TYPE_OPTIONS,
  ROLE_TYPES,
 } from "./profileEdit.constants";
import { useUI, useEditStyles } from "./profileEdit.styles";
import { Route } from "expo-router/build/Route";
import { router } from "expo-router";
import { styleText } from "node:util";
import { useProfileEditController } from "./useProfileEditController";

// ---------- Types the screen expects ----------
export type IndustryRow =
  | { type: "header"; title: string }
  | { type: "option"; category: string; label: string; key: string };

export type CityRow = {
  id: string;
  city: string;
  state: string;
  population: number;
  label: string;
  labelLower: string;
  cityLower: string;
};

// ---------- Modal layout constants ----------
const MODAL_KB_OFFSET_IOS = 12;
const MODAL_LIST_BOTTOM_PADDING = Platform.OS === "ios" ? 280 : 320;

// ---------- Shared UI helpers ----------
function GroupCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

function PickerRow({
  title,
  subtitle,
  onPress,
  disabled,
  showDivider,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  showDivider?: boolean;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.rowPressable, { opacity: disabled ? 0.5 : 1 }]}
      hitSlop={8}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <LLightText style={styles.rowTitle}>{title}</LLightText>
          {subtitle ? (
            <LLightText style={styles.rowSub} numberOfLines={2}>
              {subtitle}
            </LLightText>
          ) : null}
        </View>
        <LLightText style={styles.chevron}>›</LLightText>
      </View>

      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}

// ---------- Sections ----------
export function AvatarSection(props: {
  avatarPreviewUri: string;
  pickingAvatarImage: boolean;
  isSaving: boolean;
  hasAvatar: boolean;
  onPickAvatarImage: () => void;
  onRemoveAvatarImage: () => void;
  onSetAvatarFromUrl: (url: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    avatarPreviewUri,
    pickingAvatarImage,
    isSaving,
    hasAvatar,
    onPickAvatarImage,
    onRemoveAvatarImage,
    onSetAvatarFromUrl,
  } = props;
  const [urlInput, setUrlInput] = React.useState("");

  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 17 }]}>
        Logo
      </LLightText>
      <LLightText style={styles.sectionHelper}>
        Add a company logo image here.
      </LLightText>

      <View
        style={[
          styles.inlineCard,
          {
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          },
        ]}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ui.border,
            overflow: "hidden",
            backgroundColor: "#f3f3f3",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarPreviewUri ? (
            <Image
              source={{ uri: avatarPreviewUri }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <LLightText style={{ opacity: 0.5 }}>—</LLightText>
          )}
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <LLightText style={{ fontSize: 12, opacity: 0.6 }}>
            Displays over video thumbnail
          </LLightText>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onPickAvatarImage}
              disabled={pickingAvatarImage || isSaving}
              style={[
                styles.pill,
                { flex: 1 },
                pickingAvatarImage || isSaving ? { opacity: 0.5 } : null,
              ]}
            >
              {pickingAvatarImage ? (
                <ActivityIndicator size="small" color="black" />
              ) : null}
              <BtnText>Choose</BtnText>
            </Pressable>

            <Pressable
              onPress={onRemoveAvatarImage}
              disabled={!hasAvatar || isSaving}
              style={[
                styles.pill,
                {
                  flex: 1,
                  borderColor:
                    hasAvatar && !isSaving ? ui.danger : ui.borderStrong,
                },
                !hasAvatar || isSaving ? { opacity: 0.4 } : null,
              ]}
            >
              <BtnText
                style={{
                  color: hasAvatar && !isSaving ? ui.danger : undefined,
                }}
              >
                Remove
              </BtnText>
            </Pressable>
          </View>

          {/* URL input row */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput className = "input"
              style={[styles.input, { flex: 1, fontSize: 12 }]}
              placeholder="Paste image URL"
              placeholderTextColor={ui.hint}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isSaving}
            />
            <Pressable
              onPress={() => {
                if (urlInput.trim()) {
                  onSetAvatarFromUrl(urlInput.trim());
                  setUrlInput("");
                }
              }}
              disabled={!urlInput.trim() || isSaving}
              style={[
                styles.pill,
                { paddingHorizontal: 14 },
                !urlInput.trim() || isSaving ? { opacity: 0.4 } : null,
              ]}
            >
              <BtnText>Use URL</BtnText>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

//altered to fit the name we need here which is company only
export function NameSection(props: {
  companyName: string;
  onChangeCompanyName: (v: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { companyName, onChangeCompanyName } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Company Name</LLightText>

      <View style={styles.fieldStack}>
        <LLightText style={styles.label}>Company Name</LLightText>
        <TextInput className = "input"
          value={companyName}
          onChangeText={onChangeCompanyName}
          placeholder="Company Name"
          placeholderTextColor={ui.hint}
          style={styles.input}
        />
      </View>
    </>
  );
}

export function BackgroundColorSection(props: {
  selectedColor: string;
  onSelect: (color: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { selectedColor, onSelect } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Background Color</LLightText>
      <LLightText style={styles.sectionHelper}>Choose up to 1.</LLightText>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 12,
        }}
      >
        {BACKGROUND_COLOR_OPTIONS.map((color) => {
          const selected = selectedColor === color.value;
          return (
            <Pressable
              key={color.value}
              onPress={() => onSelect(selected ? "" : color.value)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: color.value,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? ui.text : "transparent",
              }}
            >
              {selected ? (
                <LLightText style={{ color: "#fff", fontSize: 18 }}>
                  ✓
                </LLightText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export function MissionSection(props: {
  mission: string;
  onChangeMission: (v: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { mission, onChangeMission } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Mission</LLightText>
      <LLightText style={styles.sectionHelper}>
        The mission of the company.
      </LLightText>

      <View style={styles.fieldStack}>
        <TextInput className = "input"
          value={mission?.trim().length ? mission : ""}
          onChangeText={onChangeMission}
          placeholder="Write something about the mission…"
          placeholderTextColor={ui.hint}
          style={styles.inputMultiline}
          multiline
        />
      </View>
    </>
  );
}

export function CompanyCultureSection(props: {
  culture: string;
  onChangeCulture: (v: string) => void;
  showCulture: boolean;
  onToggleShowCulture: (val: boolean ) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {culture, onChangeCulture, showCulture, onToggleShowCulture} = props;

  return (
    <>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}> 
      <LLightText style={styles.sectionTitle}> Culture </LLightText>
      <Switch
          value={showCulture ?? true}
          onValueChange={onToggleShowCulture}
          trackColor={{ false: ui.hint, true: ui.text }}
        />
    </View>
    <LLightText style = {styles.sectionHelper}>Company culture, ideals we value, how we treat employees, etc...</LLightText>
    <View style = {styles.fieldStack}>
      <TextInput className = "input"
      value = {culture?.trim().length ? culture : ""}
      onChangeText = {onChangeCulture}
      placeholder="Write something about the company culture..."
      placeholderTextColor={ui.hint}
      style={styles.inputMultiline}
      multiline
      />
    </View>
    </>
  );
}

export function BenefitsSection(props: {
  benefits: string;
  onChangeBenefits: (v: string) => void;
  showBenefits: boolean;
  onToggleShowBenefits: (val: boolean) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { benefits, onChangeBenefits, showBenefits, onToggleShowBenefits} = props;

  return (
    <>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}> 
      <LLightText style={styles.sectionTitle}> Benefits </LLightText>
      <Switch
          value={showBenefits ?? true}
          onValueChange={onToggleShowBenefits}
          trackColor={{ false: ui.hint, true: ui.text }}
        />
    </View>
      <LLightText style={styles.sectionHelper}>
        The benefits of the company. 401k, work schedule, overtime, etc.
      </LLightText>
      <View style={styles.fieldStack}>
        <TextInput className = "input"
          value={benefits?.trim().length ? benefits : ""}
          onChangeText={onChangeBenefits}
          placeholder="Write something about the benefits..."
          placeholderTextColor={ui.hint}
          style={styles.inputMultiline}
          multiline
        />
      </View>
    </>
  );
}

//TODO COME BACK TO THIS ADD THE TOGGLES TO SHOW ON PROFILE
export function IndustryTypeSection(props: {
  companyAgeSubtitle: string;
  showAge: boolean;
  onToggleShowAge: (val: boolean) => void;
  onPressCompanyAge: () => void;
  industrySubtitle: string;
  showIndustry: boolean;
  onToggleShowIndustry: (val: boolean) => void;
  onPressIndustry: () => void;
  locations: string[];
  showLocations: boolean;
  onToggleShowLocations: (val: boolean) => void;
  onPressAddLocation: () => void;
  onRemoveLocation: (label: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    companyAgeSubtitle,
    industrySubtitle,
    locations,
    onPressCompanyAge,
    onPressIndustry,
    onPressAddLocation,
    onRemoveLocation,
    showAge,
    onToggleShowAge,
    showIndustry,
    onToggleShowIndustry,
    showLocations,
    onToggleShowLocations,
  } = props;
  return (
    <>
      <LLightText style={styles.sectionTitle}>Company Logistics</LLightText>
      <LLightText style={styles.sectionHelper}>
        Residency requirements, company age, work, and location.
      </LLightText>

      <GroupCard>

        <PickerRow
          title="Company Age (years)"
          subtitle={companyAgeSubtitle}
          onPress={onPressCompanyAge}
          showDivider
        />

        <PickerRow
          title="Industry Type"
          subtitle={industrySubtitle}
          onPress={onPressIndustry}
          showDivider
        />
        <PickerRow
          title="Add Location"
          subtitle={
            locations.length > 0 ? `${locations.length} selected` : "Select"
          }
          onPress={onPressAddLocation}
          showDivider={locations.length > 0} //i got this code from claud, i was unsure how to display the array in this function bc location is an array not single value
        />
        {locations.map((loc) => (
          <Pressable
            key={loc}
            onPress={() => onRemoveLocation(loc)}
            style={[styles.rowPressable, { paddingVertical: 14 }]}
          >
            <LLightText style={styles.rowTitle}>{loc}</LLightText>
            <LLightText style={[styles.rowTitle, { color: ui.danger }]}>
              Remove
            </LLightText>
          </Pressable>
        ))}
      </GroupCard>
    </>
  );
}

/**
 * ✅ VideoLibrarySection (UPDATED)
 * - Always allow picking a custom thumbnail from Photos
 * - When a custom photo is picked, it shows as a tile alongside generated thumbnails
 * - The selected thumbnail is indicated with the same border treatment
 * - Custom tile gets a "Custom" badge
 */
export function VideoLibrarySection(props: {
  mediaVideoUri: string | null;
  mediaThumbUri: string | null;
  mediaCaption: string;
  generatingThumbs: boolean;
  thumbOptions: string[];
  canUpload: boolean;
  adding: boolean;
  onPickVideo: () => void;
  onPickThumb: () => void;
  onSelectThumb: (uri: string) => void;
  onChangeCaption: (v: string) => void;
  onUpload: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    mediaVideoUri,
    mediaThumbUri,
    mediaCaption,
    generatingThumbs,
    thumbOptions,
    canUpload,
    adding,
    onPickVideo,
    onPickThumb,
    onSelectThumb,
    onChangeCaption,
    onUpload,
  } = props;

  // ✅ Prepend custom thumb (if it's not already in generated options)
  const thumbStrip = React.useMemo(() => {
    const list = [...(thumbOptions ?? [])];
    if (mediaThumbUri && !list.includes(mediaThumbUri))
      return [mediaThumbUri, ...list];
    return list;
  }, [thumbOptions, mediaThumbUri]);

  const hasAnyThumbChoices = thumbStrip.length > 0;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Video Library</LLightText>
      <LLightText style={styles.sectionHelper}>
        Upload a new video + thumbnail + caption into your library.
      </LLightText>

      <Pressable
          onPress={() => router.replace("/(companyUser)/video-library")} //made this so that the back will return to the last found URL
          style={[styles.pill, { marginTop: 10 }]}
        >
            See Current Video Library
        </Pressable>

      <View style={[styles.inlineCard, { marginTop: 14 }]}>
        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>
          Step 1 — Pick a video
        </LLightText>

        <Pressable
          onPress={onPickVideo}
          style={[styles.pill, { marginTop: 10 }]}
        >
          <BtnText>{mediaVideoUri ? "Replace Video" : "Pick Video"}</BtnText>
        </Pressable>
        {mediaVideoUri ? (
          <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Selected ✓
          </LLightText>
        ) : null}

        <View style={{ height: 18 }} />

        {/* Step 2 — Choose a thumbnail */}
        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>
          Step 2 — Choose a thumbnail
        </LLightText>

        {generatingThumbs ? (
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ActivityIndicator size="small" color="black" />
            <LLightText style={{ opacity: 0.65 }}>
              Generating thumbnails…
            </LLightText>
          </View>
        ) : null}

        {/* Manual pick always available (before or after choosing a video) */}
        <Pressable
          onPress={onPickThumb}
          style={[styles.pill, { marginTop: 10 }]}
        >
          <BtnText>
            {mediaThumbUri ? "Choose a different photo" : "Choose from Photos"}
          </BtnText>
        </Pressable>

        {hasAnyThumbChoices ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
          >
            <View style={{ flexDirection: "row", gap: 10 }}>
              {thumbStrip.map((uri, idx) => {
                const selected = uri === mediaThumbUri;

                // "custom" means: currently selected thumbnail is not one of the generated ones
                const isCustomTile =
                  uri === mediaThumbUri && !(thumbOptions ?? []).includes(uri);

                return (
                  <Pressable
                    key={`${uri}_${idx}`}
                    onPress={() => onSelectThumb(uri)}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 14,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: selected ? ui.text : ui.border,
                      position: "relative",
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: "100%", height: "100%" }}
                    />

                    {isCustomTile ? (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: "rgba(0,0,0,0.55)",
                        }}
                      >
                        <LLightText
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "800",
                          }}
                        >
                          Custom
                        </LLightText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {mediaThumbUri ? (
          <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Thumbnail ✓
          </LLightText>
        ) : (
          <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Pick a photo or tap a generated frame.
          </LLightText>
        )}

        <View style={{ height: 18 }} />

        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>
          Step 3 — Caption
        </LLightText>
        <TextInput className = "input"
          value={mediaCaption}
          onChangeText={onChangeCaption}
          placeholder="Add a caption/title…"
          placeholderTextColor={ui.hint}
          style={[styles.input, { marginTop: 10 }]}
        />

        <Pressable
          onPress={onUpload}
          disabled={!canUpload}
          style={[
            styles.pill,
            { marginTop: 14 },
            !canUpload ? { opacity: 0.5 } : null,
          ]}
        >
          {adding ? <ActivityIndicator size="small" color="black" /> : null}
          <BtnText>{adding ? "Uploading…" : "Upload to Library"}</BtnText>
        </Pressable>

        <LLightText style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
          You must have video + thumbnail + caption to upload.
        </LLightText>
      </View>
    </>
  );
}

export function ProfileMediaResetSection(props: {
  isSaving: boolean;
  onReset: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { isSaving, onReset } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Profile Media</LLightText>
      <LLightText style={styles.sectionHelper}>
        Clears slots only. Does not delete library items.
      </LLightText>

      <Pressable
        onPress={onReset}
        disabled={isSaving}
        style={[
          styles.pill,
          { marginTop: 14, borderColor: ui.danger },
          isSaving ? { opacity: 0.5 } : null,
        ]}
      >
        <BtnText style={{ color: ui.danger }}>Reset profile videos</BtnText>
      </Pressable>
    </>
  );
}

// ---------- Modals ----------
export function IndustryPickerModal(props: {
  visible: boolean;
  industrySearch: string;
  setIndustrySearch: (v: string) => void;
  industryRows: IndustryRow[];
  industryCustomOptions: string[];
  industryCustomInput: string;
  setIndustryCustomInput: (v: string) => void;
  onAddCustomIndustry: () => void;

  industryTempSelected: Set<string>;
  toggleIndustry: (label: string) => void;

  predefinedIndustrySet: Set<string>;

  onClose: () => void;
  onApply: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    visible,
    industrySearch,
    setIndustrySearch,
    industryRows,
    industryCustomOptions,
    industryCustomInput,
    setIndustryCustomInput,
    onAddCustomIndustry,
    industryTempSelected,
    toggleIndustry,
    predefinedIndustrySet,
    onClose,
    onApply,
  } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              Industry Type
            </LLightText>

            <TextInput className = "input"
              value={industrySearch}
              onChangeText={setIndustrySearch}
              placeholder='Search industries (e.g. "software", "health")'
              placeholderTextColor={ui.hint}
              style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={[
                ...industryRows,
                ...(industryCustomOptions.length
                  ? (
                      [{ type: "header", title: "Custom" }] as IndustryRow[]
                    ).concat(
                      industryCustomOptions
                        .filter(
                          (c) =>
                            !industrySearch.trim() ||
                            c
                              .toLowerCase()
                              .includes(industrySearch.trim().toLowerCase()),
                        )
                        .map(
                          (label) =>
                            ({
                              type: "option",
                              category: "Custom",
                              label,
                              key: `Custom__${label}`,
                            }) as IndustryRow,
                        ),
                    )
                  : []),
              ]}
              keyExtractor={(item: any) =>
                item.type === "header" ? `h_${item.title}` : item.key
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: MODAL_LIST_BOTTOM_PADDING,
              }}
              style={{ marginTop: 12, marginBottom: 12 }}
              renderItem={({ item }: { item: IndustryRow }) => {
                if (item.type === "header") {
                  return (
                    <LLightText
                      style={{
                        marginTop: 14,
                        marginBottom: 8,
                        opacity: 0.65,
                        fontSize: 12,
                      }}
                    >
                      {item.title}
                    </LLightText>
                  );
                }

                const checked = industryTempSelected.has(item.label);
                const isPredefined = predefinedIndustrySet.has(item.label);

                return (
                  <Pressable
                    onPress={() => toggleIndustry(item.label)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: checked ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <LLightText
                        style={{
                          fontSize: 14,
                          fontWeight: checked ? "800" : "500",
                        }}
                      >
                        {item.label}
                      </LLightText>
                      {!isPredefined ? (
                        <LLightText
                          style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}
                        >
                          Custom
                        </LLightText>
                      ) : null}
                    </View>
                    <LLightText style={{ opacity: 0.6 }}>
                      {checked ? "✓" : ""}
                    </LLightText>
                  </Pressable>
                );
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TextInput className = "input"
                value={industryCustomInput}
                onChangeText={setIndustryCustomInput}
                placeholder="Add custom industry…"
                placeholderTextColor={ui.hint}
                style={[styles.input, { flex: 1, borderRadius: 12 }]}
              />
              <Pressable onPress={onAddCustomIndustry} style={[styles.pill]}>
                <BtnText>Add</BtnText>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
              </Pressable>

              <Pressable
                onPress={onApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function CityPickerModal(props: {
  visible: boolean;
  title?: string;
  citySearch: string;
  setCitySearch: (v: string) => void;
  data: CityRow[];
  selectedLabel: string;
  selectedLabels?: string[]; // add this as optional
  onSelect: (label: string) => void;
  canApply: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    visible,
    title = "Select City",
    citySearch,
    setCitySearch,
    data,
    selectedLabel,
    selectedLabels,
    onSelect,
    canApply,
    onClose,
    onApply,
  } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              {title}
            </LLightText>

            <TextInput className = "input"
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder='Search (e.g. "san", "austin")'
              placeholderTextColor={ui.hint}
              style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: MODAL_LIST_BOTTOM_PADDING,
              }}
              style={{ marginTop: 12, marginBottom: 12 }}
              initialNumToRender={18}
              maxToRenderPerBatch={24}
              windowSize={10}
              removeClippedSubviews={Platform.OS === "android"}
              renderItem={({ item }) => {
                const selected = selectedLabels //checks if prop is passed in at all
                  ? selectedLabels.includes(item.label) // company: check against array
                  : item.label === selectedLabel; // user: check against single string
                return (
                  <Pressable
                    onPress={() => onSelect(item.label)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                    }}
                  >
                    <LLightText
                      style={{
                        fontSize: 14,
                        fontWeight: selected ? "800" : "700",
                      }}
                    >
                      {item.label}
                    </LLightText>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <LLightText style={{ paddingVertical: 16, opacity: 0.6 }}>
                  No matches.
                </LLightText>
              }
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Done</LLightText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/*
Skills label now says "Skills" (not "comma-separated")
Pressable row opens the SkillsPickerModal and shows selected skills as a preview (or "Select skills" hint)
Modal state is all self-contained inside RoleFormModal: search, temp selection, custom options/input
On Apply: commits the temp selection to selectedSkills, which is passed to onSave
On open: pre-populates temp selection from any existing role skills (for the edit case)
*/
//for relevant skill picking in Roles
export function SkillsPickerModal(props: {
  visible: boolean;
  skillSearch: string;
  setSkillSearch: (v: string) => void;
  skillRows: IndustryRow[];
  skillCustomOptions: string[];
  skillCustomInput: string;
  setSkillCustomInput: (v: string) => void;
  onAddCustomSkill: () => void;

  skillTempSelected: Set<string>;
  toggleSkill: (label: string) => void;

  predefinedSkillSet: Set<string>;

  onClose: () => void;
  onApply: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    visible,
    skillSearch,
    setSkillSearch,
    skillRows,
    skillCustomOptions,
    skillCustomInput,
    setSkillCustomInput,
    onAddCustomSkill,
    skillTempSelected,
    toggleSkill,
    predefinedSkillSet,
    onClose,
    onApply,
  } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              Anticipated Skills - Known/Taught
            </LLightText>

            <TextInput className = "input"
              value={skillSearch}
              onChangeText={setSkillSearch}
              placeholder='Search skills (e.g. in "software", "health")'
              placeholderTextColor={ui.hint}
              style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={[
                ...skillRows,
                ...(skillCustomOptions.length
                  ? (
                      [{ type: "header", title: "Custom" }] as IndustryRow[]
                    ).concat(
                      skillCustomOptions
                        .filter(
                          (c) =>
                            !skillSearch.trim() ||
                            c
                              .toLowerCase()
                              .includes(skillSearch.trim().toLowerCase()),
                        )
                        .map(
                          (label) =>
                            ({
                              type: "option",
                              category: "Custom",
                              label,
                              key: `Custom__${label}`,
                            }) as IndustryRow,
                        ),
                    )
                  : []),
              ]}
              keyExtractor={(item: any) =>
                item.type === "header" ? `h_${item.title}` : item.key
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: MODAL_LIST_BOTTOM_PADDING,
              }}
              style={{ marginTop: 12, marginBottom: 12 }}
              renderItem={({ item }: { item: IndustryRow }) => {
                if (item.type === "header") {
                  return (
                    <LLightText
                      style={{
                        marginTop: 14,
                        marginBottom: 8,
                        opacity: 0.65,
                        fontSize: 12,
                      }}
                    >
                      {item.title}
                    </LLightText>
                  );
                }

                const checked = skillTempSelected.has(item.label);
                const isPredefined = predefinedSkillSet.has(item.label);

                return (
                  <Pressable
                    onPress={() => toggleSkill(item.label)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: checked ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <LLightText
                        style={{
                          fontSize: 14,
                          fontWeight: checked ? "800" : "500",
                        }}
                      >
                        {item.label}
                      </LLightText>
                      {!isPredefined ? (
                        <LLightText
                          style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}
                        >
                          Custom
                        </LLightText>
                      ) : null}
                    </View>
                    <LLightText style={{ opacity: 0.6 }}>
                      {checked ? "✓" : ""}
                    </LLightText>
                  </Pressable>
                );
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TextInput className = "input"
                value={skillCustomInput}
                onChangeText={setSkillCustomInput}
                placeholder="Add custom industry…"
                placeholderTextColor={ui.hint}
                style={[styles.input, { flex: 1, borderRadius: 12 }]}
              />
              <Pressable onPress={onAddCustomSkill} style={[styles.pill]}>
                <BtnText>Add</BtnText>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
              </Pressable>

              <Pressable
                onPress={onApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function RolePickerModal(props: {
  visible: boolean;
  roleSearch: string;
  setRoleSearch: (v: string) => void;
  roleRows: IndustryRow[];
  roleCustomOptions: string[];
  roleCustomInput: string;
  setRoleCustomInput: (v: string) => void;
  onAddCustomRole: () => void;

  roleTempSelected: Set<string>;
  toggleRole: (label: string) => void;

  predefinedRoleSet: Set<string>;

  onClose: () => void;
  onApply: () => void;
}) {
  const {
    visible,
    roleSearch,
    setRoleSearch,
    roleRows,
    roleCustomOptions,
    roleCustomInput,
    setRoleCustomInput,
    onAddCustomRole,
    roleTempSelected,
    toggleRole,
    predefinedRoleSet,
    onClose,
    onApply,
  } = props;
  const ui = useUI();
  const styles = useEditStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              Role Types
            </LLightText>

            <TextInput className = "input"
              value={roleSearch}
              onChangeText={setRoleSearch}
              placeholder='Search roles (e.g. in "software", "health")'
              placeholderTextColor={ui.hint}
              style={{borderRadius: 12, marginTop: 12 }}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={[
                ...roleRows,
                ...(roleCustomOptions.length
                  ? (
                      [{ type: "header", title: "Custom" }] as IndustryRow[]
                    ).concat(
                      roleCustomOptions
                        .filter(
                          (c) =>
                            !roleSearch.trim() ||
                            c
                              .toLowerCase()
                              .includes(roleSearch.trim().toLowerCase()),
                        )
                        .map(
                          (label) =>
                            ({
                              type: "option",
                              category: "Custom",
                              label,
                              key: `Custom__${label}`,
                            }) as IndustryRow,
                        ),
                    )
                  : []),
              ]}
              keyExtractor={(item: any) =>
                item.type === "header" ? `h_${item.title}` : item.key
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: MODAL_LIST_BOTTOM_PADDING,
              }}
              style={{ marginTop: 12, marginBottom: 12 }}
              renderItem={({ item }: { item: IndustryRow }) => {
                if (item.type === "header") {
                  return (
                    <LLightText
                      style={{
                        marginTop: 14,
                        marginBottom: 8,
                        opacity: 0.65,
                        fontSize: 12,
                      }}
                    >
                      {item.title}
                    </LLightText>
                  );
                }
                const checked = roleTempSelected.has(item.label);
                const isPredefined = predefinedRoleSet.has(item.label);

                return (
                  <Pressable
                    onPress={() => toggleRole(item.label)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: checked ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <LLightText
                        style={{
                          fontSize: 14,
                          fontWeight: checked ? "800" : "500",
                        }}
                      >
                        {item.label}
                      </LLightText>
                      {!isPredefined ? (
                        <LLightText
                          style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}
                        >
                          Custom
                        </LLightText>
                      ) : null}
                    </View>
                    <LLightText style={{ opacity: 0.6 }}>
                      {checked ? "✓" : ""}
                    </LLightText>
                  </Pressable>
                );
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TextInput className = "input"
                value={roleCustomInput}
                onChangeText={setRoleCustomInput}
                placeholder="Add custom role…"
                placeholderTextColor={ui.hint}
                style={[styles.input, { flex: 1, borderRadius: 12 }]}
              />
              <Pressable onPress={onAddCustomRole} style={[styles.pill]}>
                <BtnText>Add</BtnText>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
              </Pressable>

              <Pressable
                onPress={onApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function RolesSection(props: {
  roles: OpenRole[];
  onPressAdd: () => void;
  onRemove: (id: string) => void;
  onPressEdit: (role: OpenRole) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { roles, onPressAdd, onRemove, onPressEdit } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Open Roles</LLightText>
      <LLightText style={styles.sectionHelper}>
        Add positions you are actively hiring for.
      </LLightText>

      <GroupCard>
        <PickerRow
          title="Add Role"
          subtitle={
            roles.length > 0
              ? `${roles.length} role${roles.length === 1 ? "" : "s"} listed`
              : "None added"
          }
          onPress={onPressAdd}
          showDivider={roles.length > 0}
        />
        {roles.map((role) => (
          <View
            key={role.id}
            style={[styles.rowPressable, { paddingVertical: 14, gap: 4 }]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <LLightText
                style={[styles.rowTitle, { flex: 1, paddingRight: 10 }]}
              >
                {role.title}
              </LLightText>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => onPressEdit(role)} hitSlop={8}>
                  <LLightText style={{ color: "#007AFF", fontSize: 13 }}>
                    Edit
                  </LLightText>
                </Pressable>
                <Pressable onPress={() => onRemove(role.id)} hitSlop={8}>
                  <LLightText style={{ color: ui.danger, fontSize: 13 }}>
                    Remove
                  </LLightText>
                </Pressable>
              </View>
            </View>
            {!!role.salary.trim() && (
              <LLightText style={styles.rowSub}>{role.salary}</LLightText>
            )}
            {!!role.location.trim() && (
              <LLightText style={styles.rowSub}>{role.location}</LLightText> //added location bc this is important
            )}
            {role.skills.length > 0 && (
              <LLightText style={styles.rowSub} numberOfLines={1}>
                {role.skills.join(", ")}
              </LLightText>
            )}
            {!!role.workType.trim() && (
              <LLightText style={styles.rowSub}>{role.workType}</LLightText>
            )}
            {!!role.postUrl.trim() && (
              <LLightText style={styles.rowSub}>{role.postUrl}</LLightText>
            )}
          </View>
        ))}
      </GroupCard>
    </>
  );
}

export function RoleFormModal(props: {
  visible: boolean;
  onClose: () => void;
  onSave: (role: OpenRole) => void;
  initialRole?: OpenRole; //lets us take the existing values and populate for editing
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { visible, onClose, onSave, initialRole } = props;

  const [salary, setSalary] = React.useState("");

  const [salaryPickerVisible, setSalaryPickerVisible] = React.useState(false);
  const [tempSalary, setTempSalary] = React.useState("");
  //skills - in a modal
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [skillsPickerVisible, setSkillsPickerVisible] = React.useState(false);
  const [skillSearch, setSkillSearch] = React.useState("");
  const [skillTempSelected, setSkillTempSelected] = React.useState<Set<string>>(new Set());
  const [skillCustomOptions, setSkillCustomOptions] = React.useState<string[]>([]);
  const [skillCustomInput, setSkillCustomInput] = React.useState("");
  //roles - in a modal
  const [selectedRole, setSelectedRole] = React.useState("");
  const [rolePickerVisible, setRolePickerVisible] = React.useState(false);
  const [roleSearch, setRoleSearch] = React.useState("");
  const [roleTempSelected, setRoleTempSelected] = React.useState<Set<string>>(new Set());
  const [roleCustomOptions, setRoleCustomOptions] = React.useState<string[]>([]);
  const [roleCustomInput, setRoleCustomInput] = React.useState("");

  //location - call city modal
  const [location, setLocation] = React.useState("");
  const [locationPickerVisible, setLocationPickerVisible] = React.useState(false);
  const [locationSearch, setLocationSearch] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState("");
  const [selectedTempLocation, setLocationTempSelected] = React.useState("");
  const { filteredCities } = useProfileEditController();


  const [postUrl, setPostUrl] = React.useState("");
  const [workType, setWorkType] = React.useState("");
  const [workTypePickerVisible, setWorkTypePickerVisible] = React.useState(false);
  const [tempWorkType, setTempWorkType] = React.useState("");
  const [isRelocationCovered, setRelocation] = React.useState(false);

  //for skills
  const predefinedSkillSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const cat of SKILLS) for (const opt of cat.options) s.add(opt);
    return s;
  }, []);

  const skillRows: IndustryRow[] = React.useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    const rows: IndustryRow[] = [];
    for (const cat of SKILLS) {
      const opts = q
        ? cat.options.filter((o) => o.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q))
        : cat.options;
      if (!opts.length) continue;
      if (!q) rows.push({ type: "header", title: cat.title });
      opts.forEach((label) =>
        rows.push({ type: "option", category: cat.title, label, key: `${cat.title}::${label}` })
      );
    }
    return rows;
  }, [skillSearch]);
  
  //for roles
  const predefinedRoleSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const cat of ROLE_TYPES) for (const opt of cat.options) s.add(opt);
    return s;
  }, []);

  const roleRows: IndustryRow[] = React.useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    const rows: IndustryRow[] = [];
    for (const cat of ROLE_TYPES) { //THIS IS WHERE THE CONSTANT IS BEING PASSED IN
      const opts = q
        ? cat.options.filter((o) => o.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q))
        : cat.options;
      if (!opts.length) continue;
      if (!q) rows.push({ type: "header", title: cat.title });
      opts.forEach((label) =>
        rows.push({ type: "option", category: cat.title, label, key: `${cat.title}::${label}` })
      );
    }
    return rows;
  }, [roleSearch]);

  // Reset/pre-populate fields each time the modal opens

  /*
  roleTempSelected state changed from string to Set<string> to match what the modal expects
toggleRole now does single-select: clicking a role selects only it; clicking it again deselects
onAddCustomRole fixed — adds the custom role and selects it immediately, clears the input
onApply extracts the single string from the Set via Array.from(...)[0] ?? ""
onPress syntax error fixed (onPress{ → onPress=)
Added missing roleCustomOptions and setRoleCustomInput props

  */
  React.useEffect(() => {
    if (visible) {
      setSelectedRole(initialRole?.title ?? ""); //this is our new way to fill in role title variable
      setRoleTempSelected(new Set(initialRole?.title ? [initialRole.title] : []));
      setRoleCustomOptions([]);
      setRoleSearch("");
      setRoleCustomInput("");

      setSalary(initialRole?.salary ?? "");
      setSelectedSkills(initialRole?.skills ?? []);
      setSkillTempSelected(new Set(initialRole?.skills ?? []));
      setSkillCustomOptions([]);
      setSkillSearch("");
      setSkillCustomInput("");

      //for selecting the initial location
      setLocation(initialRole?.location ?? "");
      setLocationSearch("");
      setLocationTempSelected(initialRole?.location ?? "");
      setSelectedLocation(initialRole?.location ?? "")

      setPostUrl(initialRole?.postUrl ?? "");
      setWorkType(initialRole?.workType ?? "");
      setRelocation(initialRole?.isRelocationCovered ?? false); //if not true, auto false
    }
  }, [
    visible,
    initialRole?.title,
    initialRole?.salary,
    initialRole?.location,
    initialRole?.workType,
    initialRole?.skills,
    initialRole?.isRelocationCovered,
    initialRole?.postUrl,
  ]);

  const canSave = selectedRole.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: initialRole?.id ?? String(Date.now()),
      title: selectedRole,
      salary: salary.trim(),
      postedAt: initialRole?.postedAt ?? new Date().toISOString().slice(0, 10),
      skills: selectedSkills,
      location: location,
      postUrl: postUrl.trim(),
      workType: workType.trim(),
      isRelocationCovered: false,
    });
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 32,
            }}
          >
            <LLightText
              style={{ fontSize: 18, fontWeight: "800", marginBottom: 16 }}
            >
              {initialRole ? "Edit Role" : "Add Role"}
            </LLightText>

            <LLightText style={styles.label}>Role Title</LLightText>
            <Pressable
              onPress={() => {
                setRoleTempSelected(new Set(selectedRole ? [selectedRole] : []));
                setRolePickerVisible(true);
              }}
              style={[
                styles.input,
                {
                  marginBottom: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <LLightText
                style={{color: selectedRole ? ui.text : ui.hint, flex: 1, paddingRight: 8}}
                numberOfLines={1}
              >
                {selectedRole ? selectedRole : "Select Role Type"}

              </LLightText>
              <LLightText style={styles.chevron}>›</LLightText>
            </Pressable>
            {/*creating an instance of the modal here with current fields*/}
            <RolePickerModal
              visible={rolePickerVisible}
              roleSearch={roleSearch}
              setRoleSearch={setRoleSearch}
              roleRows={roleRows}
              roleCustomOptions={roleCustomOptions}
              roleCustomInput={roleCustomInput}
              setRoleCustomInput={setRoleCustomInput}
              onAddCustomRole={() => {
                const trimmed = roleCustomInput.trim();
                if (!trimmed || roleCustomOptions.includes(trimmed)) return;
                setRoleCustomOptions((prev) => [...prev, trimmed]);
                setRoleTempSelected(new Set([trimmed]));
                setRoleCustomInput("");
              }}
              roleTempSelected={roleTempSelected}
              toggleRole={(label) =>
                setRoleTempSelected((prev) => {
                  // single-select: if already selected deselect, otherwise select only this one
                  if (prev.has(label)) return new Set();
                  return new Set([label]);
                })
              }
              predefinedRoleSet={predefinedRoleSet}
              onClose={() => setRolePickerVisible(false)}
              onApply={() => {
                setSelectedRole(Array.from(roleTempSelected)[0] ?? "");
                setRolePickerVisible(false);
              }}
            />

            <LLightText style={styles.label}>Salary / Range</LLightText>
            <Pressable
              onPress={() => {
                setTempSalary(salary);
                setSalaryPickerVisible(true);
              }}
              style={[
                styles.input,
                {
                  marginBottom: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <LLightText style={{ color: salary ? ui.text : ui.hint }}>
                {salary || "Select salary range"}
              </LLightText>
              <LLightText style={styles.chevron}>›</LLightText>
            </Pressable>

            <SinglePickerModal
              visible={salaryPickerVisible}
              title="Salary / Range"
              options={SALARY_OPTIONS}
              tempValue={tempSalary}
              setTempValue={setTempSalary}
              canApply={!!tempSalary}
              onClose={() => setSalaryPickerVisible(false)}
              onApply={() => {
                setSalary(tempSalary);
                setSalaryPickerVisible(false);
              }}
            />

            <LLightText style={styles.label}>Skills</LLightText>
            <Pressable
              onPress={() => {
                setSkillTempSelected(new Set(selectedSkills));
                setSkillsPickerVisible(true);
              }}
              style={[
                styles.input,
                {
                  marginBottom: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <LLightText
                style={{ color: selectedSkills.length ? ui.text : ui.hint, flex: 1, paddingRight: 8 }}
                numberOfLines={1}
              >
                {selectedSkills.length
                  ? selectedSkills.join(", ")
                  : "Select skills"}
              </LLightText>
              <LLightText style={styles.chevron}>›</LLightText>
            </Pressable>

            <SkillsPickerModal
              visible={skillsPickerVisible}
              skillSearch={skillSearch}
              setSkillSearch={setSkillSearch}
              skillRows={skillRows}
              skillCustomOptions={skillCustomOptions}
              skillCustomInput={skillCustomInput}
              setSkillCustomInput={setSkillCustomInput}
              onAddCustomSkill={() => {
                const trimmed = skillCustomInput.trim();
                if (!trimmed || skillCustomOptions.includes(trimmed)) return;
                setSkillCustomOptions((prev) => [...prev, trimmed]);
                setSkillTempSelected((prev) => new Set([...prev, trimmed]));
                setSkillCustomInput("");
              }}
              skillTempSelected={skillTempSelected}
              toggleSkill={(label) =>
                setSkillTempSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(label)) next.delete(label);
                  else next.add(label);
                  return next;
                })
              }
              predefinedSkillSet={predefinedSkillSet}
              onClose={() => setSkillsPickerVisible(false)}
              onApply={() => {
                setSelectedSkills(Array.from(skillTempSelected));
                setSkillsPickerVisible(false);
              }}
            />

            <LLightText style={styles.label}>Position Location</LLightText>
            <Pressable
              onPress={() => {
                setLocationTempSelected(location); //needed to be single string picker, only a string gets passed in not a set of them
                setLocationPickerVisible(true);
              }}
              style={[
                styles.input,
                {
                  marginBottom: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <LLightText style={{ color: location ? ui.text : ui.hint }}>
                {location || "Select location where position is being offered."}
              </LLightText>
            </Pressable>

            <CityPickerModal
              visible={locationPickerVisible}
              title="Role Location"
              citySearch={locationSearch}
              setCitySearch={setLocationSearch}
              data={filteredCities}
              selectedLabel={location}        // single string
              // no selectedLabels prop
              onSelect={(label) => {
                setLocation(label);
                setLocationPickerVisible(false); // auto-close on pick
              }}
              canApply={true}
              onClose={() => setLocationPickerVisible(false)}
              onApply={() => setLocationPickerVisible(false)}
            />


            <LLightText style={styles.label}>Work Type</LLightText>
            <Pressable
              onPress={() => {
                setTempWorkType(workType);
                setWorkTypePickerVisible(true);
              }}
              style={[
                styles.input,
                {
                  marginBottom: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <LLightText style={{ color: workType ? ui.text : ui.hint }}>
                {workType || "Select work type"}
              </LLightText>
              <LLightText style={styles.chevron}>›</LLightText>
            </Pressable>

            <SinglePickerModal
              visible={workTypePickerVisible}
              title="Work Type"
              options={WORK_TYPE_OPTIONS}
              tempValue={tempWorkType}
              setTempValue={setTempWorkType}
              canApply={!!tempWorkType}
              onClose={() => setWorkTypePickerVisible(false)}
              onApply={() => {
                setWorkType(tempWorkType);
                setWorkTypePickerVisible(false);
              }}
            />

            <LLightText style={styles.label}>Relocation Allowance</LLightText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
                gap: 10,
              }}
            >
              <Switch
                value={isRelocationCovered}
                onValueChange={(val) => setRelocation(val)}
                trackColor={{ false: ui.hint, true: ui.text }}
              />
              <LLightText>{isRelocationCovered ? "Yes" : "No"}</LLightText>
            </View>

            <LLightText style={styles.label}>Job Posting URL </LLightText>
            <TextInput className = "input"
              value={postUrl}
              onChangeText={setPostUrl}
              placeholder="site link"
              placeholderTextColor={ui.hint}
              style={[styles.input, { marginBottom: 20 }]}
              autoCorrect={false}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Cancel</LLightText>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: canSave ? 1 : 0.4,
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Save Role</LLightText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function ContactSection(props: {
  companyEmail: string;
  companyPhone: string;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { 
    companyEmail, 
    companyPhone, 
    onChangeEmail, 
    onChangePhone,
  } = props;


  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 17 }]}>
        Company Contact Information
      </LLightText>
      <LLightText style={styles.sectionHelper}>
        Add a company email and phone that can be publically contacted.
      </LLightText>

      <View
        style={[
          styles.inlineCard,
          {
            marginTop: 14,
            flexDirection: "column", //this makes it so the values are stacked on top of one another
            gap: 14,
          },
        ]}
      >
	        {/* email and phone input rows */}
          <View style={[styles.fieldStack, {flexDirection: "column", gap: 10 }]}>
            <LLightText style={styles.label}>Company Email</LLightText>
            <TextInput className = "input"
              value={companyEmail}
              onChangeText={onChangeEmail}
              placeholder="Company Email"
              placeholderTextColor={ui.hint}
              style={styles.input}
            />
          </View>


            <View style={[styles.fieldStack, {flexDirection: "column", gap: 10 }]}>
              <LLightText style={styles.label}>Company Phone</LLightText>
              <TextInput className = "input"
                value={companyPhone}
                onChangeText={onChangePhone}
                placeholder="Company Phone"
                placeholderTextColor={ui.hint}
                style={styles.input}
              />
            </View>
            <Pressable>
              <BtnText></BtnText>
            </Pressable>
        </View>
    </>
  );  
}

export function CoreValuesPickerModal(props: {
  visible: boolean;
  selected: string[];
  onToggle: (value: string) => void;
  onClose: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { visible, selected, onToggle, onClose } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View
          style={{
            backgroundColor: ui.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            maxHeight: "85%",
            marginTop: "auto",
          }}
        >
          <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
            Core Values
          </LLightText>
          <LLightText style={{ opacity: 0.6, marginTop: 4 }}>
            Choose up to 5.
          </LLightText>

          <FlatList
            data={CORE_VALUES}
            keyExtractor={(item) => item}
            style={{ marginTop: 12, marginBottom: 12 }}
            renderItem={({ item }) => {
              const checked = selected.includes(item);
              const maxReached = selected.length >= 5 && !checked;
              return (
                <Pressable
                  onPress={() => onToggle(item)}
                  disabled={maxReached}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: checked ? ui.text : ui.border,
                    borderRadius: 12,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: maxReached ? 0.4 : 1,
                  }}
                >
                  <LLightText
                    style={{
                      fontSize: 14,
                      fontWeight: checked ? "800" : "500",
                    }}
                  >
                    {item}
                  </LLightText>
                  <LLightText style={{ opacity: 0.6 }}>
                    {checked ? "✓" : ""}
                  </LLightText>
                </Pressable>
              );
            }}
          />

          <Pressable
            onPress={onClose}
            style={{
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: ui.borderStrong,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <LLightText style={{ fontWeight: "800" }}>Done</LLightText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function CoreValuesSection(props: {
  coreValues: string[];
  onPressAdd: () => void;
  onRemove: (value: string) => void;
  showCoreValues: boolean;
  onToggleShowCoreValues: (val: boolean) => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const { coreValues, onPressAdd, onRemove, showCoreValues, onToggleShowCoreValues } = props;

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}> 
      <LLightText style={styles.sectionTitle}> Core Values </LLightText>
      <Switch
          value={showCoreValues ?? true}
          onValueChange={onToggleShowCoreValues}
          trackColor={{ false: ui.hint, true: ui.text }}
        />
    </View>
      <LLightText style={[styles.sectionHelper, { marginTop: 4 }]}>
        Choose up to 5.
      </LLightText>
      <GroupCard>
        <PickerRow
          title="Add Core Value"
          subtitle={
            coreValues.length > 0 ? `${coreValues.length}/5 selected` : "Select"
          }
          onPress={onPressAdd}
          showDivider={coreValues.length > 0}
        />
        {coreValues.map((value) => (
          <Pressable
            key={value}
            onPress={() => onRemove(value)}
            style={[styles.rowPressable, { paddingVertical: 14 }]}
          >
            <LLightText style={styles.rowTitle}>{value}</LLightText>
            <LLightText style={[styles.rowTitle, { color: ui.danger }]}>
              Remove
            </LLightText>
          </Pressable>
        ))}
      </GroupCard>
    </>
  );
}

export function SinglePickerModal(props: {
  visible: boolean;
  title: string;
  options: string[];
  tempValue: string;
  setTempValue: (v: string) => void;
  canApply: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    visible,
    title,
    options,
    tempValue,
    setTempValue,
    canApply,
    onClose,
    onApply,
  } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "80%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              {title}
            </LLightText>

            <ScrollView
              style={{ marginTop: 12 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {options.map((opt) => {
                const selected = opt === tempValue;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setTempValue(opt)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <LLightText
                      style={{ fontWeight: selected ? "800" : "500" }}
                    >
                      {opt}
                    </LLightText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
              </Pressable>

              <Pressable
                onPress={onApply}
                disabled={!canApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: canApply ? 1 : 0.4,
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function WorkTypePickerModal(props: {
  visible: boolean;
  typeOptions: string[];
  preferenceOptions: string[];
  selectedType: string;
  selectedPreference: string;
  onSelectType: (v: string) => void;
  onSelectPreference: (v: string) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const ui = useUI();
  const styles = useEditStyles();
  const {
    visible,
    typeOptions,
    preferenceOptions,
    selectedType,
    selectedPreference,
    onSelectType,
    onSelectPreference,
    onClose,
    onApply,
  } = props;

  const canApply = !!selectedType.trim() || !!selectedPreference.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: ui.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
              Work Type
            </LLightText>

            <ScrollView
              style={{ marginTop: 12 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <LLightText
                style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}
              >
                Employment Type
              </LLightText>
              {typeOptions.map((opt) => {
                const selected = opt === selectedType;
                return (
                  <Pressable
                    key={`type_${opt}`}
                    onPress={() => onSelectType(opt)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                    }}
                  >
                    <LLightText
                      style={{ fontWeight: selected ? "800" : "500" }}
                    >
                      {opt}
                    </LLightText>
                  </Pressable>
                );
              })}

              <View style={{ height: 8 }} />
              <LLightText
                style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}
              >
                Work Preference
              </LLightText>
              {preferenceOptions.map((opt) => {
                const selected = opt === selectedPreference;
                return (
                  <Pressable
                    key={`pref_${opt}`}
                    onPress={() => onSelectPreference(opt)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? ui.text : ui.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: ui.card,
                    }}
                  >
                    <LLightText
                      style={{ fontWeight: selected ? "800" : "500" }}
                    >
                      {opt}
                    </LLightText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.borderStrong,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
              </Pressable>

              <Pressable
                onPress={onApply}
                disabled={!canApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: ui.text,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: canApply ? 1 : 0.4,
                }}
              >
                <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}