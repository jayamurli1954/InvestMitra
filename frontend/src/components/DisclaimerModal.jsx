import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DisclaimerText from './DisclaimerText';

/**
 * DisclaimerModal - Shows investment disclaimer to new users
 * Used during registration or first login
 */
const DisclaimerModal = ({ open, onAccept, onDecline }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  const handleScroll = (e) => {
    const element = e.target;
    const scrolledToBottom =
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;

    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (hasRead) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] bg-slate-900 border-yellow-500/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Investment Disclaimer - Required Reading
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div
          className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar"
          onScroll={handleScroll}
        >
          <DisclaimerText />
        </div>

        {/* Scroll Reminder */}
        {!hasScrolledToBottom && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-center">
            <p className="text-sm text-blue-300">
              📜 Please scroll down to read the complete disclaimer
            </p>
          </div>
        )}

        {/* Acceptance Checkbox */}
        <div className="space-y-4 mt-4 border-t border-slate-700 pt-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-1 w-5 h-5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className={`text-sm leading-relaxed ${
              hasScrolledToBottom ? 'text-slate-300' : 'text-slate-500'
            }`}>
              I acknowledge that I have read and understood the complete Investment Disclaimer above.
              I understand that this platform provides <strong>educational tools only</strong> and
              does <strong>NOT</strong> constitute financial advice. I understand that all investment
              decisions are my sole responsibility and that investing carries significant risk,
              including the potential loss of principal.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={onDecline}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Decline & Exit
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!hasRead}
              className={`${
                hasRead
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I Accept & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisclaimerModal;
