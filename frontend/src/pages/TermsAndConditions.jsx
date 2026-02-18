const TermsAndConditions = () => {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-slate-400">Terms governing your use of InvestMitra.</p>
      </div>

      <div className="glass-card p-6 space-y-4 text-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Acceptance of Terms</h2>
          <p>By using InvestMitra, you agree to these terms and all applicable laws.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Use of Service</h2>
          <p>
            You may use the platform for personal portfolio tracking and analysis. You are responsible
            for the accuracy of data you upload.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">No Financial Advice</h2>
          <p>
            Content, analytics, and insights are informational only and should not be treated as
            investment advice.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Limitation of Liability</h2>
          <p>
            InvestMitra is provided on an as-is basis. We are not liable for investment losses or
            decisions made based on platform outputs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
