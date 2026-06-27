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
  const [hasRead, setHasRead] = useState(false);

  const handleAccept = () => {
    if (hasRead && onAccept) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-4xl h-[85vh] flex flex-col bg-slate-900 border-yellow-500/30 text-slate-100 p-6 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            Investment Disclaimer - Required Reading
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar my-2 space-y-4">
          <DisclaimerText />
        </div>

        {/* Acceptance Checkbox & Action Buttons */}
        <div className="shrink-0 space-y-4 border-t border-slate-700 pt-4 bg-slate-900">
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1 w-5 h-5 cursor-pointer accent-emerald-500"
            />
            <span className="text-sm leading-relaxed text-slate-300 group-hover:text-white transition-colors">
              I acknowledge that I have read and understood the complete Investment Disclaimer above.
              I understand that this platform provides <strong>educational tools only</strong> and
              does <strong>NOT</strong> constitute financial advice. I understand that all investment
              decisions are my sole responsibility and that investing carries significant risk,
              including the potential loss of principal.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
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
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20'
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
