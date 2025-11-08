import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DisclaimerText from '@/components/DisclaimerText';

const Disclaimer = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Disclaimer Content */}
        <div className="glass-card p-8">
          <DisclaimerText />
        </div>

        {/* Bottom Action */}
        <div className="text-center mt-6">
          <Button
            onClick={() => navigate('/')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
