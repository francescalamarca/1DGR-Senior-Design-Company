/*
Here's the full avatar flow now:

File upload (onPickAvatarImage)

Pick image → show as preview immediately
Run through remove.bg (image_file)
Update preview to bg-removed version
Upload processed PNG to S3 → store key
URL input (onSetAvatarFromUrl)

Validate .png extension
Run through remove.bg (image_url)
Set as local preview
Upload processed PNG to S3 → store key
Both reuse pickingAvatarImage as the loading state so the UI already shows the spinner during processing. The BackgroundRemover.tsx web component is unchanged and can still be used independently.

*/


import React from "react";
import { View, Pressable, ActivityIndicator, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { RequireUserType } from "@/src/components/RequireUserType";

import { styles, UI } from "./profileEdit.styles";
import { LLightText, KeyboardScreen } from "./profileEdit.components";
import {
  COMPANY_AGE_OPTIONS,
  WORK_TYPE_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
  CORE_VALUES,
} from "./profileEdit.constants";
import { useProfileEditController } from "./useProfileEditController";
import {
  AvatarSection,
  NameSection,
  CoreValuesSection,
  MissionSection,
  IndustryTypeSection,
  VideoLibrarySection,
  ProfileMediaResetSection,
  IndustryPickerModal,
  CityPickerModal,
  SinglePickerModal,
  WorkTypePickerModal,
  CoreValuesPickerModal,
  BackgroundColorSection,
  BenefitsSection,
  RolesSection,
  RoleFormModal,
  CompanyCultureSection,
} from "./profileEdit.ui";

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
    updateRole,
  } = useProfileEditController();

  const [editingRole, setEditingRole] = React.useState<import("@/src/features/profile/profile.types").OpenRole | null>(null);

  
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

        <CompanyCultureSection
        culture={draft.companyCulture ?? ""}
        onChangeCulture={(v: string) => setDraft((p) => ({...p, companyCulture: v}))}
        />

        <CoreValuesPickerModal
          visible={coreValuesPickerVisible}
          selected={draft.coreValues ?? []}
          onToggle={addCoreValue}
          onClose={() => setCoreValuesPickerVisible(false)}
        />

        <MissionSection mission={draft.missionStatement ?? ""} onChangeMission={(v: string) => setDraft((p) => ({ ...p, missionStatement: v }))} />

        <IndustryTypeSection
          companyAgeSubtitle={draft.businessAge?.trim() ? draft.businessAge : "Select"}
          industrySubtitle={summarizeIndustries(draft.industry ?? "")}
          locations={draft.locations ?? []}
          onPressAddLocation={openCityPicker}
          onRemoveLocation={removeLocation}
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
          onPressAdd={() => { setEditingRole(null); setRoleFormVisible(true); }}
          onRemove={removeRole}
          onPressEdit={(role) => { setEditingRole(role); setRoleFormVisible(true); }}
        />

        <RoleFormModal
          visible={roleFormVisible}
          onClose={() => { setRoleFormVisible(false); setEditingRole(null);}}
          onSave={(role) => { if (editingRole) { updateRole(role); } else { addRole(role); } }}
          initialRole={editingRole ?? undefined}
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
