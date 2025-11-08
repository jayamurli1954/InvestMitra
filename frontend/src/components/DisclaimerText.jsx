import React from 'react';
import { AlertTriangle, Shield, TrendingDown, FileText, Scale, Info } from 'lucide-react';

/**
 * Investment Disclaimer - Full Legal Text
 *
 * This component contains the complete disclaimer text for the investment platform.
 * Used in registration, login, and dedicated disclaimer page.
 *
 * ⚠️ IMPORTANT: Have this reviewed by a legal professional in your jurisdiction
 * before deploying to production.
 */

export const DISCLAIMER_VERSION = "1.0";
export const DISCLAIMER_LAST_UPDATED = "2025-01-08";

export const DisclaimerText = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="text-xs text-slate-400 text-center">
        ⚠️ <strong>Disclaimer:</strong> This platform is for educational purposes only.
        Not financial advice. All investments carry risk including loss of principal.
        Consult a qualified financial advisor before making investment decisions.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="text-center border-b border-yellow-500/30 pb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          <h2 className="text-2xl font-bold text-yellow-400">INVESTMENT DISCLAIMER</h2>
        </div>
        <p className="text-sm text-yellow-400/80 font-semibold">
          ⚠️ IMPORTANT - PLEASE READ CAREFULLY BEFORE USING THIS PLATFORM
        </p>
      </div>

      {/* Section 1: Not Financial Advice */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <FileText className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">1. NOT FINANCIAL ADVICE</h3>
            <p className="text-sm leading-relaxed">
              This platform provides <strong>educational tools and information only</strong>. Nothing on
              this platform constitutes financial, investment, legal, tax, or any other form of professional
              advice. You should not rely on this information as a substitute for professional advice.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              <strong>Always consult with a qualified financial advisor</strong> before making any investment
              decisions. Your individual financial situation, risk tolerance, and investment goals are unique
              and require personalized professional guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Investment Risks */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <TrendingDown className="w-5 h-5 text-rose-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">2. INVESTMENT RISKS & NO GUARANTEES</h3>
            <p className="text-sm leading-relaxed">
              <strong>All investments carry risk</strong>, including the potential for complete loss of
              principal. Past performance is not indicative of future results. No investment strategy or
              risk management technique can guarantee returns or eliminate risk.
            </p>
            <div className="mt-2 bg-rose-500/10 border border-rose-500/30 rounded p-3">
              <p className="text-sm text-rose-300">
                <strong>⚠️ You may lose money:</strong> Stock prices can go down as well as up. Market
                volatility, economic conditions, company performance, and many other factors can negatively
                impact your investments. Only invest money you can afford to lose.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: AI-Generated Content */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">3. AI-GENERATED INSIGHTS & RECOMMENDATIONS</h3>
            <p className="text-sm leading-relaxed">
              AI-powered recommendations, insights, and analysis provided on this platform are based on
              algorithms, historical data, and machine learning models. These are <strong>NOT personalized
              investment advice</strong> and should not be considered as such.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>AI predictions can be wrong and are subject to model limitations</li>
              <li>Historical patterns may not repeat in the future</li>
              <li>AI cannot account for unforeseen events or market shocks</li>
              <li>Always perform your own research and due diligence</li>
              <li>AI recommendations do not consider your personal financial situation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 4: Data Accuracy */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">4. DATA ACCURACY & TIMELINESS</h3>
            <p className="text-sm leading-relaxed">
              While we strive to provide accurate and up-to-date information, stock prices, mutual fund NAVs,
              market indices, and other financial data displayed on this platform:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>May be delayed by 15-20 minutes or more</li>
              <li>May contain errors, omissions, or inaccuracies</li>
              <li>Should be independently verified before making decisions</li>
              <li>Are sourced from third-party providers we do not control</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              <strong>Always verify information</strong> with official sources, stock exchanges, or your
              broker before making investment decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: User Responsibility */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Scale className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">5. USER RESPONSIBILITY & LIABILITY</h3>
            <p className="text-sm leading-relaxed">
              <strong>You are solely responsible</strong> for your investment decisions and their outcomes.
              By using this platform, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>You make all investment decisions independently</li>
              <li>You have conducted your own research and due diligence</li>
              <li>We are not liable for any losses, damages, or adverse outcomes</li>
              <li>You will not hold us responsible for investment performance</li>
              <li>You understand the risks involved in investing</li>
            </ul>
            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
              <p className="text-sm text-yellow-300">
                <strong>⚠️ Limitation of Liability:</strong> To the maximum extent permitted by law, we
                disclaim all liability for any direct, indirect, incidental, consequential, or punitive
                damages arising from your use of this platform or reliance on any information provided.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Regulatory Status */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <FileText className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">6. REGULATORY COMPLIANCE & STATUS</h3>
            <p className="text-sm leading-relaxed">
              This platform is provided <strong>for informational and educational purposes only</strong>.
              We are:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li><strong>NOT</strong> a registered investment advisor (RIA)</li>
              <li><strong>NOT</strong> a broker-dealer or stock exchange</li>
              <li><strong>NOT</strong> a financial institution or bank</li>
              <li><strong>NOT</strong> registered with SEBI, SEC, or any regulatory authority</li>
              <li><strong>NOT</strong> authorized to execute trades on your behalf</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2 text-blue-300">
              <strong>India-Specific:</strong> This platform is not regulated by the Securities and Exchange
              Board of India (SEBI). For regulated investment services, consult SEBI-registered advisors
              or brokers.
            </p>
          </div>
        </div>
      </div>

      {/* Section 7: Third-Party Links */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">7. THIRD-PARTY CONTENT & LINKS</h3>
            <p className="text-sm leading-relaxed">
              This platform may contain links to third-party websites or integrate third-party data sources.
              We are not responsible for the accuracy, reliability, or content of such third-party sources.
              Your use of third-party services is at your own risk and subject to their terms and conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Section 8: Market Volatility */}
      <div className="space-y-2 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-rose-400" />
          8. MARKET VOLATILITY WARNING
        </h3>
        <p className="text-sm leading-relaxed text-rose-300">
          Financial markets can be <strong>extremely volatile</strong>. Prices can change rapidly in very
          short periods. News events, economic data, geopolitical developments, and market sentiment can
          cause significant price swings. Never invest money you cannot afford to lose, and always maintain
          a diversified portfolio appropriate for your risk tolerance.
        </p>
      </div>

      {/* Section 9: No Professional Relationship */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white mb-2">9. NO PROFESSIONAL RELATIONSHIP</h3>
        <p className="text-sm leading-relaxed">
          Use of this platform does not create any professional relationship (advisor-client,
          broker-client, or otherwise) between you and the platform operators. We do not have a
          fiduciary duty to you.
        </p>
      </div>

      {/* Section 10: Updates to Disclaimer */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white mb-2">10. UPDATES TO THIS DISCLAIMER</h3>
        <p className="text-sm leading-relaxed">
          We reserve the right to update this disclaimer at any time. Continued use of the platform
          after changes constitutes acceptance of the updated terms. Check this page regularly for updates.
        </p>
      </div>

      {/* Acceptance Statement */}
      <div className="border-t border-yellow-500/30 pt-4 mt-6">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-emerald-400 mb-2">ACCEPTANCE & ACKNOWLEDGMENT</h3>
          <p className="text-sm leading-relaxed">
            By using this platform, you acknowledge that you have read, understood, and agree to be
            bound by this Investment Disclaimer. You confirm that you understand:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>This platform provides educational information only, not financial advice</li>
            <li>All investment decisions are your sole responsibility</li>
            <li>Investing carries significant risk, including potential loss of principal</li>
            <li>You should consult with qualified professionals before investing</li>
            <li>Past performance does not guarantee future results</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700">
        <p>Investment Disclaimer Version {DISCLAIMER_VERSION}</p>
        <p>Last Updated: {DISCLAIMER_LAST_UPDATED}</p>
        <p className="mt-2">
          This disclaimer is provided in English. In case of any discrepancy between translated
          versions, the English version shall prevail.
        </p>
      </div>
    </div>
  );
};

// Short version for footer
export const DisclaimerFooter = () => {
  return (
    <div className="text-xs text-slate-400 text-center py-1">
      ⚠️ <strong>Disclaimer:</strong> For educational purposes only. Not financial advice.
      Investments carry risk.{' '}
      <a href="/disclaimer" className="text-emerald-400 hover:text-emerald-300 underline">
        Read Full Disclaimer
      </a>
    </div>
  );
};

export default DisclaimerText;
