// src/features/profile/edit/profileEdit.ui.tsx
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Switch, //used in roles for relocation check box
} from "react-native";

import type { OpenRole } from "@/src/features/profile/profile.types";
import { BtnText, LLightText } from "./profileEdit.components";
import { BACKGROUND_COLOR_OPTIONS, CORE_VALUES } from "./profileEdit.constants";
import { UI, styles } from "./profileEdit.styles";

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
function GroupCard({ children, style }: { children: React.ReactNode; style?: any }) {
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
  const { avatarPreviewUri, pickingAvatarImage, isSaving, hasAvatar, onPickAvatarImage, onRemoveAvatarImage, onSetAvatarFromUrl } = props;
  const [urlInput, setUrlInput] = React.useState("");

  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 9 }]}>Company Logo</LLightText>
      <View style={{ marginTop: -5, alignItems: "center" }}>
        <Pressable
          onPress={onPickAvatarImage}
          disabled={pickingAvatarImage || isSaving}
          hitSlop={10}
          style={{
            width: 126,
            height: 126,
            borderRadius: 63,
            backgroundColor: "#eceff1",
            overflow: "visible",
            alignItems: "center",
            justifyContent: "center",
            opacity: pickingAvatarImage || isSaving ? 0.7 : 1,
          }}
        >
          {avatarPreviewUri ? (
            <Image source={{ uri: avatarPreviewUri }} style={{ width: "100%", height: "100%", borderRadius: 63 }} />
          ) : (
            <LLightText style={{ opacity: 0.45, fontSize: 28 }}>+</LLightText>
          )}

            <Pressable
              onPress={onRemoveAvatarImage}
              disabled={!hasAvatar || isSaving}
              style={[
                styles.pill,
                { flex: 1, borderColor: hasAvatar && !isSaving ? UI.danger : UI.borderStrong },
                !hasAvatar || isSaving ? { opacity: 0.4 } : null,
              ]}
            >
              <BtnText style={{ color: hasAvatar && !isSaving ? UI.danger : undefined }}>Remove</BtnText>
            </Pressable>
          </View>
        </Pressable>

        {hasAvatar ? (
          <Pressable
            onPress={onRemoveAvatarImage}
            disabled={isSaving}
            hitSlop={8}
            style={{ marginTop: 10, opacity: isSaving ? 0.5 : 1 }}
          >
            <BtnText style={{ color: UI.subtext }}>Remove logo</BtnText>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14, paddingHorizontal: 16, width: "100%" }}>
          <TextInput
            style={[styles.input, { flex: 1, fontSize: 12 }]}
            placeholder="Or paste image URL"
            placeholderTextColor={UI.hint}
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
            style={[styles.pill, { paddingHorizontal: 14 }, !urlInput.trim() || isSaving ? { opacity: 0.4 } : null]}
          >
            <BtnText>Use URL</BtnText>
          </Pressable>
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
  const {
    companyName,
    onChangeCompanyName,
  } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Name</LLightText>

      <View style={styles.fieldStack}>
        <LLightText style={styles.label}></LLightText>
        <TextInput
          value={companyName}
          onChangeText={onChangeCompanyName}
          placeholder="Company Name"
          placeholderTextColor={UI.hint}
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
  const { selectedColor, onSelect } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Background Color</LLightText>
      <LLightText style={styles.sectionHelper}>Choose up to 1.</LLightText>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
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
                borderColor: selected ? UI.text : "transparent",
              }}
            >
              {selected ? (
                <LLightText style={{ color: "#fff", fontSize: 18 }}>✓</LLightText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export function MissionSection(props: { mission: string; onChangeMission: (v: string) => void }) {
  const { mission, onChangeMission } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Mission</LLightText>
      <LLightText style={styles.sectionHelper}>The mission of the company.</LLightText>

      <View style={styles.fieldStack}>
        <TextInput
          value={mission?.trim().length ? mission : ""}
          onChangeText={onChangeMission}
          placeholder="Write something about the mission…"
          placeholderTextColor={UI.hint}
          style={styles.inputMultiline}
          multiline
        />
      </View>
    </>
  );
}

export function BenefitsSection(props: {benefits: string; onChangeBenefits: (v: string) => void}) {
  const {benefits, onChangeBenefits } = props;

  return (
    <>
    <LLightText style={styles.sectionTitle}>Benefits </LLightText>
    <LLightText style={styles.sectionHelper}>The benefits of the company. 401k, work schedule, overtime, etc.</LLightText>

    <View style={styles.fieldStack}>
      <TextInput
      value = {benefits?.trim().length ? benefits : ""}
      onChangeText={onChangeBenefits}
      placeholder="Write something about the benefits..."
      placeholderTextColor={UI.hint}
      style={styles.inputMultiline}
      multiline
      />
    </View>
    </>
  )
}

export function IndustryTypeSection(props: {
  companyAgeSubtitle: string;
  industrySubtitle: string;
  locations: string[];
  onPressCompanyAge: () => void;
  onPressIndustry: () => void;
  onPressAddLocation: () => void;
  onRemoveLocation: (label: string) => void;
}) {
  const {
    companyAgeSubtitle,
    industrySubtitle,
    locations,
    onPressCompanyAge,
    onPressIndustry,
    onPressAddLocation,
    onRemoveLocation,
  } = props;
  return (
    <>
      <LLightText style={styles.sectionTitle}>Logistics</LLightText>
      <LLightText style={styles.sectionHelper}>Residency requirements, company age, work, and location.</LLightText>

      <GroupCard>
        <PickerRow
          title="Company Age (years)"
          subtitle={companyAgeSubtitle}
          onPress={onPressCompanyAge}
          showDivider
        />
        <PickerRow title="Industry Type" subtitle={industrySubtitle} onPress={onPressIndustry} showDivider />
        <PickerRow 
          title="Add Location" 
          subtitle={locations.length > 0 ? `${locations.length} selected` : "Select"}
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
            <LLightText style={[styles.rowTitle, { color: UI.danger }]}>Remove</LLightText>
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
    if (mediaThumbUri && !list.includes(mediaThumbUri)) return [mediaThumbUri, ...list];
    return list;
  }, [thumbOptions, mediaThumbUri]);

  const hasAnyThumbChoices = thumbStrip.length > 0;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Video Library</LLightText>
      <LLightText style={styles.sectionHelper}>Upload a new video + thumbnail + caption into your library.</LLightText>

      <View style={[styles.inlineCard, { marginTop: 14 }]}>
        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>Step 1 — Pick a video</LLightText>
        <Pressable onPress={onPickVideo} style={[styles.pill, { marginTop: 10 }]}>
          <BtnText>{mediaVideoUri ? "Replace Video" : "Pick Video"}</BtnText>
        </Pressable>
        {mediaVideoUri ? <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>Selected ✓</LLightText> : null}

        <View style={{ height: 18 }} />

        {/* Step 2 — Choose a thumbnail */}
        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>Step 2 — Choose a thumbnail</LLightText>

        {generatingThumbs ? (
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" color="black" />
            <LLightText style={{ opacity: 0.65 }}>Generating thumbnails…</LLightText>
          </View>
        ) : null}

        {/* ✅ Manual pick always available (before or after choosing a video) */}
        <Pressable onPress={onPickThumb} style={[styles.pill, { marginTop: 10 }]}>
          <BtnText>{mediaThumbUri ? "Choose a different photo" : "Choose from Photos"}</BtnText>
        </Pressable>

        {hasAnyThumbChoices ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {thumbStrip.map((uri, idx) => {
                const selected = uri === mediaThumbUri;

                // "custom" means: currently selected thumbnail is not one of the generated ones
                const isCustomTile = uri === mediaThumbUri && !(thumbOptions ?? []).includes(uri);

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
                      borderColor: selected ? UI.text : UI.border,
                      position: "relative",
                    }}
                  >
                    <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />

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
                        <LLightText style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>Custom</LLightText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {mediaThumbUri ? (
          <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>Thumbnail ✓</LLightText>
        ) : (
          <LLightText style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Pick a photo or tap a generated frame.
          </LLightText>
        )}

        <View style={{ height: 18 }} />

        <LLightText style={{ fontSize: 13, opacity: 0.7 }}>Step 3 — Caption</LLightText>
        <TextInput
          value={mediaCaption}
          onChangeText={onChangeCaption}
          placeholder="Add a caption/title…"
          placeholderTextColor={UI.hint}
          style={[styles.input, { marginTop: 10 }]}
        />

        <Pressable
          onPress={onUpload}
          disabled={!canUpload}
          style={[styles.pill, { marginTop: 14 }, !canUpload ? { opacity: 0.5 } : null]}
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

export function ProfileMediaResetSection(props: { isSaving: boolean; onReset: () => void }) {
  const { isSaving, onReset } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Profile Media</LLightText>
      <LLightText style={styles.sectionHelper}>Clears slots only. Does not delete library items.</LLightText>

      <Pressable
        onPress={onReset}
        disabled={isSaving}
        style={[styles.pill, { marginTop: 14, borderColor: UI.danger }, isSaving ? { opacity: 0.5 } : null]}
      >
        <BtnText style={{ color: UI.danger }}>Reset profile videos</BtnText>
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: UI.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>Industry Type</LLightText>

            <TextInput
              value={industrySearch}
              onChangeText={setIndustrySearch}
              placeholder='Search industries (e.g. "software", "health")'
              placeholderTextColor={UI.hint}
              style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={[
                ...industryRows,
                ...(industryCustomOptions.length
                  ? ([{ type: "header", title: "Custom" }] as IndustryRow[]).concat(
                      industryCustomOptions
                        .filter(
                          (c) =>
                            !industrySearch.trim() ||
                            c.toLowerCase().includes(industrySearch.trim().toLowerCase())
                        )
                        .map(
                          (label) =>
                            ({ type: "option", category: "Custom", label, key: `Custom__${label}` } as IndustryRow)
                        )
                    )
                  : []),
              ]}
              keyExtractor={(item: any) => (item.type === "header" ? `h_${item.title}` : item.key)}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ paddingBottom: MODAL_LIST_BOTTOM_PADDING }}
              style={{ marginTop: 12, marginBottom: 12 }}
              renderItem={({ item }: { item: IndustryRow }) => {
                if (item.type === "header") {
                  return (
                    <LLightText style={{ marginTop: 14, marginBottom: 8, opacity: 0.65, fontSize: 12 }}>
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
                      borderColor: checked ? UI.text : UI.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: UI.card,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <LLightText style={{ fontSize: 14, fontWeight: checked ? "800" : "500" }}>{item.label}</LLightText>
                      {!isPredefined ? (
                        <LLightText style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}>Custom</LLightText>
                      ) : null}
                    </View>
                    <LLightText style={{ opacity: 0.6 }}>{checked ? "✓" : ""}</LLightText>
                  </Pressable>
                );
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TextInput
                value={industryCustomInput}
                onChangeText={setIndustryCustomInput}
                placeholder="Add custom industry…"
                placeholderTextColor={UI.hint}
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
                  borderColor: UI.borderStrong,
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
                  borderColor: UI.text,
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
  selectedLabels?: string[];  // add this as optional
  onSelect: (label: string) => void;
  canApply: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const { visible, title = "Select City", citySearch, setCitySearch, data, selectedLabel, selectedLabels, onSelect, canApply, onClose, onApply } = props;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: UI.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>{title}</LLightText>

            <TextInput
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder='Search (e.g. "san", "austin")'
              placeholderTextColor={UI.hint}
              style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ paddingBottom: MODAL_LIST_BOTTOM_PADDING }}
              style={{ marginTop: 12, marginBottom: 12 }}
              initialNumToRender={18}
              maxToRenderPerBatch={24}
              windowSize={10}
              removeClippedSubviews={Platform.OS === "android"}
              renderItem={({ item }) => {
                const selected = selectedLabels //checks if prop is passed in at all
                  ? selectedLabels.includes(item.label)  // company: check against array
                  : item.label === selectedLabel;         // user: check against single string
                return (
                  <Pressable
                    onPress={() => onSelect(item.label)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? UI.text : UI.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: UI.card,
                    }}
                  >
                    <LLightText style={{ fontSize: 14, fontWeight: selected ? "800" : "700" }}>{item.label}</LLightText>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<LLightText style={{ paddingVertical: 16, opacity: 0.6 }}>No matches.</LLightText>}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: UI.borderStrong,
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

export function RolesSection(props: {
  roles: OpenRole[];
  onPressAdd: () => void;
  onRemove: (id: string) => void;
  onPressEdit: (role: OpenRole) => void;
}) {
  const { roles, onPressAdd, onRemove, onPressEdit} = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Open Roles</LLightText>
      <LLightText style={styles.sectionHelper}>Add positions you are actively hiring for.</LLightText>

      <GroupCard>
        <PickerRow
          title="Add Role"
          subtitle={roles.length > 0 ? `${roles.length} role${roles.length === 1 ? "" : "s"} listed` : "None added"}
          onPress={onPressAdd}
          showDivider={roles.length > 0}
        />
        {roles.map((role) => (
          <View key={role.id} style={[styles.rowPressable, { paddingVertical: 14, gap: 4 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <LLightText style={[styles.rowTitle, { flex: 1, paddingRight: 10 }]}>{role.title}</LLightText>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => onPressEdit(role)} hitSlop={8}>
                  <LLightText style={{ color: "#007AFF", fontSize: 13 }}>Edit</LLightText>
                </Pressable>
                <Pressable onPress={() => onRemove(role.id)} hitSlop={8}>
                  <LLightText style={{ color: UI.danger, fontSize: 13 }}>Remove</LLightText>
                </Pressable>
              </View>
            </View>
            {!!role.salary.trim() && (
              <LLightText style={styles.rowSub}>{role.salary}</LLightText>
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
  const { visible, onClose, onSave, initialRole } = props;

  const [title, setTitle] = React.useState("");
  const [salary, setSalary] = React.useState("");
  const [skillsText, setSkillsText] = React.useState("");
  const [postUrl, setPostUrl] = React.useState("");
  const [workType, setWorkType] = React.useState("");
  const [isRelocationCovered, setRelocation] = React.useState(false);

  // Reset/pre-populate fields each time the modal opens
  React.useEffect(() => {
    if (visible) {
      setTitle(initialRole?.title ?? "");
      setSalary(initialRole?.salary ?? "");
      setSkillsText(initialRole?.skills.join(", ") ?? "");
      setPostUrl(initialRole?.postUrl ?? "");
      setWorkType(initialRole?.workType ?? "");
      setRelocation(initialRole?.isRelocationCovered ?? false); //if not true, auto false
    }
  }, [visible, initialRole?.title, initialRole?.salary, initialRole?.workType, initialRole?.skills, initialRole?.postUrl]);

  const canSave = title.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      id: initialRole?.id ?? String(Date.now()),
      title: title.trim(),
      salary: salary.trim(),
      postedAt: initialRole?.postedAt ?? new Date().toISOString().slice(0, 10),
      skills,
      postUrl: postUrl.trim(),
      workType: workType.trim(),
      isRelocationCovered: false,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
        >
          <View
            style={{
              backgroundColor: UI.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 32,
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800", marginBottom: 16 }}>{initialRole ? "Edit Role" : "Add Role"}</LLightText>

            <LLightText style={styles.label}>Role Title *</LLightText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Software Engineer"
              placeholderTextColor={UI.hint}
              style={[styles.input, { marginBottom: 14 }]}
            />

            <LLightText style={styles.label}>Salary / Range</LLightText>
            <TextInput
              value={salary}
              onChangeText={setSalary}
              placeholder="e.g. $80k–$100k or Competitive"
              placeholderTextColor={UI.hint}
              style={[styles.input, { marginBottom: 14 }]}
            />

            <LLightText style={styles.label}>Skills (comma-separated)</LLightText>
            <TextInput
              value={skillsText}
              onChangeText={setSkillsText}
              placeholder="e.g. React, Node.js, SQL"
              placeholderTextColor={UI.hint}
              style={[styles.input, { marginBottom: 20 }]}
              autoCorrect={false}
            />

            <LLightText style={styles.label}>Work Type</LLightText>
            <TextInput
              value={workType}
              onChangeText={setWorkType}
              placeholder="e.g. Full-time, Remote, Hybrid"
              placeholderTextColor={UI.hint}
              style={[styles.input, { marginBottom: 14 }]}
              autoCorrect={false}
            />

            <LLightText style={styles.label}>Relocation Covered</LLightText>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 }}>
              <Switch
                value={isRelocationCovered}
                onValueChange={(val) => setRelocation(val)}
                trackColor={{ false: UI.hint, true: UI.text }}
              />
              <LLightText>{isRelocationCovered ? "Yes" : "No"}</LLightText>
            </View>

            <LLightText style={styles.label}>Job Posting URL </LLightText>
            <TextInput
              value={postUrl}
              onChangeText={setPostUrl}
              placeholder="site link"
              placeholderTextColor={UI.hint}
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
                  borderColor: UI.borderStrong,
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
                  borderColor: UI.text,
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

export function CoreValuesPickerModal(props: {
  visible: boolean;
  selected: string[];
  onToggle: (value: string) => void;
  onClose: () => void;
}) {
  const { visible, selected, onToggle, onClose } = props;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{
          backgroundColor: UI.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
          maxHeight: "85%",
          marginTop: "auto",
        }}>
          <LLightText style={{ fontSize: 18, fontWeight: "800" }}>Core Values</LLightText>
          <LLightText style={{ opacity: 0.6, marginTop: 4 }}>Choose up to 5.</LLightText>

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
                    borderColor: checked ? UI.text : UI.border,
                    borderRadius: 12,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: maxReached ? 0.4 : 1,
                  }}
                >
                  <LLightText style={{ fontSize: 14, fontWeight: checked ? "800" : "500" }}>{item}</LLightText>
                  <LLightText style={{ opacity: 0.6 }}>{checked ? "✓" : ""}</LLightText>
                </Pressable>
              );
            }}
          />

          <Pressable onPress={onClose} style={{
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: UI.borderStrong,
            borderRadius: 12,
            alignItems: "center",
          }}>
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
}) {
  const { coreValues, onPressAdd, onRemove } = props;

  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 14 }]}>Core Values</LLightText>
      <LLightText style={[styles.sectionHelper, { marginTop: 4 }]}>Choose up to 5.</LLightText>
      <GroupCard>
        <PickerRow
          title="Add Core Value"
          subtitle={coreValues.length > 0 ? `${coreValues.length}/5 selected` : "Select"}
          onPress={onPressAdd}
          showDivider={coreValues.length > 0}
        />
        {coreValues.map((value) => (
          <Pressable key={value} onPress={() => onRemove(value)} style={[styles.rowPressable, { paddingVertical: 14 }]}>
            <LLightText style={styles.rowTitle}>{value}</LLightText>
            <LLightText style={[styles.rowTitle, { color: UI.danger }]}>Remove</LLightText>
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
  const { visible, title, options, tempValue, setTempValue, canApply, onClose, onApply } = props;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: UI.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "80%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>{title}</LLightText>

            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 20 }}>
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
                      borderColor: selected ? UI.text : UI.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: UI.card,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <LLightText style={{ fontWeight: selected ? "800" : "500" }}>{opt}</LLightText>
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
                  borderColor: UI.borderStrong,
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
                  borderColor: UI.text,
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: UI.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: "85%",
            }}
          >
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>Work Type</LLightText>

            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 20 }}>
              <LLightText style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Employment Type</LLightText>
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
                      borderColor: selected ? UI.text : UI.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: UI.card,
                    }}
                  >
                    <LLightText style={{ fontWeight: selected ? "800" : "500" }}>{opt}</LLightText>
                  </Pressable>
                );
              })}

              <View style={{ height: 8 }} />
              <LLightText style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Work Preference</LLightText>
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
                      borderColor: selected ? UI.text : UI.border,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: UI.card,
                    }}
                  >
                    <LLightText style={{ fontWeight: selected ? "800" : "500" }}>{opt}</LLightText>
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
                  borderColor: UI.borderStrong,
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
                  borderColor: UI.text,
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
