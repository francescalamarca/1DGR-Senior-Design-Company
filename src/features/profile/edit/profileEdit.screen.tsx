import React from "react";
import { View, Pressable, ActivityIndicator, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { RequireUserType } from "@/src/components/RequireUserType";

import { styles, UI } from "./profileEdit.styles";
import { LLightText, KeyboardScreen } from "./profileEdit.components";
import {
  INDUSTRY_EXPERIENCE_OPTIONS,
  RESIDENCY_STATUS_OPTIONS,
  DEGREE_OPTIONS,
  WORK_TYPE_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
} from "./profileEdit.constants";
import { useProfileEditController } from "./useProfileEditController";
import {
  AvatarSection,
  NameSection,
  ValuesSection,
  HookSection,
  IndustryStatusSection,
  HigherEducationSection,
  VideoLibrarySection,
  ProfileMediaResetSection,
  IndustryPickerModal,
  CityPickerModal,
  SinglePickerModal,
  WorkTypePickerModal,
} from "./profileEdit.ui";

const MODAL_KB_OFFSET_IOS = 12;
const MODAL_LIST_BOTTOM_PADDING = Platform.OS === "ios" ? 280 : 320;

export default function ProfileEditScreen() {
  const [workTypePickerVisible, setWorkTypePickerVisible] = React.useState(false);
  const [workTypeTemp, setWorkTypeTemp] = React.useState("");
  const [workPreferenceTemp, setWorkPreferenceTemp] = React.useState("");

  const {
    MAX_HIGHER_ED,
    scrollRef,
    draft,
    setDraft,
    isSaving,
    canSave,
    handleCancel,
    handleSave,
    avatarPreviewUri,
    pickingAvatarImage,
    hasAvatar,
    onPickAvatarImage,
    onRemoveAvatarImage,
    summarizeIndustries,
    openSingleSelectPicker,
    openIndustryPicker,
    openCityPicker,
    clearCity,
    higherEdEntries,
    openHigherEdPicker,
    openDegreePickerForUniversity,
    removeHigherEducationEntry,
    clearAllHigherEducation,
    mediaVideoUri,
    mediaThumbUri,
    mediaCaption,
    setMediaCaption,
    generatingThumbs,
    thumbOptions,
    canUploadToLibrary,
    valuesText,
    onChangeValuesText,
    addingLibraryVideo,
    onPickMediaVideo,
    onPickMediaThumb,
    selectThumbnail,
    onUploadSelectedMediaToLibrary,
    resetProfileMediaOnly,
    industryPickerVisible,
    setIndustryPickerVisible,
    industrySearch,
    setIndustrySearch,
    industryRows,
    industryCustomOptions,
    industryCustomInput,
    setIndustryCustomInput,
    addCustomIndustry,
    industryTempSelected,
    toggleIndustry,
    predefinedIndustrySet,
    applyIndustrySelection,
    cityPickerVisible,
    setCityPickerVisible,
    citySearch,
    setCitySearch,
    filteredCities,
    cityTempSelected,
    setCityTempSelected,
    applyCity,
    singlePickerVisible,
    setSinglePickerVisible,
    singlePickerTitle,
    singlePickerOptions,
    singlePickerTempValue,
    setSinglePickerTempValue,
    singlePickerOnSelect,
    higherEdPickerVisible,
    setHigherEdPickerVisible,
    higherEdSearch,
    setHigherEdSearch,
    higherEdListRef,
    filteredUniversities,
    degreePickerVisible,
    setDegreePickerVisible,
    degreePickerUniversity,
    degreeTempSelected,
    toggleDegree,
    degreeTempFields,
    setDegreeField,
    degreeTempGraduation,
    setDegreeTempGraduation,
    applyDegreeSelection,
  } = useProfileEditController();

  const workTypeSubtitle = React.useMemo(() => {
    const wt = String((draft as any).workType ?? "").trim();
    const wp = String((draft as any).workPreference ?? "").trim();
    return wt || wp ? [wt, wp].filter(Boolean).join(" · ") : "Select";
  }, [draft]);

  const openWorkTypePicker = React.useCallback(() => {
    setWorkTypeTemp(String((draft as any).workType ?? ""));
    setWorkPreferenceTemp(String((draft as any).workPreference ?? ""));
    setWorkTypePickerVisible(true);
  }, [draft]);

  const Header = (
    <View style={styles.header}>
      <Pressable onPress={handleCancel} style={[styles.headerAction, styles.headerLeft]} hitSlop={10} disabled={isSaving}>
        <LLightText style={{ opacity: isSaving ? 0.5 : 1 }}>Cancel</LLightText>
      </Pressable>

      <LLightText pointerEvents="none" style={styles.headerTitle}>
        Edit Profile
      </LLightText>

      <Pressable
        disabled={!canSave || isSaving}
        style={[styles.headerAction, styles.headerRight, { opacity: canSave && !isSaving ? 1 : 0.4 }]}
        hitSlop={10}
        onPress={handleSave}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isSaving ? <ActivityIndicator size="small" color="black" /> : null}
          {!isSaving ? <LLightText>Save</LLightText> : null}
        </View>
      </Pressable>
    </View>
  );

  return (
    <>
      <RequireUserType type="home" />

      <KeyboardScreen scroll scrollRef={scrollRef} header={Header} backgroundColor={UI.bg} contentContainerStyle={styles.content}>
        <AvatarSection
          avatarPreviewUri={avatarPreviewUri}
          pickingAvatarImage={pickingAvatarImage}
          isSaving={isSaving}
          hasAvatar={hasAvatar}
          onPickAvatarImage={onPickAvatarImage}
          onRemoveAvatarImage={onRemoveAvatarImage}
        />

        <NameSection
          preferredName={draft.preferredName ?? ""}
          legalFirstName={draft.legalFirstName ?? ""}
          legalMiddleName={(draft as any).legalMiddleName ?? ""}
          legalLastName={draft.legalLastName ?? ""}
          onChangePreferredName={(v: string) => setDraft((p) => ({ ...p, preferredName: v }))}
          onChangeLegalFirst={(v: string) => setDraft((p) => ({ ...p, legalFirstName: v }))}
          onChangeLegalMiddle={(v: string) => setDraft((p: any) => ({ ...p, legalMiddleName: v }))}
          onChangeLegalLast={(v: string) => setDraft((p) => ({ ...p, legalLastName: v }))}
        />

        <ValuesSection valuesText={valuesText} onChangeValuesText={onChangeValuesText} />

        <HookSection bio={draft.bio ?? ""} onChangeBio={(v: string) => setDraft((p) => ({ ...p, bio: v }))} />

        <IndustryStatusSection
          workTypeSubtitle={workTypeSubtitle}
          residencySubtitle={draft.residencyStatus?.trim() ? draft.residencyStatus : "Select"}
          experienceSubtitle={draft.industryExperience?.trim() ? draft.industryExperience : "Select"}
          industrySubtitle={summarizeIndustries(draft.industryInterests ?? [])}
          citySubtitle={draft.geographicLocation?.trim() ? draft.geographicLocation : "Select"}
          hasCity={!!draft.geographicLocation?.trim()}
          onPressWorkType={openWorkTypePicker}
          onPressResidency={() =>
            openSingleSelectPicker({
              title: "Residency Status",
              options: RESIDENCY_STATUS_OPTIONS,
              value: draft.residencyStatus ?? "",
              onSelect: (val: string) => setDraft((p) => ({ ...p, residencyStatus: val })),
            })
          }
          onPressExperience={() =>
            openSingleSelectPicker({
              title: "Industry Experience",
              options: INDUSTRY_EXPERIENCE_OPTIONS,
              value: draft.industryExperience ?? "",
              onSelect: (val: string) => setDraft((p) => ({ ...p, industryExperience: val })),
            })
          }
          onPressIndustry={openIndustryPicker}
          onPressCity={openCityPicker}
          onClearCity={clearCity}
        />

        <HigherEducationSection
          max={MAX_HIGHER_ED}
          entries={higherEdEntries as any}
          onOpenPicker={openHigherEdPicker}
          onEdit={(unitid: string, label: string) => openDegreePickerForUniversity({ unitid, label })}
          onRemove={(unitid: string) => removeHigherEducationEntry(unitid)}
          onClearAll={clearAllHigherEducation}
        />

        <VideoLibrarySection
          mediaVideoUri={mediaVideoUri}
          mediaThumbUri={mediaThumbUri}
          mediaCaption={mediaCaption}
          generatingThumbs={generatingThumbs}
          thumbOptions={thumbOptions}
          canUpload={canUploadToLibrary}
          adding={addingLibraryVideo}
          onPickVideo={onPickMediaVideo}
          onPickThumb={onPickMediaThumb}
          onSelectThumb={(uri: string) => selectThumbnail(uri)}
          onChangeCaption={(v: string) => setMediaCaption(v)}
          onUpload={onUploadSelectedMediaToLibrary}
        />

        <ProfileMediaResetSection isSaving={isSaving} onReset={resetProfileMediaOnly} />

        <IndustryPickerModal
          visible={industryPickerVisible}
          industrySearch={industrySearch}
          setIndustrySearch={setIndustrySearch}
          industryRows={industryRows}
          industryCustomOptions={industryCustomOptions}
          industryCustomInput={industryCustomInput}
          setIndustryCustomInput={setIndustryCustomInput}
          onAddCustomIndustry={addCustomIndustry}
          industryTempSelected={industryTempSelected}
          toggleIndustry={toggleIndustry}
          predefinedIndustrySet={predefinedIndustrySet}
          onClose={() => setIndustryPickerVisible(false)}
          onApply={applyIndustrySelection}
        />

        <CityPickerModal
          visible={cityPickerVisible}
          citySearch={citySearch}
          setCitySearch={setCitySearch}
          data={filteredCities}
          selectedLabel={cityTempSelected}
          onSelect={(label: string) => setCityTempSelected(label)}
          canApply={!!cityTempSelected.trim()}
          onClose={() => setCityPickerVisible(false)}
          onApply={applyCity}
        />

        <SinglePickerModal
          visible={singlePickerVisible}
          title={singlePickerTitle}
          options={singlePickerOptions}
          tempValue={singlePickerTempValue}
          setTempValue={setSinglePickerTempValue}
          canApply={!!singlePickerTempValue.trim()}
          onClose={() => setSinglePickerVisible(false)}
          onApply={() => {
            if (singlePickerTempValue?.trim()) singlePickerOnSelect(singlePickerTempValue);
            setSinglePickerVisible(false);
          }}
        />

        <WorkTypePickerModal
          visible={workTypePickerVisible}
          typeOptions={WORK_TYPE_OPTIONS}
          preferenceOptions={WORK_PREFERENCE_OPTIONS}
          selectedType={workTypeTemp}
          selectedPreference={workPreferenceTemp}
          onSelectType={setWorkTypeTemp}
          onSelectPreference={setWorkPreferenceTemp}
          onClose={() => setWorkTypePickerVisible(false)}
          onApply={() => {
            setDraft((p: any) => ({
              ...p,
              workType: String(workTypeTemp ?? "").trim(),
              workPreference: String(workPreferenceTemp ?? "").trim(),
            }));
            setWorkTypePickerVisible(false);
          }}
        />

        <Modal visible={higherEdPickerVisible} transparent animationType="slide" onRequestClose={() => setHigherEdPickerVisible(false)}>
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
                <View style={{ gap: 10, marginBottom: 12 }}>
                  <LLightText style={{ fontSize: 18, fontWeight: "800" }}>
                    Add University ({higherEdEntries.length}/{MAX_HIGHER_ED})
                  </LLightText>

                  <TextInput
                    value={higherEdSearch}
                    onChangeText={setHigherEdSearch}
                    placeholder='Search (e.g. "ucla", "los angeles", "uc davis")'
                    placeholderTextColor={UI.hint}
                    style={[styles.input, { borderRadius: 12 }]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                </View>

                <FlatList
                  ref={(r) => {
                    higherEdListRef.current = r;
                  }}
                  data={filteredUniversities}
                  keyExtractor={(item) => item.unitid || item.id}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  contentContainerStyle={{ paddingBottom: MODAL_LIST_BOTTOM_PADDING }}
                  style={{ marginBottom: 14 }}
                  initialNumToRender={18}
                  maxToRenderPerBatch={24}
                  windowSize={10}
                  removeClippedSubviews={Platform.OS === "android"}
                  renderItem={({ item }) => {
                    const alreadyAdded = higherEdEntries.some((e) => String(e.unitid) === String(item.unitid));
                    const disabled = !alreadyAdded && higherEdEntries.length >= MAX_HIGHER_ED;

                    return (
                      <Pressable
                        onPress={() => openDegreePickerForUniversity({ unitid: item.unitid, label: item.label })}
                        disabled={disabled}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderWidth: 1,
                          borderColor: UI.border,
                          borderRadius: 12,
                          marginBottom: 8,
                          opacity: disabled ? 0.4 : 1,
                          backgroundColor: UI.card,
                        }}
                      >
                        <LLightText style={{ fontSize: 14, fontWeight: alreadyAdded ? "800" : "500" }}>{item.label}</LLightText>

                        {item.acronym?.length >= 3 ? (
                          <LLightText style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}>Acronym: {item.acronym.toUpperCase()}</LLightText>
                        ) : null}

                        {alreadyAdded ? (
                          <LLightText style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>Already added (tap to edit degrees)</LLightText>
                        ) : null}

                        {disabled ? (
                          <LLightText style={{ marginTop: 4, fontSize: 12, color: UI.danger, fontWeight: "700" }}>
                            Cap reached (max {MAX_HIGHER_ED})
                          </LLightText>
                        ) : null}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <LLightText style={{ paddingVertical: 16, opacity: 0.6 }}>
                      {higherEdSearch.trim().length < 2 ? "Type at least 2 letters to search schools." : "No matches found."}
                    </LLightText>
                  }
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => setHigherEdPickerVisible(false)}
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
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={degreePickerVisible} transparent animationType="slide" onRequestClose={() => setDegreePickerVisible(false)}>
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
                <LLightText style={{ fontSize: 18, fontWeight: "800" }}>{degreePickerUniversity?.label ?? "Degrees"}</LLightText>

                <LLightText style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
                  Select degrees. Add a Field of Study for each selected degree.
                </LLightText>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  style={{ marginTop: 14 }}
                  contentContainerStyle={{ paddingBottom: MODAL_LIST_BOTTOM_PADDING }}
                >
                  <LLightText style={{ marginBottom: 8, fontSize: 12, opacity: 0.7 }}>Degrees</LLightText>

                  {DEGREE_OPTIONS.map((deg) => {
                    const checked = degreeTempSelected.has(deg);
                    return (
                      <Pressable
                        key={deg}
                        onPress={() => toggleDegree(deg)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderWidth: 1,
                          borderColor: checked ? UI.text : UI.border,
                          borderRadius: 12,
                          backgroundColor: UI.card,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <LLightText style={{ fontWeight: checked ? "800" : "500" }}>{deg}</LLightText>
                        <LLightText style={{ opacity: 0.6 }}>{checked ? "✓" : ""}</LLightText>
                      </Pressable>
                    );
                  })}

                  {Array.from(degreeTempSelected).length > 0 ? (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      <LLightText style={{ fontSize: 12, opacity: 0.7 }}>Field of Study (per degree)</LLightText>

                      {Array.from(degreeTempSelected)
                        .slice()
                        .sort((a, b) => a.localeCompare(b))
                        .map((deg) => (
                          <View key={deg} style={{ gap: 6 }}>
                            <LLightText style={{ fontSize: 12, opacity: 0.7 }}>{deg}</LLightText>
                            <TextInput
                              value={degreeTempFields[deg] ?? ""}
                              onChangeText={(t) => setDegreeField(deg, t)}
                              placeholder="Computer Science"
                              placeholderTextColor={UI.hint}
                              style={[styles.input, { borderRadius: 12 }]}
                            />
                          </View>
                        ))}
                    </View>
                  ) : null}

                  <LLightText style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>Estimated graduation</LLightText>
                  <TextInput
                    value={degreeTempGraduation}
                    onChangeText={setDegreeTempGraduation}
                    placeholder="2027"
                    placeholderTextColor={UI.hint}
                    style={[styles.input, { marginTop: 8, borderRadius: 12 }]}
                    keyboardType="number-pad"
                  />
                </ScrollView>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setDegreePickerVisible(false);
                      setHigherEdPickerVisible(true);
                    }}
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
                    onPress={applyDegreeSelection}
                    disabled={degreeTempSelected.size === 0}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: UI.text,
                      borderRadius: 12,
                      alignItems: "center",
                      opacity: degreeTempSelected.size === 0 ? 0.45 : 1,
                    }}
                  >
                    <LLightText style={{ fontWeight: "800" }}>Apply</LLightText>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardScreen>
    </>
  );
}
