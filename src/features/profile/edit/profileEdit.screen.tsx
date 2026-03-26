import React from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";

import { RequireUserType } from "@/src/components/RequireUserType";

import { KeyboardScreen, LLightText } from "./profileEdit.components";
import {
  COMPANY_AGE_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
  WORK_TYPE_OPTIONS
} from "./profileEdit.constants";
import { UI, styles } from "./profileEdit.styles";
import {
  AvatarSection,
  BackgroundColorSection,
  BenefitsSection,
  CoreValuesPickerModal,
  CoreValuesSection,
  IndustryTypeSection,
  MissionSection,
  NameSection,
  ProfileMediaResetSection,
  RoleFormModal,
  RolesSection,
  SinglePickerModal,
  WorkTypePickerModal,
} from "./profileEdit.ui";
import { useProfileEditController } from "./useProfileEditController";

const MODAL_KB_OFFSET_IOS = 12;
const MODAL_LIST_BOTTOM_PADDING = Platform.OS === "ios" ? 280 : 320;

export default function ProfileEditScreen() {
  const [workTypePickerVisible, setWorkTypePickerVisible] = React.useState(false);
  const [workTypeTemp, setWorkTypeTemp] = React.useState("");
  const [workPreferenceTemp, setWorkPreferenceTemp] = React.useState("");

  const {
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
    onSetAvatarFromUrl,
    summarizeIndustries,
    openSingleSelectPicker,
    openIndustryPicker,
    openCityPicker,
    mediaVideoUri,
    mediaThumbUri,
    mediaCaption,
    setMediaCaption,
    generatingThumbs,
    thumbOptions,
    canUploadToLibrary,
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
    addLocation,
    removeLocation,
    singlePickerVisible,
    setSinglePickerVisible,
    singlePickerTitle,
    singlePickerOptions,
    singlePickerTempValue,
    setSinglePickerTempValue,
    singlePickerOnSelect,
    addCoreValue,
    removeCoreValue,
    openCoreValuesPicker,
    coreValuesPickerVisible,
    setCoreValuesPickerVisible,
    selectBackgroundColor,
    roleFormVisible,
    setRoleFormVisible,
    addRole,
    removeRole,
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
          onSetAvatarFromUrl={onSetAvatarFromUrl} //added this function so the user can add a url to a photo as the logo
        />

        <NameSection
          companyName={draft.companyName ?? ""}
          onChangeCompanyName={(v: string) => setDraft((p) => ({ ...p, companyName: v }))}
        />

        <BackgroundColorSection
          selectedColor={draft.customBackgroundColor ?? ""}
          onSelect={selectBackgroundColor}
        />

        <CoreValuesSection
          coreValues={draft.coreValues ?? []}
          onPressAdd={openCoreValuesPicker}
          onRemove={removeCoreValue}
        />

        <BenefitsSection
          benefits={draft.benefitsSummary ?? ""}
          onChangeBenefits={(v: string) => setDraft((p) => ({...p, benefitsSummary: v }))}
        />

        <CoreValuesPickerModal
          visible={coreValuesPickerVisible}
          selected={draft.coreValues ?? []}
          onToggle={addCoreValue}
          onClose={() => setCoreValuesPickerVisible(false)}
        />

        <MissionSection mission={draft.missionStatement ?? ""} onChangeMission={(v: string) => setDraft((p) => ({ ...p, missionStatement: v }))} />

        <IndustryTypeSection
          workTypeSubtitle={workTypeSubtitle}
          companyAgeSubtitle={draft.businessAge?.trim() ? draft.businessAge : "Select"}
          industrySubtitle={summarizeIndustries(draft.industry ?? "")}
          locations={draft.locations ?? []}
          onPressAddLocation={openCityPicker}
          onRemoveLocation={removeLocation}
          onPressWorkType={openWorkTypePicker}
          onPressCompanyAge={() =>
            openSingleSelectPicker({
              title: "Business Age",
              options: COMPANY_AGE_OPTIONS, //in years
              value: draft.businessAge ?? "",
              onSelect: (val: string) => setDraft((p) => ({ ...p, businessAge: val })),
            })
          }
          onPressIndustry={openIndustryPicker}
        />

        <RolesSection
          roles={draft.openRoles ?? []}
          onPressAdd={() => setRoleFormVisible(true)}
          onRemove={removeRole}
        />

        <RoleFormModal
          visible={roleFormVisible}
          onClose={() => setRoleFormVisible(false)}
          onSave={addRole}
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
          title="Add Location"
          citySearch={citySearch}
          setCitySearch={setCitySearch}
          data={filteredCities}
          selectedLabel=""
          selectedLabels={draft.locations ?? []}
          onSelect={(label) => addLocation(label)}
          canApply={false}
          onClose={() => setCityPickerVisible(false)}
          onApply={() => setCityPickerVisible(false)}
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
