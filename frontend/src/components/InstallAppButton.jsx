import { useEffect, useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const detectIOS = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  const iOSDevice = /iphone|ipad|ipod/.test(ua);
  const iPadDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return iOSDevice || iPadDesktopMode;
};

const detectStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const InstallAppButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const isIOS = useMemo(() => detectIOS(), []);

  useEffect(() => {
    setIsStandalone(detectStandalone());

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success('InvestMitra installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      setIsPrompting(true);
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result?.outcome === 'accepted') {
          toast.success('Install started');
        } else {
          toast.info('Install dismissed');
        }
      } catch (error) {
        toast.error('Unable to start install prompt');
      } finally {
        setDeferredPrompt(null);
        setIsPrompting(false);
      }
      return;
    }

    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }

    window.open('/install.html', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleInstall}
        disabled={isPrompting}
        aria-label="Install InvestMitra app"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">{isPrompting ? 'Opening...' : 'Install App'}</span>
      </Button>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Install on iPhone/iPad</DialogTitle>
            <DialogDescription className="text-slate-300">
              iOS does not show the same install popup. Use these steps once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex items-start gap-2">
              <span className="mt-0.5"><Share2 className="w-4 h-4" /></span>
              <p>Open this site in Safari, then tap the Share icon.</p>
            </div>
            <p>Scroll and tap <strong>Add to Home Screen</strong>.</p>
            <p>Tap <strong>Add</strong>. InvestMitra will appear like an app.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;
