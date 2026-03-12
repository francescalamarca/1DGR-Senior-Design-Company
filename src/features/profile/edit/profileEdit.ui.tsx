// src/features/profile/edit/profileEdit.ui.tsx
import React from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { styles, UI } from "./profileEdit.styles";
import { LLightText, BtnText } from "./profileEdit.components";
import { MAX_CORE_VALUES, CORE_VALUES } from "./profileEdit.constants";

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
}) {
  const { avatarPreviewUri, pickingAvatarImage, isSaving, hasAvatar, onPickAvatarImage, onRemoveAvatarImage } = props;

  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 17 }]}>Avatar</LLightText>
      <LLightText style={styles.sectionHelper}>Add a profile image.</LLightText>

      <View style={[styles.inlineCard, { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 }]}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: UI.border,
            overflow: "hidden",
            backgroundColor: "#f3f3f3",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarPreviewUri ? (
            <Image source={{ uri: avatarPreviewUri }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <LLightText style={{ opacity: 0.5 }}>—</LLightText>
          )}
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <LLightText style={{ fontSize: 12, opacity: 0.6 }}>Displays over video thumbnail</LLightText>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onPickAvatarImage}
              disabled={pickingAvatarImage || isSaving}
              style={[styles.pill, { flex: 1 }, pickingAvatarImage || isSaving ? { opacity: 0.5 } : null]}
            >
              {pickingAvatarImage ? <ActivityIndicator size="small" color="black" /> : null}
              <BtnText>Choose</BtnText>
            </Pressable>

            <Pressable
              onPress={onRemoveAvatarImage}
              disabled={!hasAvatar || isSaving}
              style={[
                styles.pill,
                { flex: 1, borderColor: UI.borderStrong },
                !hasAvatar || isSaving ? { opacity: 0.5 } : null,
              ]}
            >
              <BtnText>Remove</BtnText>
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
  const {
    companyName,
    onChangeCompanyName,
  } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Name</LLightText>
      <LLightText style={styles.sectionHelper}>Preferred name is shown publicly. Legal name is optional.</LLightText>

      <View style={styles.fieldStack}>
        <LLightText style={styles.label}>Preferred Name</LLightText>
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

export function HookSection(props: { bio: string; onChangeBio: (v: string) => void }) {
  const { bio, onChangeBio } = props;

  return (
    <>
      <LLightText style={styles.sectionTitle}>Company Mission</LLightText>
      <LLightText style={styles.sectionHelper}>The mission of the company.</LLightText>

      <View style={styles.fieldStack}>
        <TextInput
          value={bio?.trim().length ? bio : ""}
          onChangeText={onChangeBio}
          placeholder="Write something about the mission…"
          placeholderTextColor={UI.hint}
          style={styles.inputMultiline}
          multiline
        />
      </View>
    </>
  );
}

