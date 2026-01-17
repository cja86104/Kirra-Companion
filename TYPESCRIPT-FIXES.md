# TypeScript Error Fixes - Kirra Companion

## Summary
Fixed 14 TypeScript errors across 9 files.

---

## 1. `lib/companion/skill-detection.ts` (Fix for route.ts:470)

**Issue:** `findRelevantSkills` didn't return the `id` field, but `trackSkillUsage` in chat route required `skill_id`.

**Fix:** Added `id` to:
- The database select query
- The `SkillQueryResult` interface  
- The function return type
- The mapped return object

---

## 2. `app/life-feed/page.tsx:102`

**Issue:** Invalid fallback key `EVENT_CONFIG.thought` - `'thought'` doesn't exist in `EventType`.

**Fix:** Changed fallback to `EVENT_CONFIG.growth` (a valid EventType).

---

## 3. `components/chat/VoiceConversationMode.tsx:52` (3 errors)

**Issue:** `declare global` block for `Window.SpeechRecognition` conflicting with existing TypeScript lib definitions.

**Fix:** Removed the `declare global` block entirely and created a helper function approach:
- Added `SpeechRecognitionConstructor` type alias
- Created `getSpeechRecognition()` helper function that safely accesses `window.SpeechRecognition` or `window.webkitSpeechRecognition` using `any` cast
- Updated all usages to use the helper function instead of direct window access

---

## 4. `components/chat/ChatWindow.tsx:216`

**Issue:** `optimisticMessage` object had properties (`attachments`, `voice_url`, `emotion_analysis`, etc.) that don't exist in the `Message` type from the database schema.

**Fix:** Removed non-existent properties and aligned with actual `Messages` table schema:
- Removed: `attachments`, `voice_url`, `voice_duration_seconds`, `emotion_analysis`, `response_context`, `memory_triggers`, `edited_at`, `original_content`, `deleted_at`, `user_rating`, `user_feedback`
- Kept only valid columns: `audio_url`, `audio_duration`, `updated_at`

---

## 5. `app/companion/[companionId]/page.tsx:149`

**Issue:** Type mismatch when spreading `avatarConfig` (type `NiceAvatarConfig`) into companion state where `avatar_3d_config` expects `Json`.

**Fix:** 
- Added `Json` to the type imports
- Cast `avatarConfig` and `traits` with `as unknown as Json` in the state update

---

## 6. `app/settings/notifications/page.tsx:85` (2 errors)

**Issue:** Type assertion from Supabase `Json` type to specific object type was failing.

**Fix:** Replaced direct type assertion with runtime type checking:
```typescript
if (data?.preferences && typeof data.preferences === 'object' && data.preferences !== null) {
  const prefs = data.preferences as Record<string, unknown>;
  if (prefs.notifications && typeof prefs.notifications === 'object') {
    setSettings({ ...defaultSettings, ...(prefs.notifications as NotificationSettings) });
  }
}
```

---

## 7. `app/settings/privacy/page.tsx:75` (2 errors)

**Issue:** Same as notifications page - type assertion from `Json` to object type failing.

**Fix:** Same runtime type checking approach as notifications page.

---

## 8. `types/database.ts` (VoiceConfig fix for VoiceSelector)

**Issue:** `VoiceConfig` interface had ElevenLabs-specific required properties, but VoiceSelector was creating OpenAI TTS configs with different properties (`model`, `speed`).

**Fix:** Made `VoiceConfig` flexible to support both providers:
- Made ElevenLabs properties optional (`stability?`, `similarityBoost?`, `style?`, `speakingRate?`)
- Added OpenAI TTS properties (`model?`, `speed?`)

---

## 9. `app/chat/[companionId]/page.tsx:65`

**Issue:** TypeScript type narrowing wasn't working properly after `notFound()` call for the companion variable.

**Fix:** 
- Added `CompanionWithDNA` to the type imports
- Used explicit type assertion: `companion as CompanionWithDNA` at the usage site

---

## Files Modified

1. `lib/companion/skill-detection.ts`
2. `app/life-feed/page.tsx`
3. `components/chat/VoiceConversationMode.tsx`
4. `components/chat/ChatWindow.tsx`
5. `app/companion/[companionId]/page.tsx`
6. `app/settings/notifications/page.tsx`
7. `app/settings/privacy/page.tsx`
8. `types/database.ts`
9. `app/chat/[companionId]/page.tsx`
