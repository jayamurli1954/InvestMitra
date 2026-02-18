const AboutUs = () => {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">About InvestMitra</h1>
        <p className="text-slate-400">Your investment tracking and analytics companion.</p>
      </div>

      <div className="glass-card p-6 space-y-4 text-slate-200">
        <p>
          InvestMitra helps individual investors track portfolios, monitor performance, and understand
          risk through data-driven insights.
        </p>
        <p>
          The platform includes portfolio management, watchlist tracking, tax reporting, analytics,
          and strategy tools for Indian market use cases.
        </p>
        <p className="text-slate-400 text-sm">
          Note: InvestMitra is an educational and analytics platform. It does not provide personalized
          investment advisory services.
        </p>
      </div>
    </div>
  );
};

export default AboutUs;
