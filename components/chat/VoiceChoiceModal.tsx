'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { unlockAudioPlayback } from '@/lib/audio/unlock';

interface VoiceChoiceModalProps {
  /** Whether the modal is open. Controlled by the parent. */
  open: boolean;
  /** Companion name shown in the description — personalizes the prompt. */
  companionName: string;
  /**
   * Fired when the user picks an option. The parent is responsible for
   * persisting the choice (sessionStorage) and applying it to autoPlayVoice
   * state. Closing the modal is done by the parent setting `open` to false
   * after handling the choice — there is no dismiss-without-choosing path.
   */
  onChoice: (voiceOn: boolean) => void;
}

/**
 * Voice consent modal shown once per companion per browser session.
 *
 * Defaulting TTS to OFF prevents silent cost leakage for users who never
 * wanted voice in the first place — primarily relationship-companion users
 * who chat in contexts where spoken audio is disruptive (private spaces,
 * shared devices, late-night usage) but are unlikely to proactively mute.
 *
 * Blocking by design:
 *   - showClose={false}    — no X in the corner
 *   - onPointerDownOutside — clicking the backdrop does nothing
 *   - onEscapeKeyDown      — pressing Escape does nothing
 * The user MUST pick a button before interacting with the chat.
 *
 * The choice is session-scoped. Refreshing the page within the same tab
 * honors the choice; closing the tab clears it and the next open asks
 * again. This is intentional — voice context changes by situation (partner
 * home vs not, headphones vs speakers, time of day) so fresh consent per
 * session is better UX than a locked-forever preference.
 */
export function VoiceChoiceModal({
  open,
  companionName,
  onChoice,
}: VoiceChoiceModalProps) {
  return (
    <Dialog
      open={open}
      // Radix fires onOpenChange for every dismiss attempt (X, overlay click,
      // Escape). We ignore all of them — only the two buttons below can close
      // the modal, via onChoice → parent flips `open` to false.
      onOpenChange={() => {
        /* intentional no-op: blocking modal, parent controls lifecycle */
      }}
    >
      <DialogContent
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Turn on voice for this conversation?</DialogTitle>
          <DialogDescription>
            {companionName}&apos;s responses will be read aloud. You can toggle
            the speaker icon at the top of the chat any time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onChoice(false)}
            className="sm:order-1"
          >
            <VolumeX className="mr-2 h-4 w-4" />
            Keep voice off
          </Button>
          <Button
            onClick={() => {
              // CRITICAL: must run synchronously inside this onClick handler
              // (no await before) so iOS Safari treats it as a real user
              // gesture and unlocks the audio element for subsequent
              // programmatic .play() calls. See lib/audio/unlock.ts.
              unlockAudioPlayback();
              onChoice(true);
            }}
            className="sm:order-2"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            Turn voice on
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