//this whole function changed to work for the core values being an array of size max 5
export function CoreValuesSection(props: { 
  coreValues: string[]; 
  onPressAdd: () => void;
  onRemove: (value: string) => void;
}) {
  const { coreValues, onPressAdd, onRemove } = props;

  return (
    <>
      <LLightText style={[styles.sectionTitle, { marginTop: 14 }]}>Company Core Values</LLightText>
      <LLightText style={[styles.sectionHelper, { marginTop: 4 }]}>Choose up to 5 core values.</LLightText>

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

export function IndustryTypeSection(props: {
  workTypeSubtitle: string;
  companyAgeSubtitle: string;
  industrySubtitle: string;
  locations: string[];
  onPressWorkType: () => void;
  onPressCompanyAge: () => void;
  onPressIndustry: () => void;
  onPressAddLocation: () => void;
  onRemoveLocation: (label: string) => void;
}) {
  const {
    workTypeSubtitle,
    companyAgeSubtitle,
    industrySubtitle,
    locations,
    onPressWorkType,
    onPressCompanyAge,
    onPressIndustry,
    onPressAddLocation,
    onRemoveLocation,
  } = props;
  return (
    <>
      <LLightText style={styles.sectionTitle}>Industry</LLightText>
      <LLightText style={styles.sectionHelper}>Residency requirements, company age, work, and location.</LLightText>

      <GroupCard>
        <PickerRow title="Work Type" subtitle={workTypeSubtitle} onPress={onPressWorkType} showDivider />
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
            <LLightText style={{ fontSize: 18, fontWeight: "800" }}>Industry Interests</LLightText>

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

// export function CityPickerModal(props: {
//   visible: boolean;
//   title?: string;
//   citySearch: string;
//   setCitySearch: (v: string) => void;
//   data: CityRow[];
//   selectedLabel: string;
//   selectedLabels?: string[];  // add this as optional so that user side is not messed up
//   onSelect: (label: string) => void;
//   canApply: boolean;
//   onClose: () => void;
//   onApply: () => void;
// }) {
//   const { visible, title = "Select City", citySearch, setCitySearch, data, (selectedLabel), onSelect, canApply, onClose, onApply } =
//     props;

//   return (
//     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
//       <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
//         <KeyboardAvoidingView
//           style={{ flex: 1, justifyContent: "flex-end" }}
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           keyboardVerticalOffset={MODAL_KB_OFFSET_IOS}
//         >
//           <View
//             style={{
//               backgroundColor: UI.card,
//               borderTopLeftRadius: 20,
//               borderTopRightRadius: 20,
//               paddingHorizontal: 16,
//               paddingTop: 16,
//               paddingBottom: 24,
//               maxHeight: "85%",
//             }}
//           >
//             <LLightText style={{ fontSize: 18, fontWeight: "800" }}>{title}</LLightText>

//             <TextInput
//               value={citySearch}
//               onChangeText={setCitySearch}
//               placeholder='Search (e.g. "san", "austin")'
//               placeholderTextColor={UI.hint}
//               style={[styles.input, { borderRadius: 12, marginTop: 12 }]}
//               autoCorrect={false}
//               autoCapitalize="none"
//               clearButtonMode="while-editing"
//             />

//             <FlatList
//               data={data}
//               keyExtractor={(item) => item.id}
//               keyboardShouldPersistTaps="handled"
//               keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
//               contentContainerStyle={{ paddingBottom: MODAL_LIST_BOTTOM_PADDING }}
//               style={{ marginTop: 12, marginBottom: 12 }}
//               initialNumToRender={18}
//               maxToRenderPerBatch={24}
//               windowSize={10}
//               removeClippedSubviews={Platform.OS === "android"}
//               renderItem={({ item }) => {
//                 const selected = selectedLabels.includes === (item.label);
//                 return (
//                   <Pressable
//                     onPress={() => onSelect(item.label)}
//                     style={{
//                       paddingVertical: 12,
//                       paddingHorizontal: 12,
//                       borderWidth: 1,
//                       borderColor: selected ? UI.text : UI.border,
//                       borderRadius: 12,
//                       marginBottom: 8,
//                       backgroundColor: UI.card,
//                     }}
//                   >
//                     <LLightText style={{ fontSize: 14, fontWeight: selected ? "800" : "700" }}>{item.label}</LLightText>
//                   </Pressable>
//                 );
//               }}
//               ListEmptyComponent={<LLightText style={{ paddingVertical: 16, opacity: 0.6 }}>No matches.</LLightText>}
//             />

//             <View style={{ flexDirection: "row", gap: 10 }}>
//               <Pressable
//                 onPress={onClose}
//                 style={{
//                   flex: 1,
//                   paddingVertical: 12,
//                   borderWidth: 1,
//                   borderColor: UI.borderStrong,
//                   borderRadius: 12,
//                   alignItems: "center",
//                 }}
//               >
//                 <LLightText style={{ fontWeight: "800" }}>Close</LLightText>
//               </Pressable>

//               <Pressable
//                 onPress={onApply}
//                 disabled={!canApply}
//                 style={{
//                   flex: 1,
//                   paddingVertical: 12,
//                   borderWidth: 1,
//                   borderColor: UI.text,
//                   borderRadius: 12,
//                   alignItems: "center",
//                   opacity: canApply ? 1 : 0.4,
//                 }}
//               >
//                 <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
//               </Pressable>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </View>
//     </Modal>
//   );
// }

//this was added - with claud help - to choose core values when the box is pressd from a dropdown
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
            data={CORE_VALUES} //from the constants file, will have to import
            keyExtractor={(item) => item}
            style={{ marginTop: 12, marginBottom: 12 }}
            renderItem={({ item }) => {
              const checked = selected.includes(item);
              const maxReached = selected.length >= MAX_CORE_VALUES && !checked; //MAX CORE VALUES REFERRED TO FROM CONSTANTS SO CAN BE EASILY CHANGED LATER AS ONE VARIABLE ASSIGNMENT

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
                    backgroundColor: UI.card,
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
