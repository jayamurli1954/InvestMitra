const PrivacyPolicy = () => {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400">How InvestMitra handles your data.</p>
      </div>

      <div className="glass-card p-6 space-y-4 text-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Data We Store</h2>
          <p>
            We store account details, portfolio records, watchlists, and app settings required to run
            core features.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">How Data Is Used</h2>
          <p>
            Your data is used to provide portfolio calculations, performance insights, and app
            functionality. We do not sell personal data.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Cookies and Sessions</h2>
          <p>
            We use secure session cookies for authentication and to keep you logged in.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
          <p className="text-slate-400">
            For privacy-related requests, contact the app administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
