import React from "react";
import { View, Pressable, ActivityIndicator, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { RequireUserType } from "@/src/components/RequireUserType";

import { styles, UI } from "./profileEdit.styles";
import { LLightText, KeyboardScreen } from "./profileEdit.components";
import {
  INDUSTRY_EXPERIENCE_OPTIONS,
  WORK_TYPE_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
} from "./profileEdit.constants";
import { useProfileEditController } from "./useProfileEditController";
import {
  AvatarSection,
  NameSection,
  ValuesSection,
  HookSection,
  IndustryTypeSection,
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
  //this header enables us to edit the profile and SAVE changes
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
      <RequireUserType type="company" />

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

        <IndustryTypeSection
          workTypeSubtitle={workTypeSubtitle}
          companyAgeSubtitle={draft.industryExperience?.trim() ? draft.industryExperience : "Select"}
          industrySubtitle={summarizeIndustries(draft.industryInterests ?? [])}
          citySubtitle={draft.geographicLocation?.trim() ? draft.geographicLocation : "Select"}
          hasCity={!!draft.geographicLocation?.trim()}
          onPressWorkType={openWorkTypePicker}
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
      </KeyboardScreen>
    </>
  );
}
